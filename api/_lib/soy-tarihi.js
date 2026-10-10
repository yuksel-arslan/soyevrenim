// SOY TARİHİ — Fahri Arslan'ın 1956 çiziminin notu (birincil kaynak) + internetten
// derlenen bağlam. Hem sunucu (asistan aracı `soy_tarihi`) hem istemci (Köken ekranı,
// ücretsiz Rehber) kullanır. public/lib/soy-tarihi.js bu dosyanın kopyasıdır
// (npm run build). Her bilgi bir GÜVEN etiketi taşır:
//   'aile'     → Fahri Arslan'ın notu / aile hafızası (birincil, ama tarihî belgeyle doğrulanmadı)
//   'kaynak'   → yayımlanmış kaynakta geçiyor (bağlantısı verilmiştir)
//   'yorum'    → kaynaklardan çıkarım; kesin değil
//   'belirsiz' → çelişkili ya da bulunamadı; ailenin teyidi gerekiyor
// Ayrıntı: docs/asistan.md → "Soy tarihi"

export const FAHRI_NOTU = {
  metin: 'Arhavi ilçesine bağlı Aşağı Potocur (Üçırmak) köyünden UZUNALOĞULLARI soyundan, tahminen 1615 yıllarında DERBENT köyüne gelip yerleşen Molla Memiş, Abdurrahman oğullarının atası ve ahfadıdır.',
  imza: '1956 — Fahri Arslan',
  aciklama: 'Çizimin sağ alt köşesindeki el yazısı not. "Ahfad": torunlar, soydan gelenler.',
};

export const KAYNAKLAR = {
  dulgerli: { ad: 'Vikipedi — Dülgerli, Arhavi', url: 'https://tr.wikipedia.org/wiki/D%C3%BClgerli,_Arhavi' },
  sogucak: { ad: 'Vikipedi — Soğucak, Arhavi', url: 'https://tr.wikipedia.org/wiki/So%C4%9Fucak,_Arhavi' },
  lazcaArhavi: { ad: 'Lazca.org — Arhavi eski ve yeni yer adları', url: 'https://lazca.org/arhavi/159-artvin-arhavi-eski-ve-yeni-yerisimleri.html' },
  nisanyan: { ad: 'Index Anatolicus (Nişanyan) — Arhavi', url: 'https://nisanyanmap.com/?t=Arhavi&u=1&ua=0&y=' },
  ucirmak: { ad: 'Wikipedia — Üçırmak, Arhavi', url: 'https://en.wikipedia.org/wiki/%C3%9C%C3%A7%C4%B1rmak,_Arhavi' },
  arhaviTez: { ad: 'Hacettepe Ü. — Arhavi Kazası’nda İskân ve Nüfus (1486-1583)', url: 'https://openaccess.hacettepe.edu.tr/handle/11655/4970' },
  derbent: { ad: 'Wikipedia — Derbent, Fındıklı', url: 'https://en.wikipedia.org/wiki/Derbent,_F%C4%B1nd%C4%B1kl%C4%B1' },
  lazcaFindikli: { ad: 'Lazca.org — Fındıklı eski ve yeni yer adları', url: 'https://lazca.org/laz-koyleri/158-rize-findikli-ilcesi-eski-ve-yeni-yeradlari.html' },
  kopru: { ad: 'Derbent Köprüsü koruma altına alındı (haber)', url: 'https://53r.com.tr/findikli-derbent-koprusu-artik-koruma-altinda/' },
  findikliWiki: { ad: 'Vikipedi — Fındıklı', url: 'https://tr.wikipedia.org/wiki/F%C4%B1nd%C4%B1kl%C4%B1' },
  vice: { ad: 'Dergipark — XIX. yy Trabzon Eyaleti idari birimleri', url: 'https://dergipark.org.tr/tr/download/article-file/117817' },
  molla: { ad: 'TDV İslâm Ansiklopedisi — Molla', url: 'https://islamansiklopedisi.org.tr/molla' },
};

// Zaman çizelgesi (eskiden yeniye)
export const ZAMAN = [
  { yil: '1486–1583', baslik: 'Arhavi Osmanlı kayıtlarında',
    metin: 'Osmanlı tahrir defterlerine dayanan bir çalışmaya göre Arhavi ve köyleri bu dönemde adlarını korumuş; bölgedeki hâkimiyet mücadeleleri nüfus hareketlerine (göçlere) yol açmış.',
    guven: 'kaynak', kaynak: ['arhaviTez'] },
  { yil: '~1615', baslik: 'Molla Memiş Derbent’e yerleşir',
    metin: 'Fahri Arslan’ın notuna göre Molla Memiş, Uzunaloğulları soyundan, Arhavi’nin Aşağı Potocur köyünden gelip Derbent köyüne yerleşir. Tarih “tahminen” diye kayıtlı. Bu yıllar Osmanlı’da Sultan I. Ahmed dönemidir (1603–1617).',
    guven: 'aile', kaynak: [] },
  { yil: '1835 · 1876', baslik: 'Potocur resmî kayıtlarda',
    metin: 'Potocur adı 1835 Arhavi nüfus defterinde ve 1876 Trabzon salnamesinde geçer. 1876’da Potocur-i Süfla (Aşağı Potocur) ve Potocur-i Ulya (Yukarı Potocur) diye iki ayrı köy olarak, Hopa kazasının Arhavi nahiyesine bağlı kayıtlıdır.',
    guven: 'kaynak', kaynak: ['dulgerli', 'sogucak', 'lazcaArhavi'] },
  { yil: '1956', baslik: 'Fahri Arslan ağacı çizer',
    metin: 'Fahri Arslan, Abdurrahman oğullarının soy ağacını elle çizer ve kökeni sağ alt köşeye not eder. Bu sitedeki ağaç o çizimin yaşayan devamıdır.',
    guven: 'aile', kaynak: [] },
  { yil: '1959', baslik: 'Potocur’un adı değişir',
    metin: '7267 sayılı kanunla Aşağı Potocur’un adı Dülgerli, Yukarı Potocur’un adı Soğucak olur. (“Potocur” Türkçe sayılmadığı için.)',
    guven: 'kaynak', kaynak: ['dulgerli', 'sogucak'] },
];

// Yerler
export const YERLER = [
  { ad: 'Aşağı Potocur — bugün Dülgerli (Arhavi, Artvin)',
    metin: 'Lazca adı Potocuri (პოტოჯური); Türkçeye “Potocur” diye geçmiş. Halkı Laz. 1959’da adı Dülgerli olmuş.',
    guven: 'kaynak', kaynak: ['dulgerli', 'lazcaArhavi', 'nisanyan'] },
  { ad: 'Not: “(Üçırmak)” ibaresi',
    metin: 'Fahri Arslan notta Aşağı Potocur’un yanına parantez içinde “Üçırmak” yazmış. Kaynaklarda Üçırmak, Arhavi’de ayrı bir köy olarak geçiyor (1876’daki adı “Orçi Başköy”); Aşağı Potocur ise 1959’da Dülgerli adını almış. Hangi köyün kastedildiği — ya da 1956’da Aşağı Potocur’un yerel olarak Üçırmak diye de anılıp anılmadığı — aile büyüklerine sorulmalı.',
    guven: 'belirsiz', kaynak: ['ucirmak', 'nisanyan', 'dulgerli'] },
  { ad: 'Derbent — Fındıklı (Rize)',
    metin: 'Halkının çoğu Laz olan bir köy; Lazca adı Trevendi. İlçe merkezine 12–13 km. Sümer (Sumle) Deresi üzerindeki tarihi taş kemer Derbent Köprüsü yakın zamanda kültür varlığı olarak tescil edildi. Fındıklı’nın eski adı Viçe’dir; Derbend, Viçe’ye bağlı köylerden biridir.',
    guven: 'kaynak', kaynak: ['derbent', 'lazcaFindikli', 'kopru', 'findikliWiki', 'vice'] },
  { ad: 'Not: Hangi Derbent?',
    metin: 'Fahri Arslan’ın notunda Derbent’in ilçesi yazmıyor. Sitedeki “Fındıklı, Derbent köyü” bilgisi aile bilgisine dayanıyor. Fındıklı, Arhavi’ye komşu ilçe olduğu için bu yerleşim coğrafi olarak akla yatkın.',
    guven: 'yorum', kaynak: [] },
];

// Adlar ve unvanlar
export const ADLAR = [
  { ad: '“Molla” unvanı',
    metin: 'Osmanlı’da “molla” ilim sahibi kişilere verilen bir unvandı; üst düzey âlimler ve büyük kadılar için de kullanılırdı. Molla Memiş’in köyünde okumuş, saygın biri olduğu düşünülebilir; ama bu bir yorumdur, belgesi yoktur.',
    guven: 'yorum', kaynak: ['molla'] },
  { ad: 'Uzunaloğulları',
    metin: 'İnternette bu soy adına dair bir kayıt bulunamadı. Bilginin tek kaynağı Fahri Arslan’ın notu ve aile hafızası. Büyüklerin anlattıkları “🎙 Hikâye anlat” ile kaydedilirse bu boşluk dolar.',
    guven: 'belirsiz', kaynak: [] },
];

export const ARASTIRMA_ONERILERI = [
  'Osmanlı Arşivi’nde Trabzon / Lazistan tahrir defterleri — Viçe nahiyesi ve Derbend köyü (16.–17. yy).',
  '1835 Arhavi nüfus defteri — Potocur kayıtları.',
  'Derbent ve Dülgerli köylerindeki mezar taşları, cami kayıtları ve yaşlıların anlatıları.',
];

export const GUVEN_ETIKETI = {
  aile: 'Aile kaydı', kaynak: 'Kaynakta geçiyor', yorum: 'Yorum', belirsiz: 'Teyit gerekli',
};

// Asistan aracı için kısa, kaynaklı özet (istem bütçesi küçük)
export function soyTarihiOzet() {
  const k = (l) => (l || []).map((x) => KAYNAKLAR[x]?.ad).filter(Boolean).join('; ');
  return {
    fahri_arslan_notu: `${FAHRI_NOTU.metin} (${FAHRI_NOTU.imza})`,
    zaman: ZAMAN.map((z) => ({ yil: z.yil, olay: z.metin, guven: GUVEN_ETIKETI[z.guven], kaynak: k(z.kaynak) || undefined })),
    yerler: YERLER.map((y) => ({ yer: y.ad, bilgi: y.metin, guven: GUVEN_ETIKETI[y.guven] })),
    adlar: ADLAR.map((a) => ({ konu: a.ad, bilgi: a.metin, guven: GUVEN_ETIKETI[a.guven] })),
    not: 'Güveni "Teyit gerekli" ya da "Yorum" olan bilgileri kesinmiş gibi sunma; aile kaydı ile kaynakta geçeni ayır.',
  };
}
