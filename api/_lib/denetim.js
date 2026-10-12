// ÖZ-DENETİM — her kayıtta sistem kendini denetler.
//
// Onay kuyruğu olmadığı için (aile şifresiyle giren doğrudan kaydeder) çelişkiler kaydın ANINDA yakalanır:
//   1) damgala: her kişiye kimin eklediği (ekleyen) ve en son kimin değiştirdiği (duzenleyen) işlenir.
//   2) celiskiBul: bu kaydın YENİ getirdiği tutarsızlıklar (veriDenetimi farkı — ör. başkasının eklediği
//      kişiyi biri yeniden ekledi → çift kayıt) ve BAŞKASININ girdiği bilginin değiştirilmesi
//      (ör. Ali doğum yılını 1965 girmişti, Veli 1967 yaptı).
//   3) uyarilariYaz: kaydedene yanıtta uyarı döner; ilgili ÖTEKİ kişilere (eklemiş/değiştirmiş olanlar)
//      `uyari` tablosuna hatırlatma yazılır ve bildirim aboneleri varsa telefonlarına push gider.
// Hiçbir şey kendiliğinden düzeltilmez; karar insanlarda. Ayrıntı: docs/agac.md → "Öz-denetim".
import { veriDenetimi, adiGoster } from './agac.js';
import { DENETIM_UYARI } from './ayar.js';

const kopya = (v) => JSON.parse(JSON.stringify(v));
const izAlanlari = (n) => JSON.stringify([n.name, n.sex, n.alive, n.spouse || [], n.mother || null, n.kin || null, n.profile || null]);
const kimNesnesi = (kim) => ({ kisi: kim.kisi || null, ad: String(kim.ad || '').slice(0, 80), zaman: kim.zaman || new Date().toISOString() });

// Yeni kişiye ekleyen, değişen kişiye duzenleyen damgası. İstemci damgaları göndermese bile eskiden korunur.
export function damgala(eski, yeni0, kim) {
  const yeni = kopya(yeni0), k = kimNesnesi(kim);
  const once = new Map(((eski && eski.nodes) || []).map((n) => [n.id, n]));
  for (const n of yeni.nodes || []) {
    const e = once.get(n.id);
    if (!e) { n.ekleyen = n.ekleyen || k; continue; }
    if (e.ekleyen && !n.ekleyen) n.ekleyen = e.ekleyen;
    if (izAlanlari(e) !== izAlanlari(n)) n.duzenleyen = k;
    else if (e.duzenleyen && !n.duzenleyen) n.duzenleyen = e.duzenleyen;
  }
  return yeni;
}

const sonEl = (n) => (n && (n.duzenleyen || n.ekleyen)) || null;
const anahtar = (b) => `${b.tur}|${[...b.ids].sort().join(',')}`;
const ALAN_AD = { dogum: 'doğum', olum: 'ölüm', job: 'meslek', work: 'iş', yer: 'yer', notes: 'not' };

// Bu kaydın getirdiği çelişkiler. Dönüş: [{ mesaj, ids, ilgililer:[kisi], tur }]
export function celiskiBul(eski, yeni, kim) {
  if (!eski) return [];
  const by = Object.fromEntries((yeni.nodes || []).map((n) => [n.id, n]));
  const eskiBy = Object.fromEntries((eski.nodes || []).map((n) => [n.id, n]));
  const out = [];
  // a) YENİ denetim bulguları (yalnız önemli/orta)
  const once = new Set(veriDenetimi(eski).map(anahtar));
  for (const b of veriDenetimi(yeni)) {
    if (once.has(anahtar(b)) || !DENETIM_UYARI.onemler.includes(b.onem)) continue;
    const ilgililer = [...new Set(b.ids.map((i) => sonEl(eskiBy[i] || by[i])).filter((x) => x && x.kisi && x.kisi !== kim.kisi).map((x) => x.kisi))];
    out.push({ tur: b.tur, mesaj: b.mesaj, ids: b.ids, ilgililer });
  }
  // b) Başkasının girdiği bilgi değiştirildi (ad, cinsiyet, yaşam durumu, profil bilgileri)
  for (const n of yeni.nodes || []) {
    const e = eskiBy[n.id]; if (!e) continue;
    const onceki = sonEl(e);
    if (!onceki || !onceki.kisi || onceki.kisi === kim.kisi) continue;
    const farklar = [];
    if (adiGoster(e.name) !== adiGoster(n.name)) farklar.push(`adı “${adiGoster(e.name)}” → “${adiGoster(n.name)}”`);
    if ((e.sex || '') !== (n.sex || '')) farklar.push(`cinsiyeti ${e.sex === 'K' ? 'kadın' : 'erkek'} → ${n.sex === 'K' ? 'kadın' : 'erkek'}`);
    if ((e.alive !== false) !== (n.alive !== false)) farklar.push(n.alive === false ? 'vefat olarak işaretlendi' : 'yaşıyor olarak işaretlendi');
    const ei = (e.profile && e.profile.info) || {}, ni = (n.profile && n.profile.info) || {};
    for (const k of Object.keys(ei)) {
      const a = String(ei[k] ?? '').trim(), b = String(ni[k] ?? '').trim();
      if (a && a !== b) farklar.push(`${ALAN_AD[k] || k} “${a}” → ${b ? `“${b}”` : 'silindi'}`);
    }
    if (e.profile && e.profile.photo && n.profile && n.profile.photo && e.profile.photo !== n.profile.photo) farklar.push('profil fotoğrafı değişti');
    if (!farklar.length) continue;
    out.push({ tur: 'bilgi-degisti', ids: [n.id], ilgililer: [onceki.kisi],
      mesaj: `${adiGoster(n.name)}: ${onceki.ad || 'başka biri'} tarafından girilen bilgi değişti — ${farklar.slice(0, DENETIM_UYARI.farkMax).join('; ')}. Doğru olan hangisi? Gerekirse birbirinize sorun.` });
  }
  return out.slice(0, DENETIM_UYARI.enCok);
}

// Öteki ilgililere hatırlatma yaz (+ push). sql: neon etiketli şablon. Hata kaydı bozmaz.
export async function uyarilariYaz(sql, celiskiler, kim) {
  let yazilan = 0;
  for (const c of celiskiler) for (const kisi of c.ilgililer || []) {
    await sql`insert into uyari (kisi_id, mesaj, ids, kaynak_kisi, kaynak_ad)
              values (${kisi}, ${c.mesaj.slice(0, 600)}, ${JSON.stringify(c.ids)}::jsonb, ${kim.kisi || null}, ${String(kim.ad || '').slice(0, 80)})`;
    yazilan++;
  }
  if (yazilan) {
    try {
      const { kisiyeBildir } = await import('./push.js');
      const kisiler = [...new Set(celiskiler.flatMap((c) => c.ilgililer || []))];
      for (const k of kisiler) await kisiyeBildir(k, { baslik: '⚠ Ağaçta bir çelişki', metin: `${kim.ad || 'Biri'} yaptığın bir kayıtla çelişen bir değişiklik yaptı — bakar mısın?`, url: '/?uyari=1', etiket: 'uyari' });
    } catch (e) { /* bildirim gitmese de hatırlatma tabloda */ }
  }
  return yazilan;
}
