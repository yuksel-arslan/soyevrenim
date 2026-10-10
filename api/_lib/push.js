// WEB PUSH — bağımlılıksız (Node crypto). Telefon kilitliyken de bildirim gelsin diye.
//
// • VAPID (RFC 8292): ES256 imzalı JWT → "Authorization: vapid t=…, k=…"
// • Yük şifreleme (RFC 8291, aes128gcm): her gönderimde yeni ECDH anahtarı + tuz
// • Anahtarlar: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (base64url, ham P-256) ortam değişkeni
//   varsa onlar; yoksa ilk kullanımda üretilip `bildirim_anahtar` tablosuna yazılır (kimse
//   elle anahtar taşımak zorunda kalmasın). Özel anahtar hiçbir yanıtta dönmez.
//
// Test kancası: globalThis.__SOY_TEST.pushFetch (gerçek push servisine istek atılmaz).
import crypto from 'node:crypto';
import { db } from './db.js';
import { BILDIRIM } from './ayar.js';

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const unb64u = (s) => Buffer.from(String(s || ''), 'base64url');

// ---- anahtarlar ----
function hamdanAnahtar(ozelB64, acikB64) {
  const d = unb64u(ozelB64), pub = unb64u(acikB64);
  return crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', d: b64u(d),
    x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) }, format: 'jwk' });
}
export function anahtarUret() {
  const e = crypto.createECDH('prime256v1'); e.generateKeys();
  return { acik: b64u(e.getPublicKey()), ozel: b64u(e.getPrivateKey()) };
}
let _anahtar = null;
export async function vapidAnahtar() {
  if (_anahtar) return _anahtar;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    _anahtar = { acik: process.env.VAPID_PUBLIC_KEY, ozel: process.env.VAPID_PRIVATE_KEY };
    return _anahtar;
  }
  const sql = db();
  let r = await sql`select acik, ozel from bildirim_anahtar where id = 1`;
  if (!r[0]) {
    const y = anahtarUret();
    await sql`insert into bildirim_anahtar (id, acik, ozel) values (1, ${y.acik}, ${y.ozel}) on conflict (id) do nothing`;
    r = await sql`select acik, ozel from bildirim_anahtar where id = 1`;   // yarışta kazananı al
  }
  _anahtar = { acik: r[0].acik, ozel: r[0].ozel };
  return _anahtar;
}
export function _anahtarSifirla() { _anahtar = null; }   // test

// ---- VAPID JWT (ES256) ----
export function vapidBasligi(endpoint, anahtar, simdiSn = Math.floor(Date.now() / 1000)) {
  const aud = new URL(endpoint).origin;
  const bas = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const govde = b64u(JSON.stringify({ aud, exp: simdiSn + BILDIRIM.jwtSureSn, sub: BILDIRIM.konu }));
  const imza = crypto.sign('sha256', Buffer.from(`${bas}.${govde}`),
    { key: hamdanAnahtar(anahtar.ozel, anahtar.acik), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${bas}.${govde}.${b64u(imza)}, k=${anahtar.acik}`;
}

// ---- RFC 8291 aes128gcm şifreleme ----
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
export function sifrele(metin, p256dh, auth, { asAnahtar, tuz } = {}) {
  const uaAcik = unb64u(p256dh), yetki = unb64u(auth);
  const as = asAnahtar || crypto.createECDH('prime256v1');
  if (!asAnahtar) as.generateKeys();
  const asAcik = as.getPublicKey();
  const ortak = as.computeSecret(uaAcik);
  const ikm = hmac(hmac(yetki, ortak), Buffer.concat([Buffer.from('WebPush: info\0'), uaAcik, asAcik, Buffer.from([1])]));
  const salt = tuz || crypto.randomBytes(16);
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const sifreli = Buffer.concat([c.update(Buffer.concat([Buffer.from(metin), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(BILDIRIM.kayitBoyu);
  return Buffer.concat([salt, rs, Buffer.from([asAcik.length]), asAcik, sifreli]);
}

// ---- tek aboneliğe gönder ----
// Döner: {ok, durum, sil} — sil=true ise abonelik artık geçersiz (404/410), kaldırılmalı.
export async function pushGonder(abonelik, yuk) {
  const anahtar = await vapidAnahtar();
  const govde = sifrele(JSON.stringify(yuk), abonelik.p256dh, abonelik.auth);
  const istek = {
    method: 'POST',
    headers: {
      Authorization: vapidBasligi(abonelik.endpoint, anahtar),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(BILDIRIM.ttlSn),
      Urgency: 'normal',
    },
    body: govde,
  };
  const f = globalThis.__SOY_TEST?.pushFetch || fetch;
  try {
    const r = await Promise.race([
      f(abonelik.endpoint, istek),
      new Promise((_, red) => setTimeout(() => red(new Error('zaman aşımı')), BILDIRIM.zamanAsimiMs)),
    ]);
    return { ok: r.status >= 200 && r.status < 300, durum: r.status, sil: r.status === 404 || r.status === 410 };
  } catch (e) {
    return { ok: false, durum: 0, sil: false, hata: String(e.message || e) };
  }
}

// ---- aileye duyur: yazan hariç tüm abonelere ----
export async function aileyeBildir({ haricKisi, baslik, metin, url, etiket }) {
  const sql = db();
  const aboneler = await sql`
    select id, endpoint, p256dh, auth from bildirim_abonelik
    where kisi_id is distinct from ${haricKisi || null}
    order by id desc limit ${BILDIRIM.enCokAlici}
  `;
  if (!aboneler.length) return { gonderilen: 0, silinen: 0 };
  const yuk = { baslik, metin: String(metin || '').slice(0, BILDIRIM.metinMax), url, etiket };
  const sonuclar = await Promise.all(aboneler.map((a) => pushGonder(a, yuk).then((s) => ({ ...s, id: a.id }))));
  const silinecek = sonuclar.filter((s) => s.sil).map((s) => s.id);
  for (const id of silinecek) await sql`delete from bildirim_abonelik where id = ${id}`;
  return { gonderilen: sonuclar.filter((s) => s.ok).length, silinen: silinecek.length };
}
