// Aile Meydanı: kutlama, büyüğe sor, etkinlik (gerçek PostgreSQL)
import test from 'node:test';
import assert from 'node:assert/strict';
import { DB_URL, dbKur, cagir } from './yardimci.mjs';

const atla = !DB_URL && 'TEST_DATABASE_URL yok';
let D, meydan, sohbet, jetonUret;
test.before(async () => { if (atla) return; D = await dbKur(); ({ default: meydan } = await import('../api/meydan.js')); ({ default: sohbet } = await import('../api/sohbet.js')); ({ jetonUret } = await import('../api/giris.js')); });
test.after(async () => { if (D) await D.kapat(); });
const m = (adim, body) => cagir(meydan, { query: { adim }, body });

test('meydan: giriş ve kişi seçimi şart', { skip: atla }, async () => {
  assert.equal((await m('soru-liste', {})).statusCode, 401);
  assert.equal((await m('soru-liste', { jeton: jetonUret('aile') })).statusCode, 400);
});

test('kutlama: Aile Sohbeti\'ne düşer', { skip: atla }, async () => {
  const r = await m('kutla', { jeton: jetonUret('aile', 'pA'), kime: 'pB', mesaj: 'Nice yaşlara!', gonderen_ad: 'Yüksel', kime_ad: 'Aysel' });
  assert.equal(r.govde.ok, true);
  const s = await cagir(sohbet, { query: { adim: 'oku' }, body: { kapsam: 'genel' } });
  assert.ok(s.govde.mesajlar.some((x) => /Aysel'in doğum günü kutlu olsun! — Nice yaşlara!/.test(x.mesaj) && x.yazan_id === 'pA'));
});

test('büyüğe sor: soru → yalnız sorulan yanıtlar → soran görür', { skip: atla }, async () => {
  const genc = jetonUret('aile', 'pGenc'), dede = jetonUret('aile', 'pDede'), baska = jetonUret('aile', 'pX');
  const r = await m('soru-sor', { jeton: genc, kime: 'pDede', metin: 'Köyde çocukken ne oynardınız?', soran_ad: 'Fahri Kaan' });
  assert.equal(r.govde.ok, true);
  assert.equal((await m('soru-liste', { jeton: dede })).govde.bana[0].metin, 'Köyde çocukken ne oynardınız?');
  assert.equal((await m('soru-yanitla', { jeton: baska, id: r.govde.id, yanit: 'x' })).statusCode, 403);
  assert.equal((await m('soru-yanitla', { jeton: dede, id: r.govde.id, yanit: 'Çelik çomak oynardık.' })).govde.ok, true);
  const l = await m('soru-liste', { jeton: genc });
  assert.equal(l.govde.benden[0].yanit, 'Çelik çomak oynardık.');
  assert.ok(l.govde.son.some((x) => x.yanit === 'Çelik çomak oynardık.'));
});

test('etkinlik: ekle → katıl → liste → yalnız duyuran ya da yönetici siler', { skip: atla }, async () => {
  const a = jetonUret('aile', 'pA'), b = jetonUret('aile', 'pB');
  const tarih = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  assert.equal((await m('etkinlik-ekle', { jeton: a, baslik: 'Derbent ziyareti' })).statusCode, 400, 'tarih şart');
  const r = await m('etkinlik-ekle', { jeton: a, baslik: 'Derbent ziyareti', tarih, yer: 'Derbent', olusturan_ad: 'Yüksel' });
  assert.equal(r.govde.ok, true);
  assert.equal((await m('etkinlik-katil', { jeton: b, id: r.govde.id, durum: 'evet', ad: 'Aysel' })).govde.ok, true);
  assert.equal((await m('etkinlik-katil', { jeton: b, id: r.govde.id, durum: 'belki', ad: 'Aysel' })).govde.ok, true);
  const l = await m('etkinlik-liste', { jeton: b });
  const e = l.govde.etkinlikler.find((x) => Number(x.id) === r.govde.id);
  assert.equal(e.katilim.length, 2);
  assert.equal(e.katilim.find((k) => k.kisi === 'pB').durum, 'belki');
  assert.equal((await m('etkinlik-sil', { jeton: b, id: r.govde.id })).statusCode, 403);
  assert.equal((await m('etkinlik-sil', { jeton: jetonUret('admin', 'pY'), id: r.govde.id })).govde.ok, true);
});

test('haftanın sorusu: yanıtlar hafta:YYYY-WW kapsamında herkese açık', { skip: atla }, async () => {
  const kapsam = 'hafta:2026-42';
  assert.equal((await cagir(sohbet, { query: { adim: 'yaz' }, body: { kapsam, jeton: jetonUret('aile', 'pA'), mesaj: 'Dere kenarı', yazan_ad: 'Yüksel' } })).govde.ok, true);
  const s = await cagir(sohbet, { query: { adim: 'oku' }, body: { kapsam } });
  assert.equal(s.govde.mesajlar[0].mesaj, 'Dere kenarı');
});
