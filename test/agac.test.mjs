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
  assert.equal(ilk('sorulara yanıt verebilir misin?').baslik, 'Neler yapabilirim?');
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

test('agacBirlestir: iki cihazın değişikliği de korunur (foto mobilde, bilgi bilgisayarda)', async () => {
  const { agacBirlestir } = await import('../api/_lib/agac.js');
  const taban = { evren: { ad: 'A' }, nodes: [
    { id: 'p1', name: 'Yüksel', profile: { photo: 'eski.jpg', info: { job: '' } } },
    { id: 'p2', name: 'Fahri' }, { id: 'p3', name: 'Ayten' } ],
    edges: [{ from: 'p2', to: 'p1' }], marriages: [{ from: 'p2', to: 'p3' }], motherEdges: [] };
  const kopya = (x) => JSON.parse(JSON.stringify(x));
  // mobil (sunucuya önce yazdı): Yüksel'in fotoğrafı değişti, yeni kişi eklendi
  const sunucu = kopya(taban);
  sunucu.nodes[0].profile.photo = 'mobil.jpg';
  sunucu.nodes.push({ id: 'p4', name: 'Fahri Kaan' }); sunucu.edges.push({ from: 'p1', to: 'p4' });
  // bilgisayar (eski kopyadan): Yüksel'in mesleği değişti, Ayten'in adı düzeltildi, evlilik silindi
  const yerel = kopya(taban);
  yerel.nodes[0].profile.info.job = 'Mühendis';
  yerel.nodes[2].name = 'Ayten Arslan';
  yerel.marriages = [];
  const b = agacBirlestir(taban, yerel, sunucu);
  const y = b.nodes.find((n) => n.id === 'p1');
  assert.equal(y.profile.photo, 'mobil.jpg', 'mobildeki fotoğraf geri alınmamalı');
  assert.equal(y.profile.info.job, 'Mühendis', 'bilgisayardaki bilgi de kalmalı');
  assert.equal(b.nodes.find((n) => n.id === 'p3').name, 'Ayten Arslan');
  assert.ok(b.nodes.find((n) => n.id === 'p4'), 'mobilde eklenen kişi korunur');
  assert.ok(b.edges.some((e) => e.to === 'p4'));
  assert.equal(b.marriages.length, 0, 'yerelde silinen bağ silinir');
  assert.deepEqual(b.evren, { ad: 'A' });
  // yerelde hiçbir şey değişmediyse sonuç = sunucu
  assert.deepEqual(agacBirlestir(taban, kopya(taban), sunucu), sunucu);
});

test('agacBirlestir: boş varsayılan profil gerçek fotoğrafı silmez; anılar iki cihazdan birleşir', async () => {
  const { agacBirlestir } = await import('../api/_lib/agac.js');
  const taban = { nodes: [{ id: 'p1', name: 'Yüksel', profile: { memories: [{ text: 'eski' }] } }] };
  const sunucu = { nodes: [{ id: 'p1', name: 'Yüksel', profile: { photo: 'mobil.jpg', memories: [{ text: 'eski' }, { text: 'mobil anı' }] } }] };
  // bilgisayar: profil boş varsayılanlarla oluştu (photo:"") + meslek + kendi anısı
  const yerel = { nodes: [{ id: 'p1', name: 'Yüksel', profile: { contact: {}, social: {}, photo: '', gallery: [],
    info: { job: 'Mühendis' }, memories: [{ text: 'eski' }, { text: 'bilgisayar anı' }] } }] };
  const p = agacBirlestir(taban, yerel, sunucu).nodes[0].profile;
  assert.equal(p.photo, 'mobil.jpg');
  assert.equal(p.info.job, 'Mühendis');
  assert.deepEqual(p.memories.map((m) => m.text).sort(), ['bilgisayar anı', 'eski', 'mobil anı']);
});

test('nesil: eşin kardeşi kişiyle aynı nesil; dünür ebeveyn bir üst, çocuğu bir alt', async () => {
  const { nesil } = await import('../api/_lib/agac.js');
  // Ana soy: Kök → Baba → Ben (2. nesil). Eş Nevin'in ailesi ayrı bir baba ağacı (dünür):
  // Kaya Baba → Nevin, Sevin; Sevin'in çocuğu Can. Dünür kökü önce listelenir (yanlış kök seçilmesin).
  const v = { nodes: [
    { id: 'k1', name: 'Kaya Baba', sex: 'E' }, { id: 'nv', name: 'Nevin', sex: 'K' }, { id: 'sv', name: 'Sevin', sex: 'K' },
    { id: 'cn', name: 'Can', sex: 'E' },
    { id: 'r', name: 'Kök', sex: 'E' }, { id: 'b', name: 'Baba', sex: 'E' }, { id: 'ben', name: 'Ben', sex: 'E' },
    { id: 'am', name: 'Amca', sex: 'E' }, { id: 'oc', name: 'Oğul', sex: 'E' },
  ], edges: [
    { from: 'k1', to: 'nv' }, { from: 'k1', to: 'sv' }, { from: 'sv', to: 'cn' },
    { from: 'r', to: 'b' }, { from: 'r', to: 'am' }, { from: 'b', to: 'ben' }, { from: 'ben', to: 'oc' },
  ], marriages: [{ from: 'ben', to: 'nv' }], motherEdges: [] };
  const gg = grafKur(v);
  const n = (id) => nesil(gg, id);
  assert.equal(n('ben'), 2);
  assert.equal(n('nv'), 2, 'eş aynı nesil');
  assert.equal(n('sv'), 2, 'eşin kardeşi aynı nesil (eskiden 1)');
  assert.equal(n('k1'), 1, 'eşin babası bir üst nesil');
  assert.equal(n('cn'), 3, 'eşin kardeşinin çocuğu bir alt nesil');
  // istemci (public/index.html reindex) aynı kuralı izler: kopyalanmış kütüphane de aynı sonucu verir
  const ist = await import('../public/lib/agac.js');
  assert.equal(ist.nesil(ist.grafKur(v), 'sv'), 2);
});
