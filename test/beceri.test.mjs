// Çınar becerisi: bilgi tabanı araması (DB gerekmez)
import test from 'node:test';
import assert from 'node:assert/strict';
import { bilgiAra, belgeler, YONTEM } from '../api/_lib/beceri.js';

const ilk = (q, alan) => bilgiAra(q, alan).sonuc[0];

test('beceri: araştırma sorusu → doğru defter, "ne bulunabilir" ve kaynakla', () => {
  const s = ilk('1835 nüfus defterinde ne bulabilirim?');
  assert.match(s.baslik, /1835 — Arhavi Nüfus Defteri/);
  assert.match(s.bulunabilir, /Derbend/);
  assert.match(s.kaynak, /Hiçyılmaz/);
  assert.equal(s.guven, 'Kaynakta geçiyor');
});

test('beceri: köken, yer adı, unvan, terim ve site soruları doğru parçaya gider', () => {
  assert.match(ilk('Potocur adı neden değişti').baslik, /1959/);
  assert.match(ilk('Molla unvanı ne anlama gelir').baslik, /Molla/);
  assert.match(ilk('veled-i ne demek').baslik, /Veled-i/);
  assert.match(ilk('Araştırmaya nereden başlamalıyım').baslik, /nereden başlanır/);
  assert.match(ilk('fotoğraf nasıl yüklerim', 'site').baslik, /Fotoğraf/);
  assert.match(ilk('telefona indirmem gerekiyor mu').baslik, /ana ekran/);
  assert.match(ilk('aynı kişi iki kez var, birleştir').baslik, /birleştirme/);
});

test('beceri: aile kaydı ile kaynaklı bilgi ayrı etiketli; ilgisiz soruda boş + uydurma uyarısı', () => {
  assert.equal(ilk('Fahri Arslan notu köken').guven, 'Aile kaydı');
  const r = bilgiAra('futbol maçı kaç kaç bitti');
  assert.deepEqual(r.sonuc, []);
  assert.match(r.not, /uydurma/);
});

test('beceri: alan süzgeci ve tüm alanlar dolu; yöntem istemi kuralları içerir', () => {
  const alanlar = new Set(belgeler().map((b) => b.alan));
  for (const a of ['soy', 'arastirma', 'bolge', 'lazca', 'site']) assert.ok(alanlar.has(a), a);
  assert.ok(bilgiAra('defter', 'site').sonuc.every((x) => x.alan === 'site'));
  assert.ok(bilgiAra('defter', 'soy').sonuc.every((x) => ['soy', 'arastirma'].includes(x.alan)));
  assert.match(YONTEM, /UYDURMA/);
  assert.match(YONTEM, /sonraki adım/);
});
