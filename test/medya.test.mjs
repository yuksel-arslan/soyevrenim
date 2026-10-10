// Medya (fotoğraf/video) — Cloudflare R2: imzalı yükleme bağlantısı + görüntüleme yönlendirmesi.
// R2'ye gerçek istek atılmaz (__SOY_TEST.r2 taklidi).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cagir } from './yardimci.mjs';

globalThis.__SOY_TEST = { r2: { url: (m, k) => `https://r2.test/${m}/${k}` } };
const { default: medya, medyaAnahtariGecerli } = await import('../api/medya.js');
const { jetonUret } = await import('../api/giris.js');

test('medya: girişsiz yükleme bağlantısı verilmez (401)', async () => {
  const r = await cagir(medya, { query: { adim: 'yukle-url' }, body: { tip: 'image/jpeg' } });
  assert.equal(r.statusCode, 401);
});

test('medya: fotoğraf için imzalı PUT + kalıcı görüntüleme adresi; video da R2\'ye', async () => {
  const jeton = jetonUret('aile');
  const r = await cagir(medya, { query: { adim: 'yukle-url' }, body: { jeton, tip: 'image/jpeg' } });
  assert.equal(r.govde.ok, true);
  assert.match(r.govde.anahtar, /^medya\/\d{6}\/\d+-[0-9a-f]+\.jpg$/);
  assert.equal(r.govde.url, `https://r2.test/PUT/${r.govde.anahtar}`);
  assert.equal(r.govde.okuUrl, `/api/medya?adim=oku&anahtar=${encodeURIComponent(r.govde.anahtar)}`);
  const v = await cagir(medya, { query: { adim: 'yukle-url' }, body: { jeton, tip: 'video/quicktime' } });
  assert.match(v.govde.anahtar, /\.mov$/);
  const x = await cagir(medya, { query: { adim: 'yukle-url' }, body: { jeton, tip: 'application/pdf' } });
  assert.equal(x.statusCode, 400);
});

test('medya: görüntüleme taze imzalı R2 bağlantısına yönlendirir; geçersiz anahtar reddedilir', async () => {
  const anahtar = 'medya/202610/1760000000000-abcdef012345.jpg';
  assert.ok(medyaAnahtariGecerli(anahtar));
  const r = await cagir(medya, { method: 'GET', query: { adim: 'oku', anahtar } });
  assert.equal(r.statusCode, 302);
  assert.equal(r.basliklar.location, `https://r2.test/GET/${anahtar}`);
  for (const kotu of ['ses/p1/x.webm', 'medya/../gizli.jpg', 'medya/202610/a.exe']) {
    const k = await cagir(medya, { method: 'GET', query: { adim: 'oku', anahtar: kotu } });
    assert.equal(k.statusCode, 400, kotu);
  }
});

test('medya yedek yol: sunucu küçük dosyayı R2\'ye kendisi yükler (CORS gerekmez)', async () => {
  const jeton = jetonUret('aile');
  const gelen = [];
  globalThis.__SOY_TEST.r2Fetch = async (url, istek) => { gelen.push({ url, istek }); return { ok: true, status: 200 }; };
  const veri = Buffer.from('fotograf-baytlari');
  const r = await cagir(medya, { query: { adim: 'yukle', jeton, tip: 'image/jpeg' }, body: veri });
  assert.equal(r.govde.ok, true);
  assert.match(r.govde.anahtar, /^medya\/\d{6}\/.+\.jpg$/);
  assert.equal(gelen[0].url, `https://r2.test/PUT/${r.govde.anahtar}`);
  assert.equal(gelen[0].istek.method, 'PUT');
  assert.equal(gelen[0].istek.headers['Content-Type'], 'image/jpeg');
  assert.deepEqual(gelen[0].istek.body, veri);
  assert.equal((await cagir(medya, { query: { adim: 'yukle', tip: 'image/jpeg' }, body: veri })).statusCode, 401);
  const { MEDYA } = await import('../api/_lib/ayar.js');
  const buyuk = Buffer.alloc(MEDYA.vekilMaxMb * 1024 * 1024 + 1);
  assert.equal((await cagir(medya, { query: { adim: 'yukle', jeton, tip: 'image/jpeg' }, body: buyuk })).statusCode, 413);
  globalThis.__SOY_TEST.r2Fetch = async () => ({ ok: false, status: 403,
    text: async () => '<?xml version="1.0"?><Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>' });
  const red = await cagir(medya, { query: { adim: 'yukle', jeton, tip: 'image/jpeg' }, body: veri });
  assert.equal(red.statusCode, 502);
  assert.equal(red.govde.kod, 'AccessDenied');
  assert.match(red.govde.hata, /YAZMA izni/);
  globalThis.__SOY_TEST.r2Fetch = async () => ({ ok: false, status: 403,
    text: async () => '<Error><Code>SignatureDoesNotMatch</Code></Error>' });
  assert.match((await cagir(medya, { query: { adim: 'yukle', jeton, tip: 'image/jpeg' }, body: veri })).govde.hata, /R2_SECRET_ACCESS_KEY/);
  delete globalThis.__SOY_TEST.r2Fetch;
});
