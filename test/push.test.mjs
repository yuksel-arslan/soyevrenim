// Web Push testleri: şifreleme (RFC 8291) bağımsız bir çözücüyle, VAPID imzası açık anahtarla
// doğrulanır; uçtan uca kısım gerçek PostgreSQL + taklit push servisiyle (gerçek istek atılmaz).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { DB_URL, dbKur, cagir } from './yardimci.mjs';
import { sifrele, vapidBasligi, anahtarUret, _anahtarSifirla } from '../api/_lib/push.js';

const b64u = (b) => Buffer.from(b).toString('base64url');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();

// Tarayıcı tarafı (alıcı) çözücü — sunucu kodundan bağımsız yazıldı
function coz(govde, uaEcdh, yetki) {
  const salt = govde.subarray(0, 16), idlen = govde[20];
  const asAcik = govde.subarray(21, 21 + idlen), sifreli = govde.subarray(21 + idlen);
  const ortak = uaEcdh.computeSecret(asAcik);
  const ikm = hmac(hmac(yetki, ortak), Buffer.concat([Buffer.from('WebPush: info\0'), uaEcdh.getPublicKey(), asAcik, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(sifreli.subarray(-16));
  const acik = Buffer.concat([d.update(sifreli.subarray(0, -16)), d.final()]);
  assert.equal(acik[acik.length - 1], 2, 'son kayıt ayracı 0x02');
  return acik.subarray(0, -1).toString();
}
function tarayici() {
  const ua = crypto.createECDH('prime256v1'); ua.generateKeys();
  const yetki = crypto.randomBytes(16);
  return { ua, yetki, p256dh: b64u(ua.getPublicKey()), auth: b64u(yetki) };
}

test('push: aes128gcm şifreli yük tarayıcı tarafında çözülür', () => {
  const t = tarayici();
  const yuk = JSON.stringify({ baslik: '💬 Fahri · Aile Sohbeti', metin: 'Akşam herkes burada mı? ğüşıöç' });
  const govde = sifrele(yuk, t.p256dh, t.auth);
  assert.equal(govde.readUInt32BE(16), 4096);
  assert.equal(coz(govde, t.ua, t.yetki), yuk);
  // her gönderim farklı (yeni tuz + anahtar)
  assert.notDeepEqual(sifrele(yuk, t.p256dh, t.auth), govde);
});

test('push: VAPID JWT ES256 imzası açık anahtarla doğrulanır', () => {
  const a = anahtarUret();
  const bas = vapidBasligi('https://fcm.googleapis.com/fcm/send/abc', a, 1_700_000_000);
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(bas);
  assert.ok(m, bas);
  assert.equal(m[4], a.acik);
  const govde = JSON.parse(Buffer.from(m[2], 'base64url'));
  assert.equal(govde.aud, 'https://fcm.googleapis.com');
  assert.ok(govde.exp > 1_700_000_000 && govde.exp - 1_700_000_000 <= 86400);
  assert.match(govde.sub, /^mailto:/);
  const pub = Buffer.from(a.acik, 'base64url');
  const key = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33)) }, format: 'jwk' });
  assert.ok(crypto.verify('sha256', Buffer.from(`${m[1]}.${m[2]}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(m[3], 'base64url')));
});

// ---- uçtan uca: abone ol → mesaj yaz → diğer abonelere şifreli push gider ----
const atla = !DB_URL && 'TEST_DATABASE_URL yok';
let D, sohbet, jeton;
test.before(async () => {
  if (atla) return;
  D = await dbKur();
  ({ default: sohbet } = await import('../api/sohbet.js'));
  const { jetonUret } = await import('../api/giris.js');
  jeton = jetonUret('aile');
});
test.after(async () => { if (D) await D.kapat(); });

test('push uçtan uca: yazan hariç abonelere gider, 410 dönen abonelik silinir', { skip: atla }, async () => {
  _anahtarSifirla();
  const gelen = [];
  globalThis.__SOY_TEST.pushFetch = async (url, istek) => {
    gelen.push({ url, istek });
    return { status: url.includes('eski') ? 410 : 201 };
  };
  const v = await cagir(sohbet, { query: { adim: 'vapid' }, body: {} });
  assert.equal(v.govde.ok, true);
  assert.equal(Buffer.from(v.govde.acik, 'base64url').length, 65);
  // anahtar kalıcı: ikinci istek aynı anahtarı döner (tabloda tek satır)
  _anahtarSifirla();
  assert.equal((await cagir(sohbet, { query: { adim: 'vapid' }, body: {} })).govde.acik, v.govde.acik);

  const fahri = tarayici(), aysel = tarayici(), yuksel = tarayici(), eski = tarayici();
  const abone = (kisi, t, uc) => cagir(sohbet, { query: { adim: 'abone' },
    body: { jeton, kisi_id: kisi, abonelik: { endpoint: `https://push.example/${uc}`, keys: { p256dh: t.p256dh, auth: t.auth } } } });
  assert.equal((await cagir(sohbet, { query: { adim: 'abone' }, body: { abonelik: {} } })).statusCode, 401);   // girişsiz
  for (const [k, t, uc] of [['p1222233', fahri, 'fahri'], ['p121513A', aysel, 'aysel'], ['p12222123', yuksel, 'yuksel'], ['pX', eski, 'eski']]) {
    assert.equal((await abone(k, t, uc)).govde.ok, true);
  }
  const r = await cagir(sohbet, { query: { adim: 'yaz' },
    body: { jeton, kapsam: 'genel', mesaj: 'Grup sohbeti çalışıyor', yazan_ad: 'Yüksel', kisi_id: 'p12222123' } });
  assert.equal(r.govde.ok, true);
  assert.deepEqual(r.govde.bildirim, { gonderilen: 2, silinen: 1 });
  assert.ok(!gelen.some((g) => g.url.endsWith('/yuksel')), 'yazana bildirim gitmez');
  const fg = gelen.find((g) => g.url.endsWith('/fahri'));
  assert.equal(fg.istek.headers['Content-Encoding'], 'aes128gcm');
  assert.match(fg.istek.headers.Authorization, /^vapid t=.+, k=/);
  const yuk = JSON.parse(coz(fg.istek.body, fahri.ua, fahri.yetki));
  assert.equal(yuk.metin, 'Grup sohbeti çalışıyor');
  assert.match(yuk.baslik, /Yüksel/);
  assert.equal(yuk.url, '/?sohbet=1');
  const kalan = await D.ham('select endpoint from bildirim_abonelik order by id');
  assert.ok(!kalan.rows.some((x) => x.endpoint.endsWith('/eski')), '410 dönen abonelik silindi');
  delete globalThis.__SOY_TEST.pushFetch;
});
