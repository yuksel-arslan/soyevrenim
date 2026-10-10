// Vercel Serverless Function — ASİSTAN (soru + konuşarak ekleme)
// POST /api/asistan  {jeton, kisi_id, mesaj, gecmis:[{rol:'kullanici'|'asistan', metin}]}
//
// Ücretsiz katman: Groq (ayar.js → LLM). Sunucu tarafı araç döngüsü (en fazla ASISTAN.maxTur).
// Çağrı öncesi sistem + kişi günlük kotası kontrol edilir; dolu ya da sağlayıcı 429 verirse
// {yedek:true} döner → istemci mevcut Rehber'i (calistirKomut) çalıştırır.
// Model ağaca YAZMAZ: ekleme/düzeltme oneri_olustur ile onay kuyruğuna düşer.
//
// Env: GROQ_API_KEY, DATABASE_URL, OTURUM_GIZLI   · Ayrıntı: docs/asistan.md
import { cors, govde } from './_lib/db.js';
import { LLM, ASISTAN, MESAJ_MAX_TOKEN, tahminiToken } from './_lib/ayar.js';
import { kimlikCoz, KimlikHatasi } from './_lib/kimlik.js';
import { kotaDurumu, llmIzin, kullanimKaydet, KOTA_MESAJI } from './_lib/kota.js';
import { sohbet, SaglayiciKotaHatasi } from './_lib/groq.js';
import { grafKur, kisiAra, kisiKisa, yakinlar, yolBul, adiGoster, normalize, nesilHaritasi, enBuyukYasayan, akrabalikAnlatisi, ilgiEki } from './_lib/agac.js';
import { soyTarihiOzet } from './_lib/soy-tarihi.js';
import { uzmanBilgi, lazcaMi } from './_lib/uzmanlik.js';
import { oneriEkle, yamaHatasiMi } from './_lib/oneri.js';

const SISTEM = `Sen "Kök" soy ağacının asistanısın (Abdurrahman Oğulları, 1615'ten beri). Türkçe, kısa ve sıcak yaz.
Üç uzmanlığın var: (1) bu ailenin soyu ve kökeni, (2) Doğu Karadeniz — Arhavi ve Fındıklı (Viçe) — bölge tarihi, (3) soyevrenim.com sitesinin kullanımı. Ayrıca temel Lazca biliyorsun.
Kurallar:
1. Bilgiyi YALNIZCA araç sonuçlarından ver; uydurma. Bilmiyorsan söyle.
2. Her isim için önce kisi_ara kullan. Birden çok eşleşme varsa ve bağlam ayırt etmiyorsa hangisi olduğunu sor (baba adı ve nesille listele); asla tahmin etme.
3. Yanıtın sonunda kaynak göster: anıdan gelen bilgi için "Kaynak: <kişi>'in anısı, <tarih>"; ağaç kaydından gelen için "Kaynak: soy ağacı kaydı".
4. Ağaca doğrudan yazamazsın. Kişi ekleme, ilişki kurma, bilgi düzeltme isteğinde oneri_olustur kullan ve değişikliğin yönetici onayına gittiğini söyle.
5. Yeni kişi eklerken: hedef kişiyi kisi_ara ile kesinleştir; cinsiyeti ifadeden çıkar ("kız kardeşi", "kızı", "annesi" → K); aynı adda bir kişi zaten o ilişkideyse eklemeden önce sor.
6. Akrabalık sorusunda yol_bul kullan. Yanıtı aracın "anlati" alanı üzerine kur: bir aile büyüğünün anlatacağı gibi sıcak ve akıcı anlat (kim kimin nesi, ortak ata kim, dallar nerede ayrılmış); "A → B → C" gibi liste ya da "12 adım" gibi mekanik ifade kullanma.
7. Soyun kökeni, göçü, tarihi, yerler (Arhavi, Potocur, Derbent), Molla Memiş, kollar ya da ağacın genel sayıları sorulursa soy_tarihi kullan. Fahri Arslan'ın notunu (aile kaydı) kaynaklı bilgiden ayır; "Teyit gerekli" ya da "Yorum" etiketli bilgiyi kesinmiş gibi söyleme.
8. Bölge tarihi (Lazlar, Osmanlı dönemi, Lazistan, köy adları), site kullanımı (kişi ekleme, öneri, hikâye kaydı, temalar, kota) ya da Lazca sorularında uzman_bilgi kullan (beceri: bolge | site | lazca). Bilgi yoksa uydurma, bilmediğini söyle.
9. Lazca: kullanıcı Lazca yazarsa ya da isterse kısa Lazca cümleler kur ve her zaman Türkçe karşılığını ver. Emin olmadığın Lazca sözcüğü uydurma; uzman_bilgi(lazca) ifadelerini kullan, gerisini Türkçe söyle.
10. Kişisel iletişim bilgisi (telefon, adres, e-posta) verme.
11. Sıcak ve saygılı ol; aile büyüklerinden söz ederken "rahmetli" gibi geleneksel ifadeleri yerinde kullanabilirsin.`;

const ILISKI = ['cocugu', 'esi', 'kardesi', 'babasi', 'annesi'];
const ARACLAR = [
  { type: 'function', function: { name: 'kisi_ara', description: 'Ağaçta isimle kişi arar. Kimlik, baba/anne adı, nesil, yaşam durumu döner.',
    parameters: { type: 'object', properties: { sorgu: { type: 'string', description: 'ad veya ad soyad' } }, required: ['sorgu'] } } },
  { type: 'function', function: { name: 'kisi_getir', description: 'Bir kişinin profili: ebeveyn, eş, çocuk, kardeş, meslek ve anıları.',
    parameters: { type: 'object', properties: { kisi_id: { type: 'string' } }, required: ['kisi_id'] } } },
  { type: 'function', function: { name: 'yol_bul', description: 'İki kişi arasındaki akrabalık yolu, ortak ata ve akrabalık derecesi.',
    parameters: { type: 'object', properties: { a_id: { type: 'string' }, b_id: { type: 'string' } }, required: ['a_id', 'b_id'] } } },
  { type: 'function', function: { name: 'ani_ara', description: 'Anılarda sözcük arar (isteğe bağlı tek kişiyle sınırlı).',
    parameters: { type: 'object', properties: { sorgu: { type: 'string' }, kisi_id: { type: 'string' } }, required: ['sorgu'] } } },
  { type: 'function', function: { name: 'uzman_bilgi', description:
    'Rehberin uzmanlık modülleri: bolge (Arhavi–Fındıklı/Doğu Karadeniz tarihi), site (soyevrenim.com kullanımı), lazca (selamlaşma, teşekkür, akrabalık adları). Kaynaklı ve güven etiketli bilgi döner.',
    parameters: { type: 'object', properties: { sorgu: { type: 'string' }, beceri: { type: 'string', enum: ['bolge', 'site', 'lazca'] } }, required: ['sorgu'] } } },
  { type: 'function', function: { name: 'soy_tarihi', description:
    'Soyun kökeni ve tarihi (Fahri Arslan\'ın 1956 notu, zaman çizelgesi, yerler, kaynaklar ve güven etiketleri) ile ağacın genel sayıları (kişi, nesil, yaşayan, kollar).',
    parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'oneri_olustur', description:
    'Ağaç değişikliğini yönetici onayına öneri olarak gönderir. kisi_ekle: yeni kişi = hedef_id kişisinin <iliski>si. iliski_ekle: mevcut kisi_id = hedef_id kişisinin <iliski>si. bilgi_duzelt: kisi_id kişisinin alanını değiştirir. Aynı öneride yeni eklenen kişiye ref ile ("$1") başvurulabilir.',
    parameters: { type: 'object', properties: {
      islemler: { type: 'array', items: { type: 'object', properties: {
        tur: { type: 'string', enum: ['kisi_ekle', 'iliski_ekle', 'bilgi_duzelt'] },
        ad: { type: 'string' }, cinsiyet: { type: 'string', enum: ['E', 'K'] }, yasiyor: { type: 'boolean' },
        iliski: { type: 'string', enum: ILISKI }, hedef_id: { type: 'string' }, kisi_id: { type: 'string' },
        alan: { type: 'string', enum: ['ad', 'cinsiyet', 'yasiyor', 'meslek', 'egitim', 'medeni'] },
        deger: { type: 'string' }, ref: { type: 'string' } }, required: ['tur'] } },
      aciklama: { type: 'string', description: 'yöneticiye kısa not' } }, required: ['islemler'] } } },
];

const kirp = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);

function anilar(n) {
  return ((n.profile && n.profile.memories) || []).map((m, i) => ({
    sira: i, tarih: m.date || '', baslik: m.baslik || '', anlatan: m.anlatan || '',
    kaynak: m.kaynak || 'yazi', metin: String(m.text || ''),
  }));
}

// Araçları çalıştır (okuma: ağaçtan; yazma: yalnızca öneri)
function aracCalistirici(ctx) {
  const g = grafKur(ctx.veri);
  const adi = (id) => adiGoster(g.byId[id]?.name);
  return {
    kisi_ara: ({ sorgu }) => {
      const l = kisiAra(g, sorgu, ASISTAN.aramaSonucMax);
      return l.length ? { sonuc: l } : { sonuc: [], not: 'eşleşme yok' };
    },
    kisi_getir: ({ kisi_id }) => {
      const n = g.byId[kisi_id];
      if (!n) return { hata: 'kişi yok' };
      const y = yakinlar(g, kisi_id);
      const etiket = (l) => l.map((id) => ({ id, ad: adi(id) }));
      const info = (n.profile && n.profile.info) || {};
      ctx.gorsel.kisi = kisi_id;
      return {
        ...kisiKisa(g, kisi_id),
        ebeveynler: etiket(y.ebeveynler), esler: etiket(y.esler), cocuklar: etiket(y.cocuklar), kardesler: etiket(y.kardesler),
        meslek: info.job || undefined, egitim: info.education || undefined,
        anilar: anilar(n).slice(0, ASISTAN.kisiAniMax).map((a) => ({ ...a, metin: kirp(a.metin, ASISTAN.aniParcaKarakter) })),
      };
    },
    yol_bul: ({ a_id, b_id }) => {
      if (!g.byId[a_id] || !g.byId[b_id]) return { hata: 'kişi yok' };
      const y = yolBul(g, a_id, b_id);
      if (!y) return { sonuc: 'bu iki kişi arasında kayıtlı bağ yok' };
      ctx.gorsel.yol = [a_id, b_id];
      const an = akrabalikAnlatisi(g, a_id, b_id);
      return {
        akrabalik: y.etiket,
        // sıcak anlatım: yanıtı bunun üzerine kur (kart ve Rehber de aynı metni gösterir)
        anlati: [an.ozet, ...an.cumleler].join(' '),
        ortak_ata: y.ata ? { id: y.ata.id, ad: adi(y.ata.id), kusak: [y.ata.da, y.ata.db] } : null,
        adimlar: y.adimlar.map((s) => `${adi(s.kime)}, ${ilgiEki(adi(s.kimden))} ${s.iliski}`),
      };
    },
    ani_ara: ({ sorgu, kisi_id }) => {
      const q = normalize(sorgu).split(' ').filter(Boolean);
      const sonuc = [];
      for (const n of ctx.veri.nodes || []) {
        if (kisi_id && n.id !== kisi_id) continue;
        for (const a of anilar(n)) {
          const t = normalize(`${a.baslik} ${a.tarih} ${a.metin}`);
          if (!q.every((p) => t.includes(p))) continue;
          const i = Math.max(0, t.indexOf(q[0]) - 60);
          sonuc.push({ kisi_id: n.id, kisi: adi(n.id), tarih: a.tarih, baslik: a.baslik, anlatan: a.anlatan,
            parca: kirp(a.metin.slice(i), ASISTAN.aniParcaKarakter) });
          if (sonuc.length >= ASISTAN.aramaSonucMax) return { sonuc };
        }
      }
      return { sonuc, not: sonuc.length ? undefined : 'anı bulunamadı' };
    },
    uzman_bilgi: ({ sorgu, beceri }) => uzmanBilgi(sorgu, beceri),
    soy_tarihi: () => {
      const d = nesilHaritasi(g);
      const nodes = ctx.veri.nodes || [];
      const kok = nodes.find((n) => !(ctx.veri.edges || []).some((e) => e.to === n.id) && (g.CHILDREN.get(n.id) || new Set()).size);
      const altSayi = (id) => { let t = 0; const y = [...(g.CHILDREN.get(id) || [])]; const gor = new Set();
        while (y.length) { const c = y.pop(); if (gor.has(c)) continue; gor.add(c); t++; y.push(...(g.CHILDREN.get(c) || [])); } return t; };
      return {
        ...soyTarihiOzet(),
        agac: {
          kisi: nodes.length,
          yasayan: nodes.filter((n) => n.alive !== false).length,
          nesil: Math.max(0, ...d.values()) + 1,
          kok: kok ? adi(kok.id) : null,
          kollar: kok ? [...(g.CHILDREN.get(kok.id) || [])].map((id) => ({ ad: adi(id), soyundan: altSayi(id) })) : [],
        },
      };
    },
    oneri_olustur: async ({ islemler, aciklama }) => {
      if (!Array.isArray(islemler) || !islemler.length) return { hata: 'islemler boş' };
      try {
        const o = await oneriEkle({ kisiId: ctx.kisiId, gonderenAd: `${ctx.ad} (asistan)`, islemler, kaynak: 'asistan' });
        ctx.oneriler.push({ id: o.id, ozet: o.ozet });
        ctx.islemTurleri.push(...islemler.map((x) => x.tur));
        return { tamam: true, oneri_id: o.id, ozet: o.ozet, not: 'yönetici onayına gönderildi', aciklama };
      } catch (e) {
        if (yamaHatasiMi(e)) return { hata: e.message };
        throw e;
      }
    },
  };
}

// İstemi MESAJ_MAX_TOKEN altında tut: önce eski geçmiş, sonra en uzun araç sonucu kısalır.
function sigdir(messages, sabitIndeks) {
  const olc = () => tahminiToken(JSON.stringify(messages)) + tahminiToken(JSON.stringify(ARACLAR));
  for (let guvenlik = 0; olc() > MESAJ_MAX_TOKEN && guvenlik < 50; guvenlik++) {
    const gecmis = messages.findIndex((m, i) => i >= sabitIndeks && m.gecmis);
    if (gecmis >= 0) { messages.splice(gecmis, 1); continue; }
    const araclar = messages.filter((m) => m.role === 'tool').sort((a, b) => b.content.length - a.content.length);
    if (!araclar.length || araclar[0].content.length < 200) break;
    araclar[0].content = araclar[0].content.slice(0, Math.floor(araclar[0].content.length / 2)) + '…';
  }
  return messages.map(({ gecmis, ...m }) => m);
}

function islemSinifi(turler) {
  if (turler.some((t) => t === 'kisi_ekle' || t === 'iliski_ekle')) return 'ekleme';
  if (turler.includes('bilgi_duzelt')) return 'duzenle';
  return 'soru';
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  const body = govde(req);
  const mesaj = String(body.mesaj || '').trim().slice(0, ASISTAN.mesajMaxKarakter);
  if (!mesaj) return res.status(400).json({ ok: false, hata: 'Boş mesaj' });

  let kim;
  try { kim = await kimlikCoz(body); }
  catch (e) { if (e instanceof KimlikHatasi) return res.status(200).json({ ok: false, yedek: true, mesaj: e.message }); throw e; }

  const kota = await kotaDurumu(kim.kisiId);
  const izin = llmIzin(kota);
  if (!izin.ok) return res.status(200).json({ ok: false, yedek: true, sebep: izin.sebep, mesaj: KOTA_MESAJI[izin.sebep], kota });

  const ctx = { ...kim, gorsel: {}, oneriler: [], islemTurleri: [] };
  const arac = aracCalistirici(ctx);
  const gecmis = (Array.isArray(body.gecmis) ? body.gecmis : []).slice(-ASISTAN.gecmisTur)
    .filter((m) => m && typeof m.metin === 'string')
    .map((m) => ({ role: m.rol === 'asistan' ? 'assistant' : 'user', content: m.metin.slice(0, ASISTAN.mesajMaxKarakter), gecmis: true }));
  const messages = [
    { role: 'system', content: SISTEM },
    { role: 'system', content: rehberKimligi({ ...kim, lazca: lazcaMi(mesaj) }) },
    ...gecmis,
    { role: 'user', content: mesaj },
  ];

  const toplam = { girdi: 0, cikti: 0, istek: 0 };
  let yanit = '';
  try {
    for (let tur = 1; tur <= ASISTAN.maxTur; tur++) {
      const sonTur = tur === ASISTAN.maxTur;
      const { mesaj: m, usage } = await sohbet({ messages: sigdir(messages, 2), tools: sonTur ? undefined : ARACLAR });
      toplam.girdi += usage.girdi; toplam.cikti += usage.cikti; toplam.istek++;
      const cagrilar = m.tool_calls || [];
      if (!cagrilar.length) { yanit = String(m.content || '').trim(); break; }
      messages.push({ role: 'assistant', content: m.content || null, tool_calls: cagrilar });
      for (const c of cagrilar) {
        let sonuc;
        try {
          const fn = arac[c.function?.name];
          const args = JSON.parse(c.function?.arguments || '{}');
          sonuc = fn ? await fn(args) : { hata: 'bilinmeyen araç' };
        } catch (e) { sonuc = { hata: 'araç hatası: ' + String(e.message || e).slice(0, 200) }; }
        const sinir = c.function?.name === 'soy_tarihi' ? ASISTAN.soyTarihiMaxKarakter : ASISTAN.aracSonucMaxKarakter;
        messages.push({ role: 'tool', tool_call_id: c.id, content: kirp(JSON.stringify(sonuc), sinir) });
      }
    }
  } catch (e) {
    if (toplam.istek) await kayit(ctx, toplam);
    if (e instanceof SaglayiciKotaHatasi) return res.status(200).json({ ok: false, yedek: true, sebep: 'saglayici', mesaj: KOTA_MESAJI.saglayici });
    return res.status(200).json({ ok: false, yedek: true, sebep: 'hata', mesaj: KOTA_MESAJI.saglayici, hata: String(e.message || e).slice(0, 200) });
  }
  await kayit(ctx, toplam);
  if (!yanit) yanit = ctx.oneriler.length ? `Önerin yönetici onayına gönderildi: ${ctx.oneriler.map((o) => o.ozet).join(' · ')}` : 'Bunu yanıtlayamadım, biraz daha açar mısın?';
  const yeniKota = await kotaDurumu(kim.kisiId);
  return res.status(200).json({ ok: true, yanit, gorsel: ctx.gorsel, oneriler: ctx.oneriler, kota: yeniKota });
}

// Rehber, ailenin yaşayan en büyüğünün adını taşır — ama o kişi DEĞİLDİR.
// Gerçek bir aile büyüğünün ağzından konuşmak, onun söylemediği sözleri ona
// söyletmek olur; bu yüzden adı yalnızca bir saygı ifadesi olarak kullanılır.
function rehberKimligi(kim) {
  const eb = enBuyukYasayan(kim.veri);
  const ad = eb ? `${eb.tamAd} Rehberi` : 'Kök Rehberi';
  const laz = kim.lazca ? ' Kullanıcı Lazca yazdı: Lazca selamla, kısa yanıtla ve Türkçe karşılığını mutlaka ekle.' : '';
  return `Adın "${ad}". Adını ailenin yaşayan en büyüğünden${eb ? ` (${eb.ad})` : ''} alıyorsun; ama sen o kişi değilsin: onun ağzından konuşma, onun adına anı ya da söz uydurma. `
    + `Konuşan kişi: ${kim.ad} (kisi_id: ${kim.kisiId}). "ben", "babam" gibi ifadeler bu kişiye göredir.${laz}`;
}

async function kayit(ctx, t) {
  await kullanimKaydet({ kisiId: ctx.kisiId, tur: 'llm', model: LLM.model, girdi: t.girdi, cikti: t.cikti,
    istek: t.istek, islem: islemSinifi(ctx.islemTurleri) });
}
