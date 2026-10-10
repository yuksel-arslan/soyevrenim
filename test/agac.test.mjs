// Saf birim testleri (DB gerekmez): ağaç kütüphanesi, öneri yaması, R2 imzası, hikâye yardımcıları
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { grafKur, yolBul, kisiAra, adiGoster } from '../api/_lib/agac.js';
import { yamaUygula, yamaOzeti } from '../api/_lib/oneri.js';
import { imzaliUrl } from '../api/_lib/r2.js';
import { parcala, icerikKorundu } from '../api/_lib/hikaye-isle.js';
import { SES } from '../api/_lib/ayar.js';

const veri = JSON.parse(readFileSync(new URL('../yedek-cinsiyet-oncesi.json', import.meta.url), 'utf8'));
const g = grafKur(veri);

test('kisiAra: aynı adda birden çok kişi döner (asistan sormalı)', () => {
  const l = kisiAra(g, 'Fahri');
  assert.ok(l.length >= 2);
  assert.ok(l.every((k) => k.ad.startsWith('Fahri')));
  assert.equal(l[0].ad, 'Fahri');            // tam eşleşme önce
});

test('yolBul: Emine (p122221) ile Fahri (p12221) — yol, adım ilişkileri, ortak ata', () => {
  const y = yolBul(g, 'p122221', 'p12221');
  assert.ok(y);
  assert.equal(y.yol[0], 'p122221');
  assert.equal(y.yol.at(-1), 'p12221');
  assert.ok(y.ata);
  assert.equal(adiGoster(g.byId[y.ata.id].name), 'Hamit');
  assert.ok(y.adimlar.every((a) => ['oğlu', 'kızı', 'babası', 'annesi', 'eşi'].includes(a.iliski)));
  assert.match(y.etiket, /amca|yeğen/);
});

test('yama: "Ayşe, Fahri\'nin kız kardeşi" → aynı ebeveyne bağlı yeni kadın düğüm; girdi değişmez', () => {
  const once = JSON.stringify(veri);
  const yeni = yamaUygula(veri, [{ tur: 'kisi_ekle', ad: 'Ayşe', cinsiyet: 'K', iliski: 'kardesi', hedef_id: 'p12221' }]);
  assert.equal(JSON.stringify(veri), once);
  const n = yeni.nodes.at(-1);
  assert.equal(n.name, 'Ayşe'); assert.equal(n.sex, 'K');
  const baba = veri.edges.find((e) => e.to === 'p12221').from;
  assert.ok(yeni.edges.some((e) => e.from === baba && e.to === n.id));
  assert.match(yamaOzeti(veri, [{ tur: 'kisi_ekle', ad: 'Ayşe', iliski: 'kardesi', hedef_id: 'p12221' }]), /Ayşe.*kardeşi/);
});

test('yama: ref ile zincir ekleme ve geçersiz ilişki reddi', () => {
  const yeni = yamaUygula(veri, [
    { tur: 'kisi_ekle', ad: 'Zehra', cinsiyet: 'K', iliski: 'esi', hedef_id: 'p12221', ref: '$1' },
    { tur: 'kisi_ekle', ad: 'Can', iliski: 'cocugu', hedef_id: '$1' },
  ]);
  const z = yeni.nodes.find((n) => n.name === 'Zehra'), c = yeni.nodes.find((n) => n.name === 'Can');
  assert.ok(yeni.marriages.some((m) => m.from === 'p12221' && m.to === z.id));
  assert.ok(yeni.motherEdges.some((m) => m.from === z.id && m.to === c.id));
  assert.throws(() => yamaUygula(veri, [{ tur: 'kisi_ekle', ad: 'X', iliski: 'kuzeni', hedef_id: 'p12221' }]));
  assert.throws(() => yamaUygula(veri, [{ tur: 'kisi_ekle', ad: 'X', iliski: 'babasi', hedef_id: 'p12221' }]), /zaten/);
});

test('R2 SigV4: AWS belge örnek vektörü', () => {
  const u = imzaliUrl({ method: 'GET', host: 'examplebucket.s3.amazonaws.com', path: '/test.txt', region: 'us-east-1',
    akid: 'AKIAIOSFODNN7EXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    tarih: new Date('2013-05-24T00:00:00Z'), sureSn: 86400 });
  assert.ok(u.endsWith('X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'));
});

test('hikâye: uzun döküm parçalanır, düzenleme sözcük değiştirirse reddedilir', () => {
  const uzun = 'Bu bir cümle. '.repeat(1000);
  const p = parcala(uzun);
  assert.ok(p.length > 1 && p.every((x) => x.length <= SES.duzenleParcaKarakter));
  assert.equal(p.join(' ').replace(/\s+/g, ' '), uzun.trim().replace(/\s+/g, ' '));
  assert.ok(icerikKorundu('dedem tarlaya gitti sonra eve döndü', 'Dedem tarlaya gitti. Sonra eve döndü.'));
  assert.ok(!icerikKorundu('dedem tarlaya gitti sonra eve döndü', 'Büyükbabam bahçeye yürüdü.'));
});

test('enBuyukYasayan: doğum yılı yoksa en eski nesildeki yaşayan; doğum yılı girilince ona göre', async () => {
  const { enBuyukYasayan } = await import('../api/_lib/agac.js');
  const eb = enBuyukYasayan(veri);
  assert.equal(eb.yontem, 'nesil');
  assert.ok(eb.tamAd.endsWith(eb.unvan));
  const v2 = structuredClone(veri);
  const yuksel = v2.nodes.find((n) => n.id === 'p12222123');
  yuksel.profile = { info: { dogum: '1901' } };
  const eb2 = enBuyukYasayan(v2);
  assert.deepEqual([eb2.id, eb2.tamAd, eb2.yontem], ['p12222123', 'Yüksel Dede', 'dogum']);
  // vefat edenin doğum yılı dikkate alınmaz
  const v3 = structuredClone(v2);
  v3.nodes.find((n) => n.id === 'p12222123').alive = false;
  assert.notEqual(enBuyukYasayan(v3).id, 'p12222123');
});

test('soy tarihi: Fahri Arslan notu birebir, her bilgi güven etiketli, kaynaklar geçerli', async () => {
  const T = await import('../api/_lib/soy-tarihi.js');
  assert.match(T.FAHRI_NOTU.metin, /Aşağı Potocur \(Üçırmak\).*UZUNALOĞULLARI.*1615.*DERBENT.*Molla Memiş/);
  for (const x of [...T.ZAMAN, ...T.YERLER, ...T.ADLAR, ...T.ARSIV]) {
    assert.ok(T.GUVEN_ETIKETI[x.guven], x.ad || x.baslik);
    for (const k of x.kaynak) assert.ok(T.KAYNAKLAR[k]?.url?.startsWith('https://'), k);
  }
  for (const [k, v] of Object.entries(T.KAYNAKLAR)) {
    assert.ok(T.KAYNAK_GRUPLARI[v.kat], `${k}: kategori`);
    assert.ok(v.not && v.url.startsWith('https://'), `${k}: not/url`);
  }
  assert.ok(T.SOZLUK.length >= 8 && T.ARASTIRMA_REHBERI.length >= 5);
  const o = T.soyTarihiOzet();
  assert.ok(o.fahri_arslan_notu.includes('1956'));
  assert.ok(o.osmanli_arsivi.some((a) => a.yil === '1835' && /1165/.test(a.defter)));
});

test('Rehber becerileri: sorular doğru uzmanlığa gider, Lazca yalnız istenince', async () => {
  const U = await import('../api/_lib/uzmanlik.js');
  const ilk = (q, b) => U.uzmanAra(q, b, 1)[0];
  assert.equal(ilk('sorulara yanıt verebilir misin?').baslik, 'Rehber ne yapabilir?');
  assert.equal(ilk('Nasıl kişi eklerim?').beceri, 'site');
  assert.equal(ilk('Fındıklı’nın eski adı ne?').baslik, 'Viçe’den Fındıklı’ya');
  assert.equal(ilk('Lazca teşekkür nasıl denir', 'lazca').baslik, 'Teşekkür');
  assert.equal(ilk('Lazca anne ne demek', 'lazca').baslik, 'Akrabalık adları');
  assert.ok(U.lazcaMi('Xelaǩaoba, muç̌ore?'));
  assert.ok(!U.lazcaMi('Fahri’nin annesi kim?'));
  for (const b of Object.values(U.BECERILER)) for (const k of b.konular) {
    assert.ok(U.GUVEN[k.guven], k.baslik);
    for (const x of k.kaynak) assert.ok(U.BECERI_KAYNAKLARI[x], x);
  }
  const o = U.uzmanBilgi('Lazca merhaba', 'lazca');
  assert.ok(o.konular[0].bilgi.includes('Xelaǩaoba') && o.lazca_notu);
});

test('Lazca karşılama: konu içermeyen Lazca isteği için hazır yanıt var', async () => {
  const U = await import('../api/_lib/uzmanlik.js');
  assert.match(U.BECERILER.lazca.karsilama, /Xelaǩaoba/);
  assert.match(U.BECERILER.lazca.karsilama, /Merhaba/);
});

test('Akrabalık anlatısı: Türkçe ekler ve sıcak anlatım', async () => {
  const L = await import('../api/_lib/agac.js');
  assert.equal(L.ilgiEki('Emine'), "Emine'nin");
  assert.equal(L.ilgiEki('Aslan'), "Aslan'ın");
  assert.equal(L.ilgiEki('Molla Memiş'), "Molla Memiş'in");
  assert.equal(L.yonelmeEki('Fahri'), "Fahri'ye");
  assert.equal(L.ayrilmaEki('Hamit'), "Hamit'ten");
  // Emine (p122221) — Fahri (p12221): amca/hala–yeğen, ortak ata Hamit
  const an = L.akrabalikAnlatisi(g, 'p122221', 'p12221');
  assert.match(an.ozet, /Hamit'in çocukları/);
  assert.ok(!/→/.test(an.ozet + an.cumleler.join(' ')), 'anlatı ok listesi içermemeli');
  // kardeş, kuzen ve doğrudan hat için de cümle kurulur
  const kardes = L.akrabalikAnlatisi(g, 'p12', 'p11');
  assert.ok(kardes.ozet.length > 20);
  assert.equal(L.akrabalikAnlatisi(g, 'p1', 'p1').baslik, 'Aynı kişi');
});
