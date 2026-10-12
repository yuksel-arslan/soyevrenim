// Öz-denetim: kim ekledi/değiştirdi damgası, kaydın getirdiği çelişkiler, ilgililere hatırlatma.
import test from 'node:test';
import assert from 'node:assert/strict';
import { damgala, celiskiBul } from '../api/_lib/denetim.js';
import { DB_URL, dbKur, cagir } from './yardimci.mjs';

const ALI = { kisi: 'pAli', ad: 'Ali' }, VELI = { kisi: 'pVeli', ad: 'Veli' };
const temel = () => ({ nodes: [{ id: 'y', name: 'Yüksel', sex: 'E' }, { id: 'c', name: 'Celal Kaya', sex: 'E' }],
  edges: [], marriages: [], motherEdges: [] });

test('damgala: yeni kişiye ekleyen, değişene duzenleyen; istemci damgayı göndermese de korunur', () => {
  const v1 = damgala(temel(), { ...temel(), nodes: [...temel().nodes, { id: 'n', name: 'Nevin Kaya', sex: 'K' }] }, ALI);
  assert.equal(v1.nodes.find((n) => n.id === 'n').ekleyen.kisi, 'pAli');
  const v2in = JSON.parse(JSON.stringify(v1)); v2in.nodes.forEach((n) => { delete n.ekleyen; });   // eski istemci damgayı atmış
  v2in.nodes.find((n) => n.id === 'n').profile = { info: { dogum: '1965' } };
  const v2 = damgala(v1, v2in, VELI);
  const n = v2.nodes.find((x) => x.id === 'n');
  assert.equal(n.ekleyen.kisi, 'pAli'); assert.equal(n.duzenleyen.kisi, 'pVeli');
  assert.ok(!v2.nodes.find((x) => x.id === 'y').duzenleyen, 'değişmeyene damga yok');
});

test('celiskiBul: başkasının eklediği kişiyi yeniden ekleme → çift kayıt uyarısı, ilk ekleyen ilgili', () => {
  const v1 = damgala(temel(), { ...temel(), nodes: [...temel().nodes, { id: 'n1', name: 'Nevin Kaya', sex: 'K' }],
    edges: [{ from: 'c', to: 'n1' }] }, ALI);
  const v2in = JSON.parse(JSON.stringify(v1)); v2in.nodes.push({ id: 'n2', name: 'Nevin Arslan (Kaya)', sex: 'K' });
  const v2 = damgala(v1, v2in, VELI);
  const l = celiskiBul(v1, v2, VELI);
  const c = l.find((x) => x.tur === 'cift-kayit');
  assert.ok(c, JSON.stringify(l));
  assert.deepEqual(c.ilgililer, ['pAli'], 'ilk ekleyen hatırlatılır, kaydeden değil');
});

test('celiskiBul: başkasının girdiği doğum yılı değişti → iki taraf da uyarılır; kendi bilgisini değiştirmek uyarı değil', () => {
  const v1 = damgala(temel(), { ...temel(), nodes: [{ id: 'y', name: 'Yüksel', sex: 'E', profile: { info: { dogum: '1965', job: 'Mühendis' } } }, temel().nodes[1]] }, ALI);
  const v2in = JSON.parse(JSON.stringify(v1)); v2in.nodes[0].profile.info.dogum = '1967';
  const v2 = damgala(v1, v2in, VELI);
  const l = celiskiBul(v1, v2, VELI);
  assert.equal(l.length, 1); assert.equal(l[0].tur, 'bilgi-degisti');
  assert.match(l[0].mesaj, /Ali tarafından girilen.*doğum “1965” → “1967”/);
  assert.deepEqual(l[0].ilgililer, ['pAli']);
  const v3in = JSON.parse(JSON.stringify(v2)); v3in.nodes[0].profile.info.dogum = '1968';
  assert.deepEqual(celiskiBul(v2, damgala(v2, v3in, VELI), VELI), [], 'Veli kendi girdiğini değiştiriyor');
});

// ---- uçtan uca: kaydeden uyarı alır, öteki kişiye hatırlatma yazılır ----
const atla = !DB_URL && 'TEST_DATABASE_URL yok';
let D, agac, jetonUret;
test.before(async () => { if (atla) return; D = await dbKur(); ({ default: agac } = await import('../api/agac.js')); ({ jetonUret } = await import('../api/giris.js')); });
test.after(async () => { if (D) await D.kapat(); });

test('uçtan uca: Ali Nevin\'i ekler, Veli aynı kişiyi yeniden ekler → Veli\'ye uyarı, Ali\'ye hatırlatma', { skip: atla }, async () => {
  const ali = jetonUret('aile', 'p1222'), veli = jetonUret('aile', 'p12221');
  const oku = async () => (await cagir(agac, { method: 'GET' })).govde;
  const kaydet = (j, v, onceki, ad) => cagir(agac, { body: { veri: v, jeton: j, onceki: new Date(onceki).toISOString(), guncelleyen: ad } });
  let g = await oku();
  const baba = g.veri.nodes.find((n) => n.name === 'Kadir') || g.veri.nodes[1];
  const v1 = JSON.parse(JSON.stringify(g.veri));
  v1.nodes.push({ id: 'tNevin1', name: 'Nevin Kaya', sex: 'K' }); v1.marriages.push({ from: baba.id, to: 'tNevin1' });
  let r = await kaydet(ali, v1, g.guncelleme, 'Ali');
  assert.equal(r.statusCode, 200, JSON.stringify(r.govde));
  g = await oku();
  assert.equal(g.veri.nodes.find((n) => n.id === 'tNevin1').ekleyen.kisi, 'p1222');
  const v2 = JSON.parse(JSON.stringify(g.veri));
  v2.nodes.push({ id: 'tNevin2', name: 'Nevin Arslan (Kaya)', sex: 'K' });
  r = await kaydet(veli, v2, g.guncelleme, 'Veli');
  assert.equal(r.statusCode, 200);
  assert.ok(r.govde.uyarilar.some((u) => /Nevin/.test(u.mesaj)), 'kaydedene uyarı: ' + JSON.stringify(r.govde.uyarilar));
  const liste = await cagir(agac, { query: { adim: 'uyarilar' }, body: { jeton: ali } });
  assert.ok(liste.govde.uyarilar.some((u) => /Nevin/.test(u.mesaj) && u.kaynak_ad === 'Veli'), 'Ali hatırlatıldı');
  assert.equal((await cagir(agac, { query: { adim: 'uyarilar' }, body: { jeton: veli } })).govde.uyarilar.length, 0, 'kaydedene tabloya yazılmaz');
  await cagir(agac, { query: { adim: 'uyari-okundu' }, body: { jeton: ali } });
  assert.equal((await cagir(agac, { query: { adim: 'uyarilar' }, body: { jeton: ali } })).govde.uyarilar.length, 0);
  await D.sql`update agac set veri=${JSON.stringify(D.agac)}::jsonb where id=1`;
});
