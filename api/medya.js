// Vercel Serverless Function — FOTOĞRAF / VİDEO DEPOLAMA (Cloudflare R2)
// POST /api/medya?adim=yukle-url  {jeton, tip}   → {anahtar, url, okuUrl}  (tarayıcı PUT ile doğrudan R2'ye yükler)
// POST /api/medya?adim=yukle&jeton=…&tip=…      → gövde: ham dosya (octet-stream) → {anahtar, okuUrl}
//      YEDEK YOL: tarayıcı R2'ye doğrudan yükleyemezse (CORS / ağ) küçük dosyayı sunucu yükler.
//      Sunucu → R2 isteğinde CORS yok; sınır MEDYA.vekilMaxMb (Vercel gövde sınırının altında).
// GET  /api/medya?adim=oku&anahtar=…              → 302 kısa ömürlü imzalı R2 URL'i (görüntüle)
//
// Sesli hikâyelerle aynı depo (R2, 10 GB ücretsiz). Dosya Vercel'den GEÇMEZ: 4,5 MB gövde
// sınırı ve bant genişliği sorun olmaz. Kova özel kalır; profilde "/api/medya?adim=oku&anahtar=…"
// saklanır, her görüntülemede taze imzalı bağlantıya yönlenir.
// Eskiden Vercel Blob kullanılıyordu (ayrı kurulum isteyen ikinci bir depo) — kaldırıldı.
//
// Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, OTURUM_GIZLI · Ayrıntı: docs/medya.md
import crypto from 'node:crypto';
import { cors, govde } from './_lib/db.js';
import { MEDYA } from './_lib/ayar.js';
import { jetonDogrula } from './giris.js';
import { r2Url, r2Hatasi } from './_lib/r2.js';

export function medyaAnahtariGecerli(anahtar) {
  return new RegExp(`^${MEDYA.onEk}\\d{6}/[\\w-]{1,60}\\.(${Object.values(MEDYA.turler).join('|')})$`).test(String(anahtar || ''));
}

function yeniAnahtar(uz) {
  const ay = new Date().toISOString().slice(0, 7).replace('-', '');
  return `${MEDYA.onEk}${ay}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${uz}`;
}
async function hamGovde(req) {
  if (Buffer.isBuffer(req.body)) return req.body;          // Vercel octet-stream'i Buffer verir
  const p = []; for await (const c of req) p.push(c); return Buffer.concat(p);
}

export default async function handler(req, res) {
  cors(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const adim = String(req.query.adim || '');
  try {
    if (adim === 'yukle-url' && req.method === 'POST') {
      const body = govde(req);
      if (!jetonDogrula(body.jeton)) return res.status(401).json({ ok: false, hata: 'Giriş gerekli' });
      const tip = String(body.tip || '').split(';')[0].toLowerCase();
      const uz = MEDYA.turler[tip];
      if (!uz) return res.status(400).json({ ok: false, hata: 'Bu dosya türü desteklenmiyor (fotoğraf ya da video seç)' });
      const anahtar = yeniAnahtar(uz);
      return res.status(200).json({ ok: true, anahtar, tip,
        url: r2Url('PUT', anahtar, MEDYA.imzaSureSn),
        okuUrl: `/api/medya?adim=oku&anahtar=${encodeURIComponent(anahtar)}` });
    }
    if (adim === 'yukle' && req.method === 'POST') {
      if (!jetonDogrula(String(req.query.jeton || ''))) return res.status(401).json({ ok: false, hata: 'Giriş gerekli' });
      const tip = String(req.query.tip || '').split(';')[0].toLowerCase();
      const uz = MEDYA.turler[tip];
      if (!uz) return res.status(400).json({ ok: false, hata: 'Bu dosya türü desteklenmiyor (fotoğraf ya da video seç)' });
      const veri = await hamGovde(req);
      if (!veri.length) return res.status(400).json({ ok: false, hata: 'Dosya boş' });
      if (veri.length > MEDYA.vekilMaxMb * 1024 * 1024) return res.status(413).json({ ok: false, hata: `Dosya çok büyük (sunucu yolu en fazla ${MEDYA.vekilMaxMb} MB)` });
      const anahtar = yeniAnahtar(uz);
      const f = globalThis.__SOY_TEST?.r2Fetch || fetch;
      const r = await f(r2Url('PUT', anahtar, MEDYA.imzaSureSn), { method: 'PUT', headers: { 'Content-Type': tip }, body: veri });
      if (!r.ok) {
        const h = await r2Hatasi(r);
        return res.status(502).json({ ok: false, kod: h.kod, hata: `Depo yüklemeyi reddetti (${h.durum}${h.kod ? ' ' + h.kod : ''}): ${h.ipucu}` });
      }
      return res.status(200).json({ ok: true, anahtar, okuUrl: `/api/medya?adim=oku&anahtar=${encodeURIComponent(anahtar)}` });
    }
    if (adim === 'oku' && req.method === 'GET') {
      const anahtar = String(req.query.anahtar || '');
      if (!medyaAnahtariGecerli(anahtar)) return res.status(400).json({ ok: false, hata: 'Geçersiz anahtar' });
      // Yönlendirme imza süresinden kısa önbelleklenir: aynı fotoğraf tekrar tekrar sorulmasın
      res.setHeader('Cache-Control', `private, max-age=${MEDYA.okuOnbellekSn}`);
      res.statusCode = 302;
      res.setHeader('Location', r2Url('GET', anahtar, MEDYA.imzaSureSn));
      return res.end();
    }
    return res.status(400).json({ ok: false, hata: 'Bilinmeyen adım' });
  } catch (e) {
    const m = String(e.message || e);
    if (/R2 ortam/.test(m)) return res.status(503).json({ ok: false, hata: 'Fotoğraf deposu (R2) ayarları eksik' });
    return res.status(500).json({ ok: false, hata: m });
  }
}
