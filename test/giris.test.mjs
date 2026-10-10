// Giriş: kişiye bağlı oturum jetonu ve kişisel giriş bağlantısı (veritabanı gerekmez)
import test from 'node:test';
import assert from 'node:assert/strict';
import { cagir } from './yardimci.mjs';

process.env.AILE_SIFRESI = 'aile-test'; process.env.ADMIN_SIFRESI = 'yonetici-test';
const { default: giris, jetonUret, jetonDogrula, davetUret, davetDogrula } = await import('../api/giris.js');
const { GIRIS } = await import('../api/_lib/ayar.js');
const post = (body) => cagir(giris, { body });

test('giriş: seçili kişi oturuma işlenir; "ben" kişiyi değiştirir; doğrula kişiyi korur', async () => {
  const g = await post({ sifre: 'aile-test', kisi: 'p12222123' });
  assert.equal(g.govde.rol, 'aile');
  assert.equal(jetonDogrula(g.govde.jeton).kisi, 'p12222123');
  const b = await post({ adim: 'ben', jeton: g.govde.jeton, kisi: 'p1222233' });
  assert.equal(jetonDogrula(b.govde.jeton).kisi, 'p1222233');
  const d = await post({ adim: 'dogrula', jeton: b.govde.jeton });
  assert.equal(d.govde.kisi, 'p1222233');
  assert.equal(jetonDogrula(d.govde.jeton).rol, 'aile');
  assert.equal((await post({ sifre: 'yanlis' })).statusCode, 401);
});

test('kişisel giriş bağlantısı: yalnız yönetici üretir; açan o kişi olur; oturum yerine kullanılamaz', async () => {
  assert.equal((await post({ adim: 'davet-uret', jeton: jetonUret('aile'), kisi: 'p1' })).statusCode, 403);
  assert.equal((await post({ adim: 'davet-uret', jeton: 'bozuk', kisi: 'p1' })).statusCode, 401);
  const u = await post({ adim: 'davet-uret', jeton: jetonUret('admin'), kisi: 'p1222233' });
  assert.equal(u.govde.ok, true);
  assert.equal(u.govde.gun, GIRIS.davetGun);
  assert.equal(jetonDogrula(u.govde.davet), null, 'bağlantı oturum jetonu değildir');
  const g = await post({ adim: 'davet', davet: u.govde.davet });
  assert.equal(g.govde.rol, 'aile');
  assert.equal(g.govde.kisi, 'p1222233');
  assert.equal(jetonDogrula(g.govde.jeton).kisi, 'p1222233');
  assert.equal(davetDogrula(jetonUret('admin')), null, 'oturum jetonu bağlantı yerine geçmez');
  assert.equal((await post({ adim: 'davet', davet: 'bozuk' })).statusCode, 401);
});

test('süreler ayardan: süresi dolan bağlantı ve oturum reddedilir', () => {
  const gercek = Date.now;
  const d = davetUret('p1'), j = jetonUret('aile', 'p1');
  try {
    Date.now = () => gercek() + (GIRIS.davetGun + 1) * 86400000;
    assert.equal(davetDogrula(d), null);
    Date.now = () => gercek() + (GIRIS.oturumGun + 1) * 86400000;
    assert.equal(jetonDogrula(j), null);
  } finally { Date.now = gercek; }
});
