// Kayıt (ağaçta olmayan aile üyesi kendini ekler) ve onaysız fotoğraf kaydı.
// Saf kısım DB'siz; uçtan uca kısım gerçek PostgreSQL ile (TEST_DATABASE_URL).
import test from 'node:test';
import assert from 'node:assert/strict';
import { kayitEkle, medyaEkle, medyaUrlGecerli } from '../api/_lib/kayit.js';
import { grafKur, nesil } from '../api/_lib/agac.js';
import { DB_URL, dbKur, cagir } from './yardimci.mjs';

const agac = () => ({ nodes: [
  { id: 'r', name: 'Kök', sex: 'E' }, { id: 'b', name: 'Fahri', sex: 'E', spouse: ['Nevin Kaya'] },
  { id: 'a', name: 'Ayten', sex: 'K' }, { id: 'y', name: 'Yüksel', sex: 'E' }, { id: 'yalniz', name: 'Tek', sex: 'E' },
], edges: [{ from: 'r', to: 'b' }, { from: 'b', to: 'y' }], marriages: [{ from: 'b', to: 'a', type: 'marriage' }], motherEdges: [] });
const temel = { ad: 'Selin', cinsiyet: 'K', iliski: 'cocuk', bag: 'b' };

test('kayıt: bağ zorunlu — bağsız, bilinmeyen kişi ya da geçersiz ilişki reddedilir', () => {
  assert.throws(() => kayitEkle(agac(), { ...temel, bag: '' }), (e) => e.kod === 400);
  assert.throws(() => kayitEkle(agac(), { ...temel, bag: 'yok' }), (e) => e.kod === 404);
  assert.throws(() => kayitEkle(agac(), { ...temel, iliski: 'arkadas' }), (e) => e.kod === 400);
  assert.throws(() => kayitEkle(agac(), { ...temel, ad: '<b>x</b>' }), (e) => e.kod === 400);
  assert.throws(() => kayitEkle(agac(), { ...temel, bag: 'yalniz', iliski: 'kardes' }), /anne-babası ağaçta yok/);
});

test('kayıt: çocuğu → baba bağı + tek eş anne bağı; girdi değişmez; nesil doğru', () => {
  const v0 = agac();
  const { veri, id } = kayitEkle(v0, temel, 'T');
  assert.equal(v0.nodes.length, 5, 'girdi değişmez');
  assert.ok(veri.edges.some((e) => e.from === 'b' && e.to === id));
  assert.ok(veri.motherEdges.some((e) => e.from === 'a' && e.to === id));
  const n = veri.nodes.find((x) => x.id === id);
  assert.deepEqual(n.kayit, { zaman: 'T', bag: 'b', iliski: 'cocuk' });
  assert.equal(nesil(grafKur(veri), id), nesil(grafKur(veri), 'y'));
});

test('kayıt: eşi → evlilik bağı, adla yazılmış eş kaydı bu kişiye döner; kardeşi → aynı ebeveyn', () => {
  let { veri, id } = kayitEkle(agac(), { ad: 'Nevin', soyad: 'Kaya', cinsiyet: 'K', iliski: 'es', bag: 'y' });
  assert.ok(veri.marriages.some((m) => m.from === 'y' && m.to === id));
  assert.equal(veri.nodes.find((x) => x.id === id).name, 'Nevin Kaya');
  ({ veri, id } = kayitEkle(agac(), { ad: 'Nevin', soyad: 'Kaya', cinsiyet: 'K', iliski: 'es', bag: 'b' }));
  assert.deepEqual(veri.nodes.find((x) => x.id === 'b').spouse, ['Nevin Kaya (aileden)'], 'çift eş yazısı olmaz');
  ({ veri, id } = kayitEkle(agac(), { ad: 'Sevin', cinsiyet: 'K', iliski: 'kardes', bag: 'y' }));
  assert.ok(veri.edges.some((e) => e.from === 'b' && e.to === id));
});

test('kayıt: aynı bağla aynı ad zaten varsa 409 + mevcut kişi (çift kayıt olmaz)', () => {
  assert.throws(() => kayitEkle(agac(), { ad: 'yuksel', cinsiyet: 'E', iliski: 'cocuk', bag: 'b' }),
    (e) => e.kod === 409 && e.var === 'y');
});

test('medya: yalnız kendi deposundan bağlantı; foto yazılır, galeri tekrarsız eklenir', () => {
  const url = '/api/medya?adim=oku&anahtar=' + encodeURIComponent('medya/202610/1700000000000-abcdef123456.jpg');
  assert.ok(medyaUrlGecerli(url));
  assert.ok(!medyaUrlGecerli('https://kotu.example/x.jpg'));
  assert.throws(() => medyaEkle(agac(), 'y', 'photo', 'javascript:alert(1)'), (e) => e.kod === 400);
  let { veri } = medyaEkle(agac(), 'y', 'photo', url);
  assert.equal(veri.nodes.find((x) => x.id === 'y').profile.photo, url);
  ({ veri } = medyaEkle(veri, 'y', 'gallery', url));
  ({ veri } = medyaEkle(veri, 'y', 'gallery', url));
  assert.equal(veri.nodes.find((x) => x.id === 'y').profile.gallery.length, 1);
});

// ---- uçtan uca: /api/agac?adim=kayit ve ?adim=medya ----
const atla = !DB_URL && 'TEST_DATABASE_URL yok';
let D, agacApi, jetonUret, jetonDogrula;
test.before(async () => {
  if (atla) return;
  D = await dbKur();
  ({ default: agacApi } = await import('../api/agac.js'));
  ({ jetonUret, jetonDogrula } = await import('../api/giris.js'));
  process.env.AILE_SIFRESI = 'aile-test';
});
test.after(async () => { if (D) await D.kapat(); });

test('uçtan uca kayıt: şifresiz 401, yanlış şifre 401, doğru şifre → kişi eklenir + o kişi olarak oturum', { skip: atla }, async () => {
  const bag = D.agac.nodes.find((n) => (D.agac.edges || []).some((e) => e.from === n.id)).id;
  const govde = { ad: 'Deneme', soyad: 'Kayıt', cinsiyet: 'E', iliski: 'cocuk', bag };
  assert.equal((await cagir(agacApi, { query: { adim: 'kayit' }, body: govde })).statusCode, 401);
  assert.equal((await cagir(agacApi, { query: { adim: 'kayit' }, body: { ...govde, sifre: 'yanlis' } })).statusCode, 401);
  const r = await cagir(agacApi, { query: { adim: 'kayit' }, body: { ...govde, sifre: 'aile-test' } });
  assert.equal(r.statusCode, 200, JSON.stringify(r.govde));
  assert.equal(jetonDogrula(r.govde.jeton).kisi, r.govde.kisi);
  const [a] = await D.sql`select veri from agac where id=1`;
  assert.ok(a.veri.nodes.some((n) => n.id === r.govde.kisi && n.name === 'Deneme Kayıt'));
  assert.ok(a.veri.edges.some((e) => e.from === bag && e.to === r.govde.kisi));
  // aynı kayıt ikinci kez → 409 ve mevcut kişi
  const tekrar = await cagir(agacApi, { query: { adim: 'kayit' }, body: { ...govde, sifre: 'aile-test' } });
  assert.equal(tekrar.statusCode, 409);
  assert.equal(tekrar.govde.var, r.govde.kisi);
  // aile üyesinin fotoğrafı onaysız işlenir
  const url = '/api/medya?adim=oku&anahtar=' + encodeURIComponent('medya/202610/1700000000000-abcdef123456.jpg');
  assert.equal((await cagir(agacApi, { query: { adim: 'medya' }, body: { kisi_id: r.govde.kisi, alan: 'photo', url } })).statusCode, 401);
  const m = await cagir(agacApi, { query: { adim: 'medya' }, body: { jeton: jetonUret('aile'), kisi_id: r.govde.kisi, alan: 'photo', url } });
  assert.equal(m.statusCode, 200, JSON.stringify(m.govde));
  const [b] = await D.sql`select veri from agac where id=1`;
  assert.equal(b.veri.nodes.find((n) => n.id === r.govde.kisi).profile.photo, url);
  await D.sql`update agac set veri=${JSON.stringify(D.agac)}::jsonb where id=1`;
});
