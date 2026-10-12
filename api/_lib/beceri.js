// ÇINAR BECERİSİ (skill) — Çınar'ın bilgi tabanı ve yanıt yöntemi, tek yerde.
//
// Bilgi üç alandan derlenir ve TEK aramayla (bilgi_ara aracı) sorgulanır:
//   soy       → Fahri Arslan'ın 1956 notu, zaman çizelgesi, yerler, adlar   (soy-tarihi.js)
//   arastirma → Osmanlı arşiv defterleri, "ne bulunabilir", araştırma önerileri, adım adım
//               rehber, arşiv sözlüğü, kaynakça                              (soy-tarihi.js)
//   bolge · lazca · site → bölge tarihi, Lazca, site kullanımı                (uzmanlik.js)
//   site (güncel) → son eklenen özellikler (aşağıda SITE_GUNCEL)
// Model tüm metni istemine almaz; yalnız soruya en uygun birkaç parça (kaynak + güven etiketiyle)
// döner — daha az token, daha az uydurma. Yanıt yöntemi YONTEM'de; asistan istemine eklenir.
// Ayrıntı ve genişletme: docs/cinar-beceri.md
import { FAHRI_NOTU, ZAMAN, YERLER, ADLAR, ARSIV, ARASTIRMA_ONERILERI, SOZLUK, ARASTIRMA_REHBERI,
  KAYNAKLAR, GUVEN_ETIKETI } from './soy-tarihi.js';
import { BECERILER, BECERI_KAYNAKLARI } from './uzmanlik.js';
import { BECERI as AYAR } from './ayar.js';

// Yanıt yöntemi — sistem istemine eklenir (asistan.js)
export const YONTEM = `ÇINAR BECERİSİ — nasıl yanıt verirsin:
A. Soruyu sınıfla: (1) kişi/akrabalık → kisi_ara, kisi_getir, yol_bul, ani_ara; (2) köken, göç, yerler, Molla Memiş, Osmanlı arşivi, araştırma, kaynak, eski belge terimleri → bilgi_ara (alan: soy | arastirma); (3) bölge tarihi, Lazlar → bilgi_ara (alan: bolge); (4) site nasıl kullanılır → bilgi_ara (alan: site); (5) Lazca → bilgi_ara (alan: lazca). Genel köken özeti ya da ağacın sayıları için soy_tarihi.
B. Bilgiyi YALNIZ araç sonucundan ver. Tarih, ad, yer, defter numarası, kaynak adı UYDURMA. Sonuç yoksa "Bu konuda kaydımız yok" de ve bir yol öner (büyüklerden dinleyip "🎙 Hikâye anlat" ile kaydetmek ya da araştırma adımı).
C. Güveni sözle belli et: "aile kaydı" → "Fahri Arslan'ın notuna göre…"; "kaynakta geçiyor" → "kaynaklarda geçiyor (…)"; "yorum" → "bu bir yorum…"; "teyit gerekli" → "henüz teyit edilmedi…". Aile kaydını kaynaklı bilgiyle karıştırma.
D. Araştırma sorusunda somut bir sonraki adım ver: hangi defter/kitap, hangi sayfa ya da köy, nerede bulunur (sonuçtaki "bulunabilir" ve öneriler).
E. Kısa ve net yaz: 3–6 cümle; gerekiyorsa en çok 4 maddelik kısa liste. Sonunda en fazla bir takip sorusu öner. Kaynak satırı: "Kaynak: …" (araç sonucundaki adlarla).
F. Site sorusunda düğme/menü adlarını sonuçtaki gibi yaz; olmayan özellik anlatma.`;

const katla = (s) => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ı/g, 'i').replace(/[’'`"“”().,;:!?/–—-]/g, ' ').replace(/\s+/g, ' ').trim();
// Türkçe ekler için kaba kök: uzun sözcüğün ilk AYAR.kokHarf harfi ("defterinde" ~ "defter")
const kok = (w) => (w.length > AYAR.kokHarf ? w.slice(0, AYAR.kokHarf) : w);
const DOLGU = new Set(['bir', 've', 'ile', 'bu', 'su', 'o', 'ne', 'nedir', 'mi', 'mu', 'midir', 'nasil', 'neden', 'nerede',
  'hangi', 'kim', 'kimdir', 'icin', 'gibi', 'daha', 'cok', 'en', 'de', 'da', 'ki', 'var', 'yok', 'bana', 'anlat', 'soyle', 'biz', 'bizim']);
const sozcukler = (s) => katla(s).split(' ').filter((w) => w.length > 1 && !DOLGU.has(w));

const kaynakAdlari = (l, havuz) => (l || []).map((x) => havuz[x]).filter(Boolean).map((k) => ({ ad: k.ad, url: k.url }));

// Sitenin son özellikleri (uzmanlik.js'teki temel kullanım bilgisine ek; docs/*.md ile uyumlu tutulur)
const SITE_GUNCEL = [
  { baslik: 'Kayıt: ağaçta yoksan', anahtar: 'kayıt kaydol üye ol ağaçta yokum listede yok eklenmek',
    metin: 'Karşılama ekranında adını yaz; listede yoksan “Listede yok musun? Kaydol →”a dokun. Ad, soyad, cinsiyet ve isteğe bağlı doğum yılını yaz; ağaçtaki bir yakınını seç ve bağını belirt (çocuğu, eşi, kardeşi). Yakın seçilmeden kayıt olmaz; aile şifresi gerekir. Kayıttan sonra doğrudan kendi adınla girersin.' },
  { baslik: 'Giriş ve çıkış', anahtar: 'giriş çıkış oturum kapat şifre hesap menüsü',
    metin: 'Giriş aile şifresiyle yapılır; adını yazarken Türkçe karakter ya da soyad farkı sorun olmaz (Yuksel = Yüksel). Çıkış: hesap menüsü → “⎋ Çıkış yap”; sayfa karşılama ekranına döner. Yönetici kişinin kartından ona “🔗 Kişisel giriş bağlantısı” gönderebilir; açan kişi şifresiz, kendisi olarak girer.' },
  { baslik: 'Fotoğraf ve video', anahtar: 'fotoğraf foto resim video yükle profil galeri onay',
    metin: 'Kişinin kartında fotoğrafa dokunup profil fotoğrafı, “＋ Fotoğraf / Video ekle” ile galeri öğesi yüklenir. Aile üyesinin yüklediği fotoğraf onay beklemez, hemen görünür. Dosyalar Cloudflare R2’de saklanır.' },
  { baslik: 'Uygulama gibi kullanmak (ana ekran)', anahtar: 'indir uygulama ana ekran telefon iphone android mağaza yükle',
    metin: 'İndirmek gerekmez; tarayıcıdan soyevrenim.com yeterli. Ana ekrana eklenirse uygulama gibi açılır. iPhone: Safari’de Paylaş → “Ana Ekrana Ekle” → Ekle (iPhone’da bildirim için gerekli). Android: menü (⋮) → “Ana ekrana ekle”. Hesap menüsündeki “📲 Ana ekrana ekle” yönergeyi açar.' },
  { baslik: 'Aile Sohbeti ve bildirimler', anahtar: 'sohbet mesaj grup bildirim davet whatsapp',
    metin: 'Aile Sohbeti tüm ailenin ortak odasıdır; aile şifresiyle giren herkes yazar. “＋ Davet et” bağlantıyı paylaşır (şifre bağlantıda yazmaz). “🔕 Bildirim al” ile telefon kilitliyken de yeni mesaj haber verilir.' },
  { baslik: 'Aynı kişinin iki kaydı (birleştirme)', anahtar: 'birleştir aynı kişi iki kayıt kopya çift tekrar',
    metin: 'Aynı kişi ağaçta iki kez varsa Çınar’a “X ile Y aynı kişi” yazmak yeter: yönetici “⇄ Evet, birleştir” ile birleştirir, aile üyesinin isteği yöneticiye öneri olarak gider. Yönetici kişinin kartındaki “⇄ … ile aynı kişi mi? Birleştir” düğmesini de kullanabilir; bağlar, fotoğraf ve bilgiler tek kayıtta toplanır.' },
  { baslik: 'Kural: aynı anne-babadan aynı ad', anahtar: 'aynı ad kardeş kural sıra numarası hasan1 hasan2',
    metin: 'Anne-babası aynı iki kişi aynı adı taşıyamaz. Farklı kişilerse (eskiden ölen çocuğun adı sonraki kardeşe verilirdi) adın sonuna sıra numarası eklenir: Hasan1, Hasan2 — ekranda ikisi de “Hasan” görünür.' },
  { baslik: 'Nesil nasıl hesaplanır', anahtar: 'nesil kuşak kaçıncı nesil eşin kardeşi dünür',
    metin: 'Nesil, kök Molla Memiş’e (0) uzaklıktır. Eş aynı nesildir; eşin kardeşleri de aynı nesil, onların anne-babası bir önceki, çocukları bir sonraki nesil sayılır.' },
  { baslik: 'Köken ekranı', anahtar: 'köken 1956 çizim fahri arslan eser tam ekran',
    metin: 'Dock’taki “Köken” Fahri Arslan’ın 1956 el çizimini açar. ⛶ düğmesi ya da çift dokunuş görseli tam ekran yapar; Esc ya da Kapat ile çıkılır. “Hikâye” düğmesi kökenin anlatısını ve kaynakları gösterir.' },
  { baslik: 'Çınar kimdir', anahtar: 'çınar asistan sen kimsin yapay zeka model',
    metin: 'Çınar sitenin asistanıdır: soyumuzu, bölgemizi, araştırma kaynaklarını ve siteyi bilir. Ağaca kendisi yazmaz; ekleme ve düzeltmeler yönetici onayına öneri olarak gider. Günlük ortak kota ve kişi başı mesaj hakkı vardır; dolunca hazır bilgilerle yanıtlar.' },
];

let _belgeler = null;
export function belgeler() {
  if (_belgeler) return _belgeler;
  const B = [];
  const ekle = (b) => B.push({ ...b, _baslik: sozcukler(b.baslik), _anahtar: sozcukler(b.anahtar || ''), _metin: sozcukler(`${b.metin} ${b.bulunabilir || ''}`) });
  ekle({ alan: 'soy', baslik: 'Fahri Arslan’ın 1956 notu (kökenimiz)', anahtar: 'köken nereden geldik molla memiş uzunaloğulları potocur derbent 1615 ata ahfad',
    metin: `${FAHRI_NOTU.metin} (${FAHRI_NOTU.imza}). ${FAHRI_NOTU.aciklama}`, guven: GUVEN_ETIKETI.aile });
  ZAMAN.forEach((z) => ekle({ alan: 'soy', baslik: `${z.yil} — ${z.baslik}`, anahtar: `zaman tarih ${z.yil}`, metin: z.metin,
    guven: GUVEN_ETIKETI[z.guven], kaynak: kaynakAdlari(z.kaynak, KAYNAKLAR) }));
  YERLER.forEach((y) => ekle({ alan: 'soy', baslik: y.ad, anahtar: 'yer köy', metin: y.metin, guven: GUVEN_ETIKETI[y.guven], kaynak: kaynakAdlari(y.kaynak, KAYNAKLAR) }));
  ADLAR.forEach((a) => ekle({ alan: 'soy', baslik: a.ad, anahtar: 'ad unvan soy adı', metin: a.metin, guven: GUVEN_ETIKETI[a.guven], kaynak: kaynakAdlari(a.kaynak, KAYNAKLAR) }));
  ARSIV.forEach((a) => ekle({ alan: 'arastirma', baslik: `${a.yil} — ${a.ad}`, anahtar: `osmanlı arşiv defter kayıt ${a.yil}`, metin: a.metin,
    bulunabilir: a.bulunabilir, guven: GUVEN_ETIKETI[a.guven], kaynak: kaynakAdlari(a.kaynak, KAYNAKLAR) }));
  ekle({ alan: 'arastirma', baslik: 'Araştırmaya nereden başlanır (öneriler)', anahtar: 'araştırma nereden başla öneri ilk adım kitap arşiv',
    metin: ARASTIRMA_ONERILERI.map((x, i) => `${i + 1}) ${x}`).join(' '), guven: GUVEN_ETIKETI.kaynak });
  ekle({ alan: 'arastirma', baslik: 'Adım adım araştırma rehberi (gençler için)', anahtar: 'nasıl araştırırım adım rehber gençler soy araştırması',
    metin: ARASTIRMA_REHBERI.map((x, i) => `${i + 1}) ${x.adim}: ${x.metin}`).join(' ') });
  SOZLUK.forEach(([t, a]) => ekle({ alan: 'arastirma', baslik: `Arşiv terimi: ${t}`, anahtar: `sözlük terim anlamı ne demek ${t}`, metin: `${t}: ${a}` }));
  const kgrup = {};
  Object.values(KAYNAKLAR).forEach((k) => { (kgrup[k.kat] = kgrup[k.kat] || []).push(k); });
  Object.entries(kgrup).forEach(([kat, l]) => ekle({ alan: 'arastirma', baslik: `Kaynakça — ${kat}`, anahtar: `kaynak kaynakça kitap makale okuma listesi ${kat}`,
    metin: l.map((k) => k.ad).join(' · '), kaynak: l.map((k) => ({ ad: k.ad, url: k.url })) }));
  Object.entries(BECERILER).forEach(([beceri, b]) => (b.konular || []).forEach((k) => ekle({ alan: beceri, baslik: k.baslik,
    anahtar: (k.anahtar || []).join(' '), metin: k.metin, guven: k.guven, kaynak: kaynakAdlari(k.kaynak, BECERI_KAYNAKLARI) })));
  SITE_GUNCEL.forEach((k) => ekle({ alan: 'site', ...k }));
  _belgeler = B;
  return B;
}

// Puan: başlıkta eşleşen sözcük ×3, anahtar ×2, metin ×1 (kök eşleşmesi); sayı/yıl tam eşleşirse +3
function puanla(b, q) {
  let p = 0;
  for (const w of q) {
    const k = kok(w), eslesir = (l) => l.some((x) => x === w || (k.length >= AYAR.kokHarf && x.startsWith(k)));
    if (eslesir(b._baslik)) p += 3;
    if (eslesir(b._anahtar)) p += 2;
    if (eslesir(b._metin)) p += 1;
    if (/^\d{3,4}$/.test(w) && (b.baslik + b.metin).includes(w)) p += 3;
  }
  return p;
}

// bilgi_ara aracı: soruya en uygun parçalar (kaynak ve güven etiketiyle)
export function bilgiAra(sorgu, alan) {
  const q = sozcukler(sorgu);
  if (!q.length) return { sonuc: [], not: 'Arama sözcüğü yok' };
  const havuz = belgeler().filter((b) => !alan || b.alan === alan || (alan === 'soy' && b.alan === 'arastirma'));
  const l = havuz.map((b) => [b, puanla(b, q)]).filter(([, p]) => p >= AYAR.minPuan)
    .sort((a, b) => b[1] - a[1]).slice(0, AYAR.sonucMax)
    .map(([b]) => ({ alan: b.alan, baslik: b.baslik, bilgi: b.metin, ...(b.bulunabilir ? { bulunabilir: b.bulunabilir } : {}),
      ...(b.guven ? { guven: b.guven } : {}), ...(b.kaynak && b.kaynak.length ? { kaynak: b.kaynak.map((k) => k.ad).join('; ') } : {}) }));
  return l.length ? { sonuc: l } : { sonuc: [], not: 'Bilgi tabanında bu konuda kayıt yok — uydurma; bilmediğini söyle ve bir yol öner.' };
}
