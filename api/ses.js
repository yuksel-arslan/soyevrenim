// Vercel Serverless Function — SES DEPOLAMA (Cloudflare R2)
// POST /api/ses/yukle-url  {jeton, kisi_id, tip}  → {anahtar, url, tip}  (tarayıcı PUT ile doğrudan R2'ye yükler)
// GET  /api/ses/oku?anahtar=…[&indir=1]           → 302 kısa ömürlü imzalı R2 URL'i (oynat / indir)
// (vercel.json: /api/ses/:adim → /api/ses?adim=:adim)
//
// Ses Vercel'den GEÇMEZ: bant genişliği ve 4,5 MB gövde sınırı sorun olmaz.
// Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET  · Ayrıntı: docs/hikaye.md
import crypto from 'node:crypto';
import { cors, govde } from './_lib/db.js';
import { SES, DEPOLAMA } from './_lib/ayar.js';
import { kimlikCoz, KimlikHatasi } from './_lib/kimlik.js';
import { r2Url, sesAnahtariGecerli } from './_lib/r2.js';

const UZANTI = { [SES.mime.split(';')[0]]: 'webm', [SES.mimeYedek]: 'm4a' };

export default async function handler(req, res) {
  cors(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const adim = String(req.query.adim || '');
  try {
    if (adim === 'yukle-url' && req.method === 'POST') {
      const body = govde(req);
      const kim = await kimlikCoz(body);
      const tip = String(body.tip || '').split(';')[0];
      const uz = UZANTI[tip];
      if (!uz) return res.status(400).json({ ok: false, hata: 'Desteklenmeyen ses türü' });
      const anahtar = `${DEPOLAMA.onEk}${kim.kisiId}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${uz}`;
      return res.status(200).json({ ok: true, anahtar, tip, url: r2Url('PUT', anahtar, SES.imzaSureSn) });
    }
    if (adim === 'oku' && req.method === 'GET') {
      const anahtar = String(req.query.anahtar || '');
      if (!sesAnahtariGecerli(anahtar)) return res.status(400).json({ ok: false, hata: 'Geçersiz anahtar' });
      const ek = req.query.indir ? { 'response-content-disposition': `attachment; filename="${anahtar.split('/').pop()}"` } : {};
      res.setHeader('Cache-Control', 'no-store');
      res.statusCode = 302;
      res.setHeader('Location', r2Url('GET', anahtar, SES.imzaSureSn, ek));
      return res.end();
    }
    return res.status(400).json({ ok: false, hata: 'Bilinmeyen adım' });
  } catch (e) {
    if (e instanceof KimlikHatasi) return res.status(e.kod).json({ ok: false, hata: e.message });
    return res.status(500).json({ ok: false, hata: String(e.message || e) });
  }
}
