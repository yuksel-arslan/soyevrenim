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
