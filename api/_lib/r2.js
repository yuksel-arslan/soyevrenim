// Cloudflare R2 (S3 uyumlu) — imzalı URL üretimi, bağımlılıksız AWS SigV4.
// Ses dosyaları tarayıcıdan DOĞRUDAN R2'ye yüklenir (Vercel'den geçmez); okuma da
// kısa ömürlü imzalı GET URL'iyle yapılır. Kova özel (public değil) kalır.
//
// Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
import crypto from 'node:crypto';

const hmac = (k, v) => crypto.createHmac('sha256', k).update(v).digest();
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const rfc3986 = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

// Genel SigV4 sorgu-imzası (AWS belgelerindeki örnek vektörle test edilir)
export function imzaliUrl({ method, host, path, region, akid, secret, tarih = new Date(), sureSn, ekSorgu = {} }) {
  const amzDate = tarih.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const gun = amzDate.slice(0, 8);
  const kapsam = `${gun}/${region}/s3/aws4_request`;
  const q = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${akid}/${kapsam}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(sureSn),
    'X-Amz-SignedHeaders': 'host',
    ...ekSorgu,
  };
  const sorgu = Object.keys(q).sort().map((k) => `${rfc3986(k)}=${rfc3986(q[k])}`).join('&');
  const yol = path.split('/').map(rfc3986).join('/');
  const kanonik = [method, yol, sorgu, `host:${host}`, '', 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const imzalanacak = ['AWS4-HMAC-SHA256', amzDate, kapsam, sha(kanonik)].join('\n');
  const kImza = hmac(hmac(hmac(hmac('AWS4' + secret, gun), region), 's3'), 'aws4_request');
  const imza = crypto.createHmac('sha256', kImza).update(imzalanacak).digest('hex');
  return `https://${host}${yol}?${sorgu}&X-Amz-Signature=${imza}`;
}

export function r2Hazir() {
  return ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'].every((k) => !!process.env[k]);
}

export function r2Url(method, anahtar, sureSn, ekSorgu) {
  if (globalThis.__SOY_TEST?.r2) return globalThis.__SOY_TEST.r2.url(method, anahtar, ekSorgu);
  if (!r2Hazir()) throw new Error('R2 ortam değişkenleri eksik');
  return imzaliUrl({
    method,
    host: `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    path: `/${process.env.R2_BUCKET}/${anahtar}`,
    region: 'auto',
    akid: process.env.R2_ACCESS_KEY_ID,
    secret: process.env.R2_SECRET_ACCESS_KEY,
    sureSn,
    ekSorgu,
  });
}

// Nesnenin gerçek boyutu (HEAD). Yoksa null.
export async function r2Boyut(anahtar, sureSn) {
  if (globalThis.__SOY_TEST?.r2) return globalThis.__SOY_TEST.r2.boyut(anahtar);
  const r = await fetch(r2Url('HEAD', anahtar, sureSn), { method: 'HEAD' });
  if (!r.ok) return null;
  return Number(r.headers.get('content-length')) || 0;
}

// R2 (S3) hata yanıtından kodu çıkar ve yöneticinin ne yapacağını söyle.
// Değerler asla gösterilmez; yalnızca hangi ortam değişkenine/ayara bakılacağı.
const R2_IPUCU = {
  AccessDenied: 'R2 API anahtarının bu kovaya YAZMA izni yok — Cloudflare → R2 → Manage API tokens: "Object Read & Write" ve doğru kova seçili olmalı',
  SignatureDoesNotMatch: 'R2_SECRET_ACCESS_KEY yanlış ya da eksik kopyalanmış',
  InvalidAccessKeyId: 'R2_ACCESS_KEY_ID yanlış (ya da anahtar silinmiş)',
  NoSuchBucket: 'R2_BUCKET adı yanlış (kova adı birebir aynı olmalı)',
  InvalidBucketName: 'R2_BUCKET adı geçersiz',
  Unauthorized: 'R2 anahtarı yetkisiz — R2_ACCOUNT_ID ile anahtar aynı hesaba ait olmalı',
};
export async function r2Hatasi(yanit) {
  let kod = '';
  try { kod = (/<Code>([^<]+)<\/Code>/.exec(await yanit.text()) || [])[1] || ''; } catch { kod = ''; }
  const ipucu = R2_IPUCU[kod] || (yanit.status === 403 ? R2_IPUCU.AccessDenied : 'R2 isteği reddetti');
  return { durum: yanit.status, kod, ipucu };
}

// ses/<kisi_id>/<dosya> — kisiId verilirse o kişiye ait olmalı
export function sesAnahtariGecerli(anahtar, kisiId) {
  const m = /^ses\/([\w-]{1,40})\/[\w.-]{1,80}$/.exec(String(anahtar || ''));
  return !!m && (!kisiId || m[1] === kisiId);
}
