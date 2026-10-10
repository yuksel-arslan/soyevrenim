// Uçtan uca API testleri: gerçek PostgreSQL + taklit Groq/R2.
// Çalıştırma: TEST_DATABASE_URL=postgres://… node --test test/   (pg: npm i --no-save pg)
// Not: LLM senaryolu taklittir — modelin kalitesini değil, araç döngüsü / kota / öneri / kayıt
// tesisatını doğrular.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DB_URL, dbKur, cagir, senaryoLlm, arac } from './yardimci.mjs';

const atla = !DB_URL && 'TEST_DATABASE_URL yok';
let D, asistan, hikaye, kullanim, oneri, jeton, adminJeton, GUNLUK_SISTEM, GUNLUK_KISI, SaglayiciKotaHatasi;

test.before(async () => {
  if (atla) return;
  D = await dbKur();
  ({ default: asistan } = await import('../api/asistan.js'));
  ({ default: hikaye } = await import('../api/hikaye.js'));
  ({ default: kullanim } = await import('../api/kullanim.js'));
  ({ default: oneri } = await import('../api/oneri.js'));
  ({ GUNLUK_SISTEM, GUNLUK_KISI } = await import('../api/_lib/ayar.js'));
  ({ SaglayiciKotaHatasi } = await import('../api/_lib/groq.js'));
  const { jetonUret } = await import('../api/giris.js');
  jeton = jetonUret('aile'); adminJeton = jetonUret('admin');
});
test.after(async () => { if (D) await D.kapat(); });
test.beforeEach(async () => { if (D) await D.ham('delete from kullanim; delete from hikaye_kuyruk; delete from oneri;'); });

const KISI = 'p12222123'; // Yüksel

test('"Ayşe, Fahri\'nin kız kardeşi" → belirsizlikte sorar, netleşince öneri oluşur', { skip: atla }, async () => {
  // 1. mesaj: model kisi_ara yapar, iki Fahri görür ve sorar
  globalThis.__SOY_TEST.llm = senaryoLlm([
    { content: null, tool_calls: [arac('kisi_ara', { sorgu: 'Fahri' })] },
    (g) => {
      const sonuc = JSON.parse(g.messages.at(-1).content).sonuc;
      assert.ok(sonuc.filter((k) => k.ad === 'Fahri').length >= 2);
      return { content: 'Hangi Fahri? Hamit oğlu Fahri (p12221) mi, yoksa diğeri mi?' };
    },
  ]);
  let r = await cagir(asistan, { body: { jeton, kisi_id: KISI, mesaj: "Ayşe, Fahri'nin kız kardeşi" } });
  assert.equal(r.govde.ok, true);
  assert.match(r.govde.yanit, /Hangi Fahri/);
  assert.equal((await D.sql`select count(*)::int as n from oneri`)[0].n, 0);

  // 2. mesaj: kullanıcı netleştirir → oneri_olustur
  const llm = senaryoLlm([
    { content: null, tool_calls: [arac('oneri_olustur', { islemler: [{ tur: 'kisi_ekle', ad: 'Ayşe', cinsiyet: 'K', iliski: 'kardesi', hedef_id: 'p12221' }] })] },
    (g) => {
      const s = JSON.parse(g.messages.at(-1).content);
      assert.equal(s.tamam, true);
      return { content: "Ayşe'yi Fahri'nin kız kardeşi olarak öneri kutusuna gönderdim; yönetici onaylayınca ağaçta görünecek." };
    },
  ]);
  globalThis.__SOY_TEST.llm = llm;
  r = await cagir(asistan, { body: { jeton, kisi_id: KISI, mesaj: 'Hamit oğlu Fahri',
    gecmis: [{ rol: 'kullanici', metin: "Ayşe, Fahri'nin kız kardeşi" }, { rol: 'asistan', metin: 'Hangi Fahri?' }] } });
  assert.equal(r.govde.ok, true);
  assert.equal(r.govde.oneriler.length, 1);
  // geçmiş isteğe girdi, sistem istemi + kimlik var
  assert.ok(llm.istekler[0].messages.some((m) => m.content === 'Hangi Fahri?'));
  assert.ok(llm.istekler[0].messages[1].content.includes(KISI));
  const [o] = await D.sql`select * from oneri`;
  assert.equal(o.kaynak, 'asistan'); assert.equal(o.kisi_id, KISI); assert.equal(o.durum, 'bekliyor');
  assert.equal(o.islem[0].tur, 'kisi_ekle');
  assert.deepEqual(o.fark.eklenen, ['Ayşe']);
  // ağaç DEĞİŞMEDİ (model doğrudan yazmaz)
  const [a] = await D.sql`select veri from agac where id=1`;
  assert.equal(a.veri.nodes.length, D.agac.nodes.length);
  // kullanım: gerçek usage, 2 istek, işlem=ekleme
  const k = await D.sql`select * from kullanim order by id`;
  assert.deepEqual(k.map((x) => x.islem), ['soru', 'ekleme']);
  assert.equal(k[1].istek, 2); assert.equal(k[1].girdi_tok, 1800); assert.equal(k[1].cikti_tok, 240);

  // yönetici onaylar → yama GÜNCEL ağaca uygulanır
  const karar = await cagir(oneri, { query: { adim: 'karar' }, body: { jeton: adminJeton, id: Number(o.id), karar: 'onayla' } });
  assert.equal(karar.govde.ok, true);
  const [b] = await D.sql`select veri from agac where id=1`;
  assert.equal(b.veri.nodes.length, D.agac.nodes.length + 1);
  assert.equal(b.veri.nodes.at(-1).name, 'Ayşe');
  await D.sql`update agac set veri=${JSON.stringify(D.agac)}::jsonb where id=1`; // geri al
});

test('"Emine ile Fahri nasıl akraba?" → yol_bul sonucu modele gider, yanıt kaynaklı, istemciye yol çizdirilir', { skip: atla }, async () => {
  const llm = senaryoLlm([
    { content: null, tool_calls: [arac('yol_bul', { a_id: 'p122221', b_id: 'p12221' })] },
    (g) => {
      const s = JSON.parse(g.messages.at(-1).content);
      assert.equal(s.ortak_ata.ad, 'Hamit');
      assert.ok(s.adimlar.length >= 2);
      return { content: `Emine, Fahri'nin yeğeni. ${s.adimlar.join('; ')}.\nKaynak: soy ağacı kaydı` };
    },
  ]);
  globalThis.__SOY_TEST.llm = llm;
  const r = await cagir(asistan, { body: { jeton, kisi_id: KISI, mesaj: 'Emine ile Fahri nasıl akraba?' } });
  assert.equal(r.govde.ok, true);
  assert.match(r.govde.yanit, /Kaynak: soy ağacı kaydı/);
  assert.deepEqual(r.govde.gorsel.yol, ['p122221', 'p12221']);
  // istem MESAJ_MAX_TOKEN sınırında (araç tanımları dahil kaba tahmin)
  const { MESAJ_MAX_TOKEN, tahminiToken } = await import('../api/_lib/ayar.js');
  for (const i of llm.istekler) assert.ok(tahminiToken(JSON.stringify(i.messages)) + tahminiToken(JSON.stringify(i.tools || [])) <= MESAJ_MAX_TOKEN);
});

test('kota dolu (sistem) → yedek + doğru mesaj; LLM çağrılmaz', { skip: atla }, async () => {
  await D.sql`insert into kullanim (kisi_id,tur,model,girdi_tok,cikti_tok,istek,islem) values ('p1','llm','x',${GUNLUK_SISTEM.token},0,1,'soru')`;
  globalThis.__SOY_TEST.llm = senaryoLlm([]);
  const r = await cagir(asistan, { body: { jeton, kisi_id: KISI, mesaj: 'Fahri kimdir?' } });
  assert.equal(r.govde.yedek, true); assert.equal(r.govde.sebep, 'sistem');
  assert.equal(r.govde.mesaj, "Bugünkü ücretsiz asistan kotası doldu, yarın 03:00'te yenilenir.");
  assert.equal(globalThis.__SOY_TEST.llm.istekler.length, 0);
});

test('kişi günlük limiti → yedek (sebep: kisi); başka kişi etkilenmez', { skip: atla }, async () => {
  for (let i = 0; i < GUNLUK_KISI.mesaj; i++) await D.sql`insert into kullanim (kisi_id,tur,model,islem) values (${KISI},'llm','x','soru')`;
  globalThis.__SOY_TEST.llm = senaryoLlm([{ content: 'merhaba' }]);
  let r = await cagir(asistan, { body: { jeton, kisi_id: KISI, mesaj: 'selam' } });
  assert.equal(r.govde.sebep, 'kisi');
  r = await cagir(asistan, { body: { jeton, kisi_id: 'p1234442', mesaj: 'selam' } });
  assert.equal(r.govde.ok, true);
});

test('Groq 429 → yedek, hata gösterilmez; jetonsuz → yedek', { skip: atla }, async () => {
  globalThis.__SOY_TEST.llm = senaryoLlm([new SaglayiciKotaHatasi('429')]);
  let r = await cagir(asistan, { body: { jeton, kisi_id: KISI, mesaj: 'selam' } });
  assert.equal(r.govde.yedek, true); assert.equal(r.govde.sebep, 'saglayici'); assert.equal(r.govde.hata, undefined);
  r = await cagir(asistan, { body: { kisi_id: KISI, mesaj: 'selam' } });
  assert.equal(r.govde.yedek, true);
});

test('sesli hikâye: kota doluyken kuyruğa girer, cron işler → anı önerisi + kullanım', { skip: atla }, async () => {
  const anahtar = `ses/${KISI}/1-abcd.webm`;
  globalThis.__SOY_TEST.r2.koy(anahtar, 2_000_000);
  await D.sql`insert into kullanim (kisi_id,tur,model,saniye,islem) values ('p1','stt','x',${GUNLUK_SISTEM.sesSn},'hikaye')`;
  globalThis.__SOY_TEST.llm = senaryoLlm([]);
  let r = await cagir(hikaye, { query: { adim: 'olustur' }, body: { jeton, kisi_id: KISI, hedef_kisi_id: 'p1222', parcalar: [{ anahtar, sn: 95 }] } });
  assert.equal(r.govde.durum, 'bekliyor');
  assert.equal(r.govde.mesaj, 'Kaydın saklandı, yazıya çevirme yarın yapılacak.');
  // başkasının anahtarı reddedilir
  const ret = await cagir(hikaye, { query: { adim: 'olustur' }, body: { jeton, kisi_id: 'p1234442', hedef_kisi_id: 'p1222', parcalar: [{ anahtar, sn: 5 }] } });
  assert.equal(ret.statusCode, 400);

  // ertesi gün: kota boş, cron çalışır
  await D.ham('delete from kullanim');
  globalThis.__SOY_TEST.llm = senaryoLlm([{ content: JSON.stringify({ metin: 'Dedem Hamit bir gün tarlaya gitti. Ayşe, Fahri\'nin kız kardeşiydi.', baslik: 'Tarla günü', kisiler: [], yerler: [], tarihler: ['1985'] }) }]);
  process.env.CRON_SECRET = 'gizli';
  const yetkisiz = await cagir(hikaye, { method: 'GET', query: { adim: 'kuyruk' } });
  assert.equal(yetkisiz.statusCode, 401);
  r = await cagir(hikaye, { method: 'GET', query: { adim: 'kuyruk' }, headers: { authorization: 'Bearer gizli' } });
  assert.deepEqual(r.govde.sonuc.map((x) => x.durum), ['islendi']);
  const [is] = await D.sql`select * from hikaye_kuyruk`;
  assert.equal(is.durum, 'islendi'); assert.ok(is.oneri_id);
  const [o] = await D.sql`select * from oneri where id=${is.oneri_id}`;
  assert.equal(o.kaynak, 'hikaye');
  const ani = o.islem[0].ani;
  assert.equal(ani.kaynak, 'ses'); assert.equal(ani.ses_anahtar, anahtar); assert.equal(ani.date, '1985');
  assert.equal(ani.baslik, 'Tarla günü'); assert.match(ani.transkript, /dedem hamit/);
  const k = await D.sql`select tur, islem, saniye::float as sn from kullanim order by id`;
  assert.deepEqual(k.map((x) => [x.tur, x.islem]), [['stt', 'hikaye'], ['llm', 'hikaye']]);
  assert.equal(k[0].sn, 95);
  // ikinci cron aynı işi tekrar işlemez
  r = await cagir(hikaye, { method: 'GET', query: { adim: 'kuyruk' }, headers: { authorization: 'Bearer gizli' } });
  assert.deepEqual(r.govde.sonuc, []);
});

test('düzenleme sözcükleri değiştirirse ham metin korunur', { skip: atla }, async () => {
  const anahtar = `ses/${KISI}/2-abcd.webm`;
  globalThis.__SOY_TEST.r2.koy(anahtar, 1000);
  globalThis.__SOY_TEST.llm = senaryoLlm([{ content: JSON.stringify({ metin: 'Bambaşka uydurma bir hikâye.', baslik: 'x' }) }]);
  const r = await cagir(hikaye, { query: { adim: 'olustur' }, body: { jeton, kisi_id: KISI, hedef_kisi_id: 'p1222', parcalar: [{ anahtar, sn: 30 }] } });
  assert.equal(r.govde.durum, 'islendi');
  assert.match(r.govde.metin, /dedem hamit bir gün tarlaya gitti/);
});

test('kullanım paneli: ayın özeti, katkılar, depolama, kişinin hakkı', { skip: atla }, async () => {
  await D.sql`insert into hikaye_kuyruk (kisi_id,hedef_kisi_id,ses_anahtar,parcalar,saniye,bayt) values (${KISI},'p1222','ses/x/a.webm','[]',600,1200000)`;
  await D.sql`insert into kullanim (kisi_id,tur,model,girdi_tok,cikti_tok,islem) values (${KISI},'llm','x',100,50,'soru')`;
  const r = await cagir(kullanim, { query: { adim: 'ay' }, body: { kisi_id: KISI } });
  assert.equal(r.govde.ozet.hikaye, 1); assert.equal(r.govde.ozet.ses_sn, 600);
  assert.equal(r.govde.katki[0].kisi_id, KISI);
  assert.equal(r.govde.depolama.bayt, 1200000);
  assert.equal(r.govde.kota.kisi.mesaj, 1); assert.equal(r.govde.kota.sistem.token, 150);
  assert.equal(JSON.stringify(r.govde).includes('maliyet'), false);
});

test('soy sorusu → soy_tarihi aracı: Fahri Arslan notu + ağaç sayıları; rehber adı istemde', { skip: atla }, async () => {
  const llm = senaryoLlm([
    { content: null, tool_calls: [arac('soy_tarihi', {})] },
    (g) => {
      const s = JSON.parse(g.messages.at(-1).content);
      assert.match(s.fahri_arslan_notu, /Molla Memiş/);
      assert.equal(s.agac.kok, 'Molla Memiş');
      assert.ok(s.agac.kollar.length >= 2 && s.agac.nesil >= 8);
      return { content: "Fahri Arslan'ın notuna göre Molla Memiş 1615 civarında Derbent'e yerleşmiş.\nKaynak: Fahri Arslan'ın 1956 notu" };
    },
  ]);
  globalThis.__SOY_TEST.llm = llm;
  const r = await cagir(asistan, { body: { jeton, kisi_id: KISI, mesaj: 'Nereden geldik?' } });
  assert.equal(r.govde.ok, true);
  assert.match(llm.istekler[0].messages[1].content, /Nine Rehberi|Dede Rehberi/);
  assert.match(llm.istekler[0].messages[1].content, /o kişi değilsin/);
  const { MESAJ_MAX_TOKEN, tahminiToken } = await import('../api/_lib/ayar.js');
  for (const i of llm.istekler) assert.ok(tahminiToken(JSON.stringify(i.messages)) + tahminiToken(JSON.stringify(i.tools || [])) <= MESAJ_MAX_TOKEN);
});
