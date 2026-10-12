// Vercel Serverless Function — SESLİ HİKÂYE
// POST /api/hikaye?adim=olustur {jeton, kisi_id, hedef_kisi_id, parcalar:[{anahtar, sn}]}
//      → ses zaten R2'de; kuyruğa yazılır, kota varsa hemen işlenir, yoksa {durum:'bekliyor'}
// POST /api/hikaye?adim=liste   {hedef_kisi_id}  → o kişi için kayıtlar (bekleyen / işlenen)
// GET  /api/hikaye?adim=kuyruk  (Vercel Cron, her gün 00:30 UTC = 03:30 TR; Bearer CRON_SECRET)
//
// Env: OPENAI_API_KEY, R2_*, DATABASE_URL, OTURUM_GIZLI, CRON_SECRET   · Ayrıntı: docs/hikaye.md
import { db, cors, govde, sayi } from './_lib/db.js';
import { SES } from './_lib/ayar.js';
import { kimlikCoz, KimlikHatasi } from './_lib/kimlik.js';
import { r2Boyut, sesAnahtariGecerli } from './_lib/r2.js';
import { hikayeIsle, BEKLE_MESAJI } from './_lib/hikaye-isle.js';

const MB = 1024 * 1024;

export default async function handler(req, res) {
  cors(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const adim = String(req.query.adim || '');
  const sql = db();
  try {
    if (adim === 'kuyruk') {
      const gizli = process.env.CRON_SECRET;
      if (!gizli || req.headers.authorization !== `Bearer ${gizli}`) return res.status(401).json({ ok: false });
      const isler = await sql`select id from hikaye_kuyruk where durum='bekliyor' order by olusturma asc limit ${SES.kuyrukToplu}`;
      const sonuc = [];
      for (const { id } of isler) {
        const r = await hikayeIsle(Number(id));
        sonuc.push({ id: Number(id), durum: r.durum });
        if (r.durum === 'bekliyor') break;   // kota bitti → kalanlar yarın
      }
      return res.status(200).json({ ok: true, sonuc });
    }

    if (req.method !== 'POST') return res.status(405).json({ ok: false });
    const body = govde(req);

    if (adim === 'olustur') {
      const kim = await kimlikCoz(body);
      const hedef = String(body.hedef_kisi_id || '');
      if (!(kim.veri.nodes || []).some((n) => n.id === hedef)) return res.status(404).json({ ok: false, hata: 'Hikâyenin kişisi ağaçta yok' });
      const ham = Array.isArray(body.parcalar) ? body.parcalar : [];
      if (!ham.length) return res.status(400).json({ ok: false, hata: 'Ses parçası yok' });
      const parcalar = [];
      let toplamSn = 0, toplamBayt = 0;
      for (const p of ham) {
        if (!sesAnahtariGecerli(p.anahtar, kim.kisiId)) return res.status(400).json({ ok: false, hata: 'Geçersiz ses anahtarı' });
        const bayt = await r2Boyut(p.anahtar, SES.imzaSureSn);
        if (bayt == null) return res.status(400).json({ ok: false, hata: 'Ses dosyası depoda bulunamadı' });
        if (bayt > SES.parcaMaxMb * MB) return res.status(413).json({ ok: false, hata: `Parça ${SES.parcaMaxMb} MB'ı aşıyor` });
        const sn = Math.max(0, Math.min(Number(p.sn) || 0, SES.parcaSn));
        parcalar.push({ anahtar: p.anahtar, sn, bayt });
        toplamSn += sn; toplamBayt += bayt;
      }
      if (toplamSn > SES.maxKayitDk * 60) return res.status(400).json({ ok: false, hata: 'Kayıt çok uzun' });
      const r = await sql`
        insert into hikaye_kuyruk (kisi_id, hedef_kisi_id, ses_anahtar, parcalar, saniye, bayt)
        values (${kim.kisiId}, ${hedef}, ${parcalar[0].anahtar}, ${JSON.stringify(parcalar)}::jsonb, ${toplamSn}, ${toplamBayt})
        returning id`;
      const id = Number(r[0].id);
      if (body.cevir === false) return res.status(200).json({ ok: true, id, durum: 'bekliyor', mesaj: BEKLE_MESAJI });
      const sonuc = await hikayeIsle(id);
      return res.status(200).json({ ok: true, id, ...sonuc });
    }

    if (adim === 'liste') {
      const hedef = String(body.hedef_kisi_id || '');
      const rows = await sql`
        select id, kisi_id, durum, baslik, saniye, olusturma, oneri_id, ses_anahtar, parcalar
        from hikaye_kuyruk where hedef_kisi_id = ${hedef} order by olusturma desc limit 50`;
      return res.status(200).json({ ok: true, kayitlar: rows.map((x) => ({ ...x, id: Number(x.id), saniye: sayi(x.saniye) })) });
    }

    return res.status(400).json({ ok: false, hata: 'Bilinmeyen adım' });
  } catch (e) {
    if (e instanceof KimlikHatasi) return res.status(e.kod).json({ ok: false, hata: e.message });
    return res.status(500).json({ ok: false, hata: String(e.message || e) });
  }
}
