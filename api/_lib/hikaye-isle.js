// SESLİ HİKÂYE İŞLEME — whisper → düzenleme (noktalama/paragraf) → çıkarım → anı önerisi.
// Hem anlık (POST /api/hikaye) hem gece kuyruğu (cron) bu fonksiyonu kullanır.
import { db, agacOku } from './db.js';
import { SES, STT, LLM, HIKAYE_MAX_CHARS, GUNLUK_SISTEM } from './ayar.js';
import { kotaDurumu, sttIzin, kullanimKaydet } from './kota.js';
import { yaziyaCevir, sohbet, SaglayiciKotaHatasi } from './llm.js';
import { r2Url } from './r2.js';
import { grafKur, kisiAra, adiGoster, normalize } from './agac.js';
import { oneriEkle, yamaUygula, yamaHatasiMi } from './oneri.js';

const DUZENLE = `Sana bir aile hikâyesinin konuşma dökümü (ses kaydından otomatik yazıya çevrilmiş) verilecek.
Görevin: YALNIZCA noktalama, büyük harf ve paragraf eklemek. Hiçbir sözcüğü değiştirme, ekleme, silme, özetleme.
Ayrıca metinde geçen kişileri, yerleri ve tarihleri çıkar. Bir kişinin başka biriyle akrabalığı AÇIKÇA söyleniyorsa yaz.
Yalnızca şu JSON'u döndür:
{"metin":"...","baslik":"en fazla 6 sözcük","kisiler":[{"ad":"...","iliski":"cocugu|esi|kardesi|babasi|annesi|","kime":"...","cinsiyet":"E|K|"}],"yerler":["..."],"tarihler":["..."]}
"iliski" ve "kime": <ad>, <kime>'nin <iliski>si demektir; emin değilsen boş bırak.`;

export const BEKLE_MESAJI = 'Kaydın saklandı, yazıya çevirme yarın yapılacak.';

// Uzun metni cümle sınırlarından parçala (MESAJ_MAX_TOKEN altında kalsın)
export function parcala(metin, boyut = SES.duzenleParcaKarakter) {
  const parca = []; let kalan = metin.trim();
  while (kalan.length > boyut) {
    let kes = Math.max(kalan.lastIndexOf('. ', boyut), kalan.lastIndexOf('? ', boyut), kalan.lastIndexOf('! ', boyut));
    if (kes < boyut / 2) kes = kalan.lastIndexOf(' ', boyut);
    if (kes <= 0) kes = boyut;
    parca.push(kalan.slice(0, kes + 1).trim()); kalan = kalan.slice(kes + 1).trim();
  }
  if (kalan) parca.push(kalan);
  return parca;
}

// "İçerik değiştirme yok" bekçisi: düzenlenmiş metin ham sözcüklerin çoğunu korumalı
export function icerikKorundu(ham, duzen) {
  const h = normalize(ham).split(' ').filter(Boolean);
  const d = new Set(normalize(duzen).split(' ').filter(Boolean));
  if (!h.length) return true;
  const korunan = h.filter((w) => d.has(w)).length;
  const dSayi = normalize(duzen).split(' ').filter(Boolean).length;
  return korunan / h.length >= SES.duzenleMinOran && dSayi <= h.length / SES.duzenleMinOran;
}

async function duzenle(ham, toplam) {
  const sonuc = { metin: [], baslik: '', kisiler: [], yerler: new Set(), tarihler: new Set() };
  for (const p of parcala(ham)) {
    let j = null;
    try {
      const { mesaj, usage } = await sohbet({
        messages: [{ role: 'system', content: DUZENLE }, { role: 'user', content: p }],
        maxToken: SES.duzenleCiktiMaxToken, json: true,
      });
      toplam.girdi += usage.girdi; toplam.cikti += usage.cikti; toplam.istek++;
      j = JSON.parse(mesaj.content || '{}');
    } catch (e) {
      if (!(e instanceof SaglayiciKotaHatasi) && !(e instanceof SyntaxError)) throw e;
    }
    const metin = j && typeof j.metin === 'string' && icerikKorundu(p, j.metin) ? j.metin : p;
    sonuc.metin.push(metin);
    if (j) {
      if (!sonuc.baslik && j.baslik) sonuc.baslik = String(j.baslik).slice(0, 80);
      (j.kisiler || []).forEach((k) => k && k.ad && sonuc.kisiler.push(k));
      (j.yerler || []).forEach((y) => y && sonuc.yerler.add(String(y)));
      (j.tarihler || []).forEach((t) => t && sonuc.tarihler.add(String(t)));
    }
  }
  return { ...sonuc, metin: sonuc.metin.join('\n\n'), yerler: [...sonuc.yerler], tarihler: [...sonuc.tarihler] };
}

// Hikâyede açıkça akrabalığı söylenen, ağaçta olmayan kişiler → kisi_ekle (tek anlamlı eşleşmede)
function kisiOnerileri(veri, kisiler, temel) {
  const g = grafKur(veri);
  const ops = [];
  for (const k of kisiler) {
    if (!k.iliski || !k.kime) continue;
    const hedef = kisiAra(g, k.kime);
    if (hedef.length !== 1) continue;                       // belirsiz → önermeyiz (yönetici notu yerine sessiz)
    if (kisiAra(g, k.ad).some((x) => normalize(x.ad) === normalize(k.ad))) continue; // zaten var
    const op = { tur: 'kisi_ekle', ad: adiGoster(k.ad), cinsiyet: k.cinsiyet === 'K' ? 'K' : 'E', iliski: k.iliski, hedef_id: hedef[0].id };
    try { yamaUygula(veri, [...temel, ...ops, op]); ops.push(op); } catch (e) { if (!yamaHatasiMi(e)) throw e; }
  }
  return ops;
}

// Kuyruktaki tek işi işle. Dönüş: {durum:'islendi'|'bekliyor'|'hata', ...}
export async function hikayeIsle(id) {
  const sql = db();
  // Kilit: aynı iş aynı anda iki kez işlenmesin
  const al = await sql`
    update hikaye_kuyruk set islenme = now()
    where id = ${id} and durum = 'bekliyor'
      and (islenme is null or islenme < now() - make_interval(mins => ${SES.kilitDk}))
    returning *`;
  const is = al[0];
  if (!is) return { durum: 'atlandi' };
  const birak = () => sql`update hikaye_kuyruk set islenme = null where id = ${id}`;

  const saniye = Number(is.saniye);
  const kota = await kotaDurumu(is.kisi_id);
  const tokenTahmin = Math.ceil((saniye / 60) * SES.tokenDk * 2);
  if (!sttIzin(kota, saniye).ok || kota.sistem.token + tokenTahmin > GUNLUK_SISTEM.token) {
    await birak();
    return { durum: 'bekliyor', mesaj: BEKLE_MESAJI };
  }

  // 1) ses → yazı (her parça ayrı dosya; sağlayıcı imzalı URL'den indirir)
  let ham = '', sttSn = 0;
  try {
    for (const p of is.parcalar) {
      const r = await yaziyaCevir({ url: r2Url('GET', p.anahtar, SES.imzaSureSn) });
      ham += (ham ? ' ' : '') + r.metin; sttSn += r.saniye;
    }
  } catch (e) {
    if (sttSn) await kullanimKaydet({ kisiId: is.kisi_id, tur: 'stt', model: STT.model, saniye: sttSn, istek: is.parcalar.length, islem: 'hikaye' });
    await birak();
    if (e instanceof SaglayiciKotaHatasi) return { durum: 'bekliyor', mesaj: BEKLE_MESAJI };
    await sql`update hikaye_kuyruk set durum='hata', hata=${String(e.message || e).slice(0, 300)} where id=${id}`;
    return { durum: 'hata', hata: String(e.message || e) };
  }
  await kullanimKaydet({ kisiId: is.kisi_id, tur: 'stt', model: STT.model, saniye: sttSn, istek: is.parcalar.length, islem: 'hikaye' });

  // 2) düzenleme + çıkarım
  const toplam = { girdi: 0, cikti: 0, istek: 0 };
  const d = await duzenle(ham, toplam);
  if (toplam.istek) await kullanimKaydet({ kisiId: is.kisi_id, tur: 'llm', model: LLM.model, girdi: toplam.girdi, cikti: toplam.cikti, istek: toplam.istek, islem: 'hikaye' });

  // 3) anı + öneri
  const veri = await agacOku();
  const g = grafKur(veri);
  const anlatan = adiGoster(g.byId[is.kisi_id]?.name) || '';
  const ani = {
    date: d.tarihler[0] || new Date(is.olusturma).toLocaleDateString('tr-TR'),
    baslik: d.baslik || '',
    text: d.metin.slice(0, HIKAYE_MAX_CHARS),
    transkript: ham.slice(0, HIKAYE_MAX_CHARS),
    kaynak: 'ses',
    ses_anahtar: is.ses_anahtar,
    ses_parcalar: is.parcalar.map((p) => p.anahtar),
    sure_sn: Math.round(saniye),
    anlatan, anlatan_id: is.kisi_id,
    yerler: d.yerler.slice(0, 10), kisiler: d.kisiler.map((k) => adiGoster(k.ad)).slice(0, 20),
  };
  const temel = [{ tur: 'ani_ekle', kisi_id: is.hedef_kisi_id, ani }];
  let oneri = null;
  try {
    oneri = await oneriEkle({ kisiId: is.kisi_id, gonderenAd: `${anlatan} (sesli hikâye)`, kaynak: 'hikaye',
      islemler: [...temel, ...kisiOnerileri(veri, d.kisiler, temel)] });
  } catch (e) {
    if (!yamaHatasiMi(e)) throw e;
    await sql`update hikaye_kuyruk set durum='hata', hata=${e.message}, transkript=${ham} where id=${id}`;
    return { durum: 'hata', hata: e.message };
  }
  await sql`update hikaye_kuyruk set durum='islendi', baslik=${ani.baslik}, transkript=${ham}, oneri_id=${oneri.id}, islenme=now() where id=${id}`;
  return { durum: 'islendi', oneri, baslik: ani.baslik, metin: ani.text };
}
