// Vercel Serverless Function — KULLANIM ("Ailemizin bu ayı" paneli + kota)
// GET  /api/kullanim?adim=ayar                → kamuya açık ayarlar (kota/limit/ses)
// POST /api/kullanim?adim=durum {kisi_id}     → bugünkü ortak kota + kişinin hakkı
// POST /api/kullanim?adim=ay    {kisi_id}     → ayın özeti, kişi katkıları, zaman şeridi, depolama
//
// Kimse için harcama/kişisel sayaç dışında veri gösterilmez; katkılar (hikâye dk, eklenen kişi) görünür.
// Ayrıntı: docs/kullanim.md
import { db, cors, govde, sayi, ayBasi } from './_lib/db.js';
import { kamuAyar, DEPOLAMA, KATKI } from './_lib/ayar.js';
import { kotaDurumu } from './_lib/kota.js';

export default async function handler(req, res) {
  cors(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const adim = String(req.query.adim || '');
  try {
    if (adim === 'ayar') {
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).json({ ok: true, ayar: kamuAyar() });
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false });
    const body = govde(req);
    const kisiId = /^[\w-]{1,40}$/.test(String(body.kisi_id || '')) ? String(body.kisi_id) : null;

    if (adim === 'durum') {
      return res.status(200).json({ ok: true, kota: await kotaDurumu(kisiId) });
    }

    if (adim === 'ay') {
      const sql = db();
      const bas = ayBasi();
      const [hik] = await sql`
        select count(*) as adet, coalesce(sum(saniye),0) as sn from hikaye_kuyruk where olusturma >= ${bas}`;
      const [ekl] = await sql`
        select coalesce(sum(jsonb_array_length(coalesce(fark->'eklenen','[]'::jsonb))),0) as adet
        from oneri where durum='onaylandi' and karar_zaman >= ${bas}`;
      const hikKisi = await sql`
        select kisi_id, count(*) as adet, coalesce(sum(saniye),0) as sn
        from hikaye_kuyruk where olusturma >= ${bas} group by kisi_id`;
      const eklKisi = await sql`
        select kisi_id, coalesce(sum(jsonb_array_length(coalesce(fark->'eklenen','[]'::jsonb))),0) as adet
        from oneri where durum='onaylandi' and karar_zaman >= ${bas} and kisi_id is not null group by kisi_id`;
      const katki = new Map();
      const al = (id) => { if (!katki.has(id)) katki.set(id, { kisi_id: id, hikaye: 0, hikaye_sn: 0, eklenen: 0 }); return katki.get(id); };
      hikKisi.forEach((r) => { const k = al(r.kisi_id); k.hikaye = sayi(r.adet); k.hikaye_sn = sayi(r.sn); });
      eklKisi.forEach((r) => { al(r.kisi_id).eklenen = sayi(r.adet); });
      const seridi = await sql`
        select id, kisi_id, hedef_kisi_id, baslik, saniye, durum, olusturma
        from hikaye_kuyruk where olusturma >= ${bas} order by olusturma asc limit 200`;
      const [dep] = await sql`select coalesce(sum(bayt),0) as bayt from hikaye_kuyruk`;
      return res.status(200).json({
        ok: true,
        ay: bas.slice(0, 7),
        ozet: { hikaye: sayi(hik.adet), ses_sn: sayi(hik.sn), yeni_kisi: sayi(ekl.adet) },
        katki: [...katki.values()].sort((a, b) => (b.hikaye_sn + b.eklenen * KATKI.kisiAgirlikSn) - (a.hikaye_sn + a.eklenen * KATKI.kisiAgirlikSn)),
        seridi: seridi.map((r) => ({ ...r, id: Number(r.id), saniye: sayi(r.saniye) })),
        depolama: { bayt: sayi(dep.bayt), kota: DEPOLAMA.kotaBayt },
        kota: await kotaDurumu(kisiId),
      });
    }
    return res.status(400).json({ ok: false, hata: 'Bilinmeyen adım' });
  } catch (e) {
    return res.status(500).json({ ok: false, hata: String(e.message || e) });
  }
}
