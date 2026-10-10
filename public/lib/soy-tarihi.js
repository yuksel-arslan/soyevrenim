// ÜRETİLMİŞ DOSYA — düzenleme. Kaynak: api/_lib/soy-tarihi.js (npm run build)
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

// Kaynakça. kat: hangi grupta listeleneceği · not: gençler için "neden işe yarar"
export const KAYNAK_GRUPLARI = {
  birincil: 'Birincil kaynak — ailemizin kendi kaydı',
  arsiv: 'Osmanlı arşiv defterleri ve yayımlanmış hâlleri',
  akademik: 'Akademik çalışmalar',
  yer: 'Köyler ve yer adları',
  genel: 'Genel bilgi ve sözlükler',
  erisim: 'Arşiv ve kütüphanelere erişim',
};
export const KAYNAKLAR = {
  dulgerli: { kat: 'yer', ad: 'Vikipedi — Dülgerli, Arhavi', url: 'https://tr.wikipedia.org/wiki/D%C3%BClgerli,_Arhavi',
    not: 'Aşağı Potocur’un bugünkü adı; 1835/1876 kayıtları ve 1959 ad değişikliği.' },
  sogucak: { kat: 'yer', ad: 'Vikipedi — Soğucak, Arhavi', url: 'https://tr.wikipedia.org/wiki/So%C4%9Fucak,_Arhavi',
    not: 'Yukarı Potocur’un bugünkü adı.' },
  lazcaArhavi: { kat: 'yer', ad: 'Lazca.org — Arhavi eski ve yeni yer adları', url: 'https://lazca.org/arhavi/159-artvin-arhavi-eski-ve-yeni-yerisimleri.html',
    not: 'Köylerin Lazca, eski ve yeni adları yan yana — eski belgelerdeki adları bugünkü köylere eşlemek için.' },
  nisanyan: { kat: 'yer', ad: 'Index Anatolicus (Nişanyan) — Arhavi', url: 'https://nisanyanmap.com/?t=Arhavi&u=1&ua=0&y=',
    not: 'Her köyün 1876, 1928 ve bugünkü adı; adın kökeni.' },
  nisanyanFindikli: { kat: 'yer', ad: 'Index Anatolicus (Nişanyan) — Fındıklı', url: 'https://nisanyanyeradlari.com/?y=&t=F%C4%B1nd%C4%B1kl%C4%B1&u=1&ua=0',
    not: 'Derbent (Trevendi) ve Fındıklı köylerinin eski adları.' },
  ucirmak: { kat: 'yer', ad: 'Wikipedia — Üçırmak, Arhavi', url: 'https://en.wikipedia.org/wiki/%C3%9C%C3%A7%C4%B1rmak,_Arhavi',
    not: 'Fahri Arslan’ın notundaki “(Üçırmak)” ibaresini araştırmak için.' },
  arhaviTez: { kat: 'akademik', ad: 'Hacettepe Ü. — Arhavi Kazası’nda İskân ve Nüfus (1486-1583)', url: 'https://openaccess.hacettepe.edu.tr/handle/11655/4970',
    not: 'Arhavi köylerinin 16. yüzyıldaki durumu ve göçler; açık erişim.' },
  derbent: { kat: 'yer', ad: 'Wikipedia — Derbent, Fındıklı', url: 'https://en.wikipedia.org/wiki/Derbent,_F%C4%B1nd%C4%B1kl%C4%B1',
    not: 'Molla Memiş’in yerleştiği köy.' },
  lazcaFindikli: { kat: 'yer', ad: 'Lazca.org — Fındıklı eski ve yeni yer adları', url: 'https://lazca.org/laz-koyleri/158-rize-findikli-ilcesi-eski-ve-yeni-yeradlari.html',
    not: 'Derbent = Trevendi; Fındıklı köylerinin eski adları.' },
  kopru: { kat: 'yer', ad: 'Derbent Köprüsü koruma altına alındı (haber)', url: 'https://53r.com.tr/findikli-derbent-koprusu-artik-koruma-altinda/',
    not: 'Köyün tarihi taş kemer köprüsü — yerinde görülebilecek bir iz.' },
  findikliWiki: { kat: 'yer', ad: 'Vikipedi — Fındıklı', url: 'https://tr.wikipedia.org/wiki/F%C4%B1nd%C4%B1kl%C4%B1',
    not: 'Viçe nahiyesi ve 1928 köy listesi (Derbend dahil).' },
  vice: { kat: 'akademik', ad: 'Dergipark — XIX. yy Trabzon Eyaleti’nin idari birimi olarak Atina', url: 'https://dergipark.org.tr/tr/download/article-file/117817',
    not: 'Atina ve Viçe’nin idari geçmişi; 1486-1554 kayıtlarındaki durum.' },
  molla: { kat: 'genel', ad: 'TDV İslâm Ansiklopedisi — Molla', url: 'https://islamansiklopedisi.org.tr/molla',
    not: '“Molla” unvanının Osmanlı’daki anlamı.' },
  tahrirTdv: { kat: 'genel', ad: 'TDV İslâm Ansiklopedisi — Tahrir', url: 'https://islamansiklopedisi.org.tr/tahrir',
    not: 'Tahrir defteri nedir, nasıl tutulurdu — araştırmaya başlamadan önce okunmalı.' },
  findikliTarihce: { kat: 'yer', ad: 'Fındıklı Belediyesi — Tarihçe', url: 'https://findikli.bel.tr/tarihce/',
    not: '1486 kaydındaki Viçe, Sümle, Pazine, Mzuğu köyleri.' },
  findikliEnvanter: { kat: 'akademik', ad: 'Fındıklı Belediyesi — Kültür Envanteri (PDF)', url: 'https://findikli.bel.tr/wp-content/uploads/2023/07/fndkl_kultur_envanteri-sayfalar-9-272.pdf',
    not: '1486, 1583 ve 1682 kayıtlarında Fındıklı köyleri; köy hisselerinin adları.' },
  tt442: { kat: 'arsiv', ad: '1564 Tarihli Tahrir Defterine Göre Atina, Arhavi ve Hemşin Kazaları (TT 442)', url: 'https://www.academia.edu/123553691/1564_Tarihli_Tahrir_Defterine_G%C3%B6re_Atina_Arhavi_ve_Hem%C5%9Fin_Kazalar%C4%B1nda_Sosyal_ve_%C4%B0ktisad%C3%AE_Hayat',
    not: 'TT 442’nin tamamını inceleyen çalışma; Arhavi bölümü s. 81–139.' },
  aydin: { kat: 'akademik', ad: 'K. Aydın — Arhavi Kazasında İskân ve Nüfus (1583-1681/1682), HÜTAD 34 (2021), s. 197-225', url: 'https://dergipark.org.tr/tr/pub/turkiyat/article/773264',
    not: 'Molla Memiş’in göç dönemini kapsayan tek çalışma; 1681/82 avârız defteri. Açık erişim.' },
  aydinAcademia: { kat: 'akademik', ad: 'K. Aydın — aynı makalenin Academia.edu kopyası', url: 'https://www.academia.edu/111271367/Arhavi_Kazas%C4%B1nda_%C4%B0sk%C3%A2n_ve_N%C3%BCfus_1583_1681_1682_',
    not: 'DergiPark açılmazsa.' },
  hicyilmaz: { kat: 'arsiv', ad: 'M. Ü. Hiçyılmaz — Çayeli’nden Oyani: 1835 Arhavi-Hopa-Fındıklı Nüfus Kayıtları (Dergâh, 2015, ISBN 978-975-995-586-1)', url: 'https://www.dergah.com.tr/kitaplar/cayelinden-oyani-1835-arhavi-hopa-findikli-nufus-kayitlari',
    not: 'EN SOMUT İZ: 1835’te Derbend ve Potocur’daki haneler, baba adlarıyla. İkinci el bulunabilir.' },
  hicyilmazWorldcat: { kat: 'erisim', ad: 'WorldCat — Hiçyılmaz kitabının kütüphane kayıtları', url: 'https://search.worldcat.org/nl/title/Cayeli\'nden-oyani-:-1835-Arhavi-Hopa-Findikli-nufus-kayitlari/oclc/952192924',
    not: 'Kitabın hangi kütüphanelerde bulunduğunu gösterir.' },
  atina: { kat: 'arsiv', ad: 'Dergipark — Atina’nın idari durumu (1554, TT 288)', url: 'https://dergipark.org.tr/tr/download/article-file/117817',
    not: '1554 tarihli 288 numaralı defterin bölgedeki karşılığı.' },
  oztürk: { kat: 'yer', ad: 'Özhan Öztürk — Arhavi', url: 'https://ozhanozturk.com/2017/12/20/arhavi-artvin/',
    not: 'Arhavi’nin 1486 ve 1515 kayıtlarındaki adları ve köy sayıları; ayrıntılı dipnotlar.' },
  arhaviBel: { kat: 'yer', ad: 'Arhavi Belediyesi — Arhavi Tarihi', url: 'https://arhavi.bel.tr/arhavi-tarihi/',
    not: 'İlçenin kısa tarihi.' },
  lowry: { kat: 'akademik', ad: 'Heath W. Lowry — Trabzon Şehrinin İslamlaşması ve Türkleşmesi 1461-1583 (kitap)', url: 'https://www.kitapyurdu.com/kitap/trabzon-sehrinin-islamlasma-ve-turklesmesi-14611583/35446.html',
    not: 'Trabzon tahrir defterlerinin nasıl okunduğunu öğreten klasik çalışma.' },
  martolos: { kat: 'akademik', ad: 'XV-XVI. Yüzyıllarda Trabzon Sancağı’nda Martoloslar', url: 'https://www.researchgate.net/publication/274325264_XV-XVI_YUZYILLARDA_TRABZON_SANCAGI%27NDA_MARTOLOSLAR_Martoloses_in_Sandjak_of_Trabzon_in_XVth_-XVIth_Centuries',
    not: '1515 ve 1554 defterlerinde Arhavi nahiyesi.' },
  batum: { kat: 'arsiv', ad: 'Z. Şaşikadze — Batum Sancağı’nın Mufassal Defteri (TTK)', url: 'https://www.ttk.gov.tr/wp-content/uploads/2022/04/31-ZazaSasikadze.pdf',
    not: 'Arhavi’nin Batum sancağına bağlı olduğu dönemin defteri üzerine.' },
  boa: { kat: 'erisim', ad: 'Devlet Arşivleri Başkanlığı — katalog', url: 'https://katalog.devletarsivleri.gov.tr/',
    not: 'Defterlerin aslı burada. Üyelik gerekir; “Arhavi”, “Viçe”, “Derbend” diye aranır.' },
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

// OSMANLI ARŞİVİ — Trabzon / Lazistan defterleri. Defterlerin kendisi Devlet Arşivleri'nde
// tarama görüntüsü olarak durur (metin araması yok); buradaki bilgiler onları yayımlayan ya da
// inceleyen çalışmalardan derlendi. "Ne bulunabilir" satırı bir araştırma yol haritasıdır.
export const ARSIV = [
  { yil: '1486', ad: 'Trabzon Livası Mufassal Tahrir Defteri',
    metin: 'Bölge “Lâz” / “Lâz-ı Magal” adıyla kayıtlı. Fındıklı belediyesinin kültür envanterine göre bu defterde Laz kazası altında Viçe, Sümle, Pazine ve Mzuğu köyleri geçiyor — yani bugünkü Fındıklı köyleri, Arhavi ile aynı idari birimdeydi. Derbend adı bu listede görünmüyor.',
    bulunabilir: 'Viçe ve Sümle’nin hisseleri; köylerdeki yetişkin erkeklerin adları (“X veled-i Y”).',
    guven: 'kaynak', kaynak: ['findikliTarihce', 'findikliEnvanter', 'oztürk'] },
  { yil: '1564', ad: 'TT 442 — Atina, Arhavi ve Hemşin Mufassal Tahrir Defteri',
    metin: 'Devlet Arşivleri’nde Tapu Tahrir 442 numarada; 173 sayfa. Atina kazası s. 5–75, Arhavi/Laz kazası s. 81–139, Hemşin s. 149–172. Kazalar Batum sancağına bağlıyken düzenlenmiş. Marmara Üniversitesi’nde bir tez defteri baştan sona yeni harflere aktarmış. İnternetteki özetlerde Potocur adı görünmüyor; defterin içinde başka yazımla (ör. Potoçur) geçebilir.',
    bulunabilir: 'Aşağı Potocur’da 1564’te yaşayan hane reislerinin adları — Uzunaloğulları’nın Molla Memiş’ten önceki kuşakları burada olabilir.',
    guven: 'kaynak', kaynak: ['tt442'] },
  { yil: '1583', ad: 'Trabzon Livası Mufassal Tahrir Defteri',
    metin: 'Bölgenin Molla Memiş’in göçünden (~1615) önceki son ayrıntılı sayımı. Defterin arşiv numarası internette teyit edilemedi.',
    bulunabilir: 'Potocur ve Viçe/Sümle köylerinin 1615’ten hemen önceki nüfusu ve adları.',
    guven: 'belirsiz', kaynak: ['aydin'] },
  { yil: '1681/82', ad: 'Arhavi Kazası Avârız Defteri',
    metin: 'Kenan Aydın’ın makalesine göre 1583 ile 1681/82 arasında Fındıklı, Arhavi, Hopa ve Gonio bölgesindeki köylerin çoğunda nüfus ve statü değişmiş — Molla Memiş’in göçü de bu hareketli döneme denk geliyor. Fındıklı kültür envanterine göre 1682 kaydında bugünkü Fındıklı’ya karşılık gelen sekiz köy adı (Viçe, Sümle, Zuğu, Pazine, Martunvat, Zatrikandu, Abu…) ve çok hisseli köylerin her hissesinin ayrı adı yazılı.',
    bulunabilir: 'Göçten ~65 yıl sonra Derbent çevresindeki haneler. Derbend o dönem ayrı köy değil, Viçe ya da Sümle’nin bir hissesi olarak kayıtlı olabilir (Derbent Köprüsü Sümle/Sümer Deresi üzerindedir) — bu bir yorumdur.',
    guven: 'kaynak', kaynak: ['aydin', 'findikliEnvanter'] },
  { yil: '1835', ad: 'Arhavi Nüfus Defteri (No. 1165)',
    metin: 'Arhavi, Viçe (Fındıklı) ve Hopa nahiyelerinin köylerini kapsıyor ve tamamı yeni harflerle yayımlandı: Murat Ümit Hiçyılmaz, “Çayeli’nden Oyani — 1835 Arhavi-Hopa-Fındıklı Nüfus Kayıtları”, Dergâh Yayınları, 2015, 520 s., ISBN 978-975-995-586-1. Nüfus defterleri erkekleri hane hane, baba adı ve yaşıyla yazar.',
    bulunabilir: 'En somut iz: kitabın Derbend köyü sayfalarında Abdurrahman oğullarının 1835’teki hane reisleri. Ağaçtaki eski nesil adlarıyla (Abdurrahman, Musa, Mustafa Tahsin, Mehmet Yazıcı, Aslan, Hamit, Ali, Osman…) ve baba adlarıyla karşılaştırılabilir.',
    guven: 'kaynak', kaynak: ['hicyilmaz'] },
];

export const ARASTIRMA_ONERILERI = [
  'Önce kitap: Hiçyılmaz’ın 1835 nüfus kayıtları (Dergâh, ISBN 978-975-995-586-1) — Derbend ve Potocur sayfaları. İkinci el olarak bulunabiliyor.',
  'Kenan Aydın’ın makalesi DergiPark’ta açık erişimli: 1681/82 avârız defterindeki köy listeleri ve dipnotlarında 1583 defterinin numarası.',
  'TT 442 (1564): Marmara Üniversitesi’ndeki tezin transkripsiyonunda Arhavi bölümü (s. 81–139) — Potocur/Potoçur hane reisleri.',
  'Devlet Arşivleri katalogu (katalog.devletarsivleri.gov.tr) — üyelikle; “Arhavi”, “Viçe”, “Derbend” aramaları ve 1165 no.lu nüfus defterinin görüntüleri.',
  'Derbent ve Dülgerli köylerindeki mezar taşları, cami kayıtları ve yaşlıların anlatıları.',
];

// Arşiv sözlüğü — eski belgeleri okurken karşılaşılan terimler
export const SOZLUK = [
  ['Tahrir defteri', 'Bir bölgedeki köyleri, haneleri ve vergi veren erkekleri yazan Osmanlı sayım defteri.'],
  ['Mufassal', '“Ayrıntılı.” Kişi adlarını tek tek yazan tahrir defteri (icmal ise yalnız özet).'],
  ['Avârız defteri', 'Olağanüstü vergiler için tutulan hane defteri (17. yy); hane reislerinin adları geçebilir.'],
  ['Nüfus defteri (1830’lar)', 'Erkekleri hane hane, yaş ve baba adıyla yazan ilk modern sayım.'],
  ['Karye', 'Köy.'],
  ['Hisse', 'Bir köyün parçası; büyük köyler birkaç hisse olarak yazılırdı.'],
  ['Nahiye · Kaza · Liva/Sancak', 'Küçükten büyüğe idari birimler (bucak · ilçe · il gibi).'],
  ['Veled-i …', '“…’in oğlu.” Örn. “Abdurrahman veled-i Memiş” = Memiş oğlu Abdurrahman.'],
  ['Hane', 'Bir ailenin yaşadığı ev; vergide temel birim.'],
  ['Ahfad', 'Torunlar, soydan gelenler (Fahri Arslan’ın notunda geçer).'],
  ['TT / KK numarası', 'Defterin arşivdeki numarası (Tapu Tahrir / Kuyûd-ı Kadîme). Arşivde bu numarayla istenir.'],
];

// Gençler için adım adım araştırma rehberi
export const ARASTIRMA_REHBERI = [
  { adim: 'Ailenden dinle', metin: 'Büyüklerine soy adlarını, köy adlarını, kimin kimden olduğunu sor; “🎙 Hikâye anlat” ile kaydet. Her belge araştırması bu bilgilerle başlar.' },
  { adim: 'Terimleri öğren', metin: 'Aşağıdaki sözlüğe ve “Tahrir” maddesine göz at; eski defterlerin dili ilk bakışta zor gelir ama birkaç terimle çözülür.' },
  { adim: 'Yayımlanmış kayıtlarla başla', metin: 'Hiçyılmaz’ın 1835 kitabında Derbend ve Potocur sayfalarını bul; hane reislerini ve baba adlarını bir tabloya yaz.' },
  { adim: 'Ağaçla karşılaştır', metin: 'Bulduğun adları sitedeki eski nesillerle (Abdurrahman, Musa, Mustafa Tahsin, Mehmet Yazıcı, Aslan, Hamit…) karşılaştır. Aynı ad + aynı baba adı güçlü bir eşleşmedir.' },
  { adim: 'Makalelere in', metin: 'Kenan Aydın’ın makalesinin (açık erişim) dipnotlarından 1583 ve 1681/82 defterlerinin numaralarını bul.' },
  { adim: 'Arşive git', metin: 'Devlet Arşivleri kataloğunda defter numarasıyla ara; belgeyi okumak için Osmanlıca bilen biriyle (öğretmen, ilahiyat/tarih öğrencisi) çalış.' },
  { adim: 'Buluşunu paylaş', metin: 'Bulduğun her şeyi kaynağıyla birlikte kişinin kartına anı olarak ekle ya da Asistan’a anlat — öneri olarak yöneticiye gider, herkes görür.' },
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
    osmanli_arsivi: ARSIV.map((a) => ({ yil: a.yil, defter: a.ad, bulunabilir: a.bulunabilir, guven: GUVEN_ETIKETI[a.guven] })),
    not: 'Güveni "Teyit gerekli" ya da "Yorum" olan bilgileri kesinmiş gibi sunma; aile kaydı ile kaynakta geçeni ayır.',
  };
}
