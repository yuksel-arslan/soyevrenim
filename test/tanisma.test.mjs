// Tanışma daveti + iki kişiye özel sohbet (gerçek PostgreSQL)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DB_URL, dbKur, cagir } from './yardimci.mjs';

const atla = !DB_URL && 'TEST_DATABASE_URL yok';
let D, sohbet, jetonUret;
test.before(async () => { if (atla) return; D = await dbKur(); ({ default: sohbet } = await import('../api/sohbet.js')); ({ jetonUret } = await import('../api/giris.js')); });
test.after(async () => { if (D) await D.kapat(); });

test('tanışma: davet → alıcı görür → kabul → özel sohbet yalnız ikisine açık, davet notu ilk mesaj', { skip: atla }, async () => {
  const A = jetonUret('aile', 'pA'), B = jetonUret('aile', 'pB'), C = jetonUret('aile', 'pC');
  const s = (adim, body) => cagir(sohbet, { query: { adim }, body });
  assert.equal((await s('tanis-gonder', { jeton: '', alici: 'pB' })).statusCode, 401);
  assert.equal((await s('tanis-gonder', { jeton: A, alici: 'pA' })).statusCode, 400, 'kendine davet olmaz');
  const g = await s('tanis-gonder', { jeton: A, alici: 'pB', mesaj: 'Merhaba, ben Yüksel — dedelerimiz kardeşmiş!', gonderen_ad: 'Yüksel' });
  assert.equal(g.govde.ok, true);
  // ikinci gönderim yeni satır açmaz
  await s('tanis-gonder', { jeton: A, alici: 'pB', mesaj: 'Merhaba, ben Yüksel — dedelerimiz kardeşmiş!', gonderen_ad: 'Yüksel' });
  const lb = await s('tanis-liste', { jeton: B });
  assert.equal(lb.govde.gelen.length, 1);
  const id = Number(lb.govde.gelen[0].id);
  const kapsam = 'ozel:pA:pB';
  assert.equal((await s('oku', { kapsam, jeton: A })).statusCode, 403, 'kabulden önce özel sohbet kapalı');
  assert.equal((await s('tanis-yanit', { jeton: C, id, kabul: true })).statusCode, 403, 'başkasının davetine yanıt verilemez');
  const y = await s('tanis-yanit', { jeton: B, id, kabul: true, yanitlayan_ad: 'Fahri Kaan' });
  assert.equal(y.govde.kapsam, kapsam);
  const okuA = await s('oku', { kapsam, jeton: A });
  assert.equal(okuA.govde.mesajlar[0].mesaj, 'Merhaba, ben Yüksel — dedelerimiz kardeşmiş!');
  assert.equal((await s('yaz', { kapsam, jeton: B, mesaj: 'Memnun oldum!', yazan_ad: 'Fahri Kaan' })).govde.ok, true);
  assert.equal((await s('oku', { kapsam, jeton: C })).statusCode, 403, 'üçüncü kişi okuyamaz');
  assert.equal((await s('oku', { kapsam })).statusCode, 403, 'girişsiz okunamaz');
  assert.equal((await s('yaz', { kapsam, jeton: C, mesaj: 'x' })).statusCode, 403);
  assert.equal((await s('oku', { kapsam, jeton: B })).govde.mesajlar.length, 2);
  const la = await s('tanis-liste', { jeton: A });
  assert.deepEqual(la.govde.tanistik.map((t) => t.kisi), ['pB']);
  assert.equal(la.govde.giden[0].durum, 'kabul');
});
