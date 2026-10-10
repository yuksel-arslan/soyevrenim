// REHBERİN BECERİLERİ (uzmanlık modülleri) — sunucu ve istemci ortak kullanır.
// public/lib/uzmanlik.js bu dosyanın kopyasıdır (npm run build).
//
//   bolge  → Doğu Karadeniz / Arhavi–Fındıklı bölge tarihi uzmanı
//   site   → soyevrenim.com kullanım uzmanı (Rehber, ağaç, öneri, hikâye…)
//   lazca  → Lazca (Lazuri) — selamlaşma, akrabalık adları, yazım notları
//   (soy   → Abdurrahman Oğulları kökeni: ayrı modül, api/_lib/soy-tarihi.js)
//
// Kullanım: asistan modeli `uzman_bilgi({sorgu, beceri})` aracıyla çağırır; model yokken
// (kota / anahtar yok) ücretsiz Rehber aynı bilgiyi anahtar sözcük eşleşmesiyle yanıtlar.
// Güven etiketleri soy-tarihi.js ile aynı: kaynak · yorum · belirsiz · genel (yaygın bilgi).
// Ayrıntı: docs/asistan.md → "Rehberin becerileri"

export const BECERI_KAYNAKLARI = {
  lazenstitu: { ad: 'Laz Enstitüsü — Lazcada genel ifadeler', url: 'https://www.lazenstitu.com/lazcada-genel-ifadeler/' },
  lazenstituAkraba: { ad: 'Laz Enstitüsü — Lazca akrabalık isimleri', url: 'https://www.lazenstitu.com/lazca-akrabalik-isimleri-mzaxalepes-coxope/' },
  lazcaOrgSelam: { ad: 'Lazca.org — Selamlaşma, tanışma', url: 'https://lazca.org/lazca/88-lazca-guncel-konusmalar-selamlasma-tanisma.html' },
  lazcaOrgGunluk: { ad: 'Lazca.org — Günlük konuşmalar', url: 'https://lazca.org/lazca/1254-guncel-gunluk-lazca-konusmalar-kelimeler.html' },
  meb: { ad: 'MEB — Yaşayan Dil ve Lehçeler: Lazca', url: 'https://tymm.meb.gov.tr/yasayan-dil-ve-lehceler-dersi-lazca/unite/1722' },
  findikliTarihce: { ad: 'Fındıklı Belediyesi — Tarihçe', url: 'https://findikli.bel.tr/tarihce/' },
  arhaviBel: { ad: 'Arhavi Belediyesi — Arhavi Tarihi', url: 'https://arhavi.bel.tr/arhavi-tarihi/' },
  oztürk: { ad: 'Özhan Öztürk — Arhavi', url: 'https://ozhanozturk.com/2017/12/20/arhavi-artvin/' },
  dulgerli: { ad: 'Vikipedi — Dülgerli, Arhavi', url: 'https://tr.wikipedia.org/wiki/D%C3%BClgerli,_Arhavi' },
  findikliWiki: { ad: 'Vikipedi — Fındıklı', url: 'https://tr.wikipedia.org/wiki/F%C4%B1nd%C4%B1kl%C4%B1' },
  aydin: { ad: 'K. Aydın — Arhavi Kazasında İskân ve Nüfus (1583-1681/1682)', url: 'https://dergipark.org.tr/tr/pub/turkiyat/article/773264' },
  vice: { ad: 'Dergipark — Trabzon Eyaleti idari birimleri', url: 'https://dergipark.org.tr/tr/download/article-file/117817' },
};

export const BECERILER = {
  bolge: {
    ad: 'Bölge tarihi uzmanı',
    aciklama: 'Doğu Karadeniz, Arhavi ve Fındıklı (Viçe) tarihi; Osmanlı idaresi; köy adları.',
    konular: [
      { baslik: 'Bölge ve halkı', anahtar: ['lazlar', 'laz halkı', 'bölgemiz', 'bölgenin', 'karadeniz', 'arhavi ve fındıklı'],
        metin: 'Arhavi (Artvin) ve Fındıklı (Rize) Doğu Karadeniz’de birbirine komşu iki ilçedir; köylerinde yaşayanların büyük kısmı Lazdır. Arhavi’nin Lazca adı Arkabi’dir. Soyumuzun geldiği Aşağı Potocur (Arhavi) ile yerleştiği Derbent (Fındıklı) bu iki komşu ilçededir.',
        guven: 'kaynak', kaynak: ['oztürk', 'findikliWiki'] },
      { baslik: 'Osmanlı’ya katılış', anahtar: ['osmanlı ya', 'osmanlıya', 'fetih', 'fethi', '1461', 'trabzon', 'fatih'],
        metin: 'Fındıklı belediyesinin tarihçesine göre yöre, Trabzon’un 1461’de Osmanlı’ya katılmasıyla birlikte Osmanlı topraklarına girdi. Bölge yüzyıllarca Trabzon sancağı/eyaleti içinde yönetildi.',
        guven: 'kaynak', kaynak: ['findikliTarihce'] },
      { baslik: 'Osmanlı kayıtlarında bölge (1486–1583)', anahtar: ['tahrir', '1486', '1564', '1583', 'defter', 'laz kazası', 'viçe', 'sümle'],
        metin: '1486 tahririnde bölge “Lâz” / “Lâz-ı Magal” adıyla geçer; bugünkü Fındıklı köyleri (Viçe, Sümle, Pazine, Mzuğu) Arhavi ile aynı Laz kazasındadır. 1564 tarihli TT 442 numaralı defter Atina, Arhavi ve Hemşin’i, kazalar Batum sancağına bağlıyken yazar. Bu dönemde bölgedeki hâkimiyet mücadeleleri göçlere yol açmıştır.',
        guven: 'kaynak', kaynak: ['oztürk', 'findikliTarihce', 'aydin'] },
      { baslik: '17. yüzyıl: Molla Memiş’in çağı', anahtar: ['1615', '17. yüzyıl', 'göç', 'avarız', '1681', '1682', 'dönem'],
        metin: 'Molla Memiş’in Derbent’e yerleştiği kabul edilen ~1615, Osmanlı’da Sultan I. Ahmed dönemidir (1603–1617). Kenan Aydın’ın çalışmasına göre 1583 ile 1681/82 arasında Fındıklı, Arhavi, Hopa ve Gonio bölgesindeki köylerin çoğunda nüfus ve statü değişmiştir; yani bu, köyler arasında yer değiştirmenin sık olduğu bir dönemdir.',
        guven: 'kaynak', kaynak: ['aydin'] },
      { baslik: 'Viçe’den Fındıklı’ya', anahtar: ['viçe', 'fındıklı', 'adı', 'eski adı', 'ilçe', 'rize'],
        metin: 'Fındıklı’nın eski adı Viçe’dir. 1886’ya kadar karye, sonra Hopa’ya bağlı nahiye oldu; 1928 köy listesinde Viçe nahiyesinin 18 köyü arasında Derbend de sayılır. Fındıklı 1947’de ilçe oldu ve 1953’te Rize’ye bağlandı.',
        guven: 'kaynak', kaynak: ['findikliWiki', 'findikliTarihce', 'vice'] },
      { baslik: '19. yüzyıl ve Lazistan', anahtar: ['lazistan', 'sancak', 'batum', '19. yüzyıl', '1878', 'rus'],
        metin: '19. yüzyılda bölge Lazistan sancağı olarak yönetildi; merkezi önce Batum’du. 1877–78 Osmanlı-Rus Savaşı’ndan sonra Batum Rusya’ya bırakılınca Arhavi ve Hopa sınır bölgesi oldu. Kesin tarihler için kaynakça bölümündeki çalışmalara bakılmalı.',
        guven: 'genel', kaynak: ['vice'] },
      { baslik: 'Köy adlarının değişmesi (1959)', anahtar: ['potocur', 'dülgerli', 'soğucak', 'ad değişikliği', '1959', 'köy adı'],
        metin: '1959’da 7267 sayılı kanunla birçok köyün adı değiştirildi: Aşağı Potocur Dülgerli, Yukarı Potocur Soğucak oldu. Eski belgelerde köyleri ararken bu eski adlar kullanılmalı.',
        guven: 'kaynak', kaynak: ['dulgerli'] },
    ],
  },

  site: {
    ad: 'soyevrenim.com rehberi',
    aciklama: 'Sitenin nasıl kullanılacağı: ağaç, arama, öneri, hikâye, tema, kota.',
    konular: [
      { baslik: 'Rehber ne yapabilir?', anahtar: ['ne yapabilirsin', 'neler yapabilirsin', 'yardım', 'sorulara', 'soru sor', 'yanıt verebilir', 'cevap verebilir', 'nasıl kullan', 'merhaba', 'selam'],
        metin: 'Soyumuz, bölgemizin tarihi ve bu sitenin kullanımı hakkında soruları yanıtlarım. Örnekler: “Emine ile Fahri nasıl akraba?”, “Nereden geldik?”, “Molla Memiş kimdir?”, “Lazca teşekkür nasıl denir?”, “Nasıl kişi eklerim?”. Bir isim yazarsan o kişiyi ağaçta gösteririm. Akıllı asistan açıkken her soruyu anlarım; ücretsiz günlük kota dolunca bildiğim konularda yine yanıt veririm.',
        guven: 'genel', kaynak: [] },
      { baslik: 'Ağaçta gezinmek', anahtar: ['dokun', 'tıkla', 'uzun bas', 'ayrıntı', 'aile', 'gezin', 'yakınlaş', 'döndür'],
        metin: 'Bir kişiye dokununca yalnızca o ve yakın ailesi görünür. Uzun basınca (yarım saniye) ayrıntı paneli açılır. Boşluğa dokununca tüm ağaç geri gelir. Sürükleyerek döndürür, iki parmakla yakınlaşırsın. Altın çizgi senin köke uzanan soy hattındır.',
        guven: 'genel', kaynak: [] },
      { baslik: 'Kişi eklemek ve düzeltmek', anahtar: ['kişi ekle', 'ekle', 'düzelt', 'yanlış', 'hata', 'öneri', 'onay', 'değiştir', 'nasıl eklerim'],
        metin: 'Ağaca kimse doğrudan yazmaz; her değişiklik öneri olarak yöneticinin onayına gider. Yol 1: kişinin kartında (uzun bas) “Çocuk / Kardeş / Ebeveyn ekle” ya da bilgileri düzelt, sonra “Onaya gönder”. Yol 2: Rehber’e yaz — örn. “Ayşe, Fahri’nin kız kardeşi” — asistan öneriyi senin yerine hazırlar.',
        guven: 'genel', kaynak: [] },
      { baslik: 'Sesli hikâye', anahtar: ['hikâye', 'hikaye', 'ses', 'kayıt', 'anlat', 'anı', 'mikrofon'],
        metin: 'Kişinin kartında “🎙 Hikâye anlat” ile kendi sesinle anlatırsın. Kayıt saklanır, yazıya çevrilir ve anı olarak onaya gider; anıda sesi dinleyip indirebilirsin. Günlük ses kotası doluysa kayıt kaybolmaz, gece yazıya çevrilir.',
        guven: 'genel', kaynak: [] },
      { baslik: 'Giriş ve kimlik', anahtar: ['giriş', 'şifre', 'aile şifresi', 'adını seç', 'kimlik', 'yönetici'],
        metin: 'Açılışta adını seçersin; ağaç seni merkezine alır. Değişiklik önermek, sohbet etmek ve akıllı asistanı kullanmak için aile şifresiyle giriş gerekir. Şifreyi aile büyüklerinden alabilirsin.',
        guven: 'genel', kaynak: [] },
      { baslik: 'Kota ve “Ailemizin bu ayı”', anahtar: ['kota', 'hak', 'mesaj hakkı', 'ailemizin bu ayı', 'kullanım', 'ücretsiz'],
        metin: 'Asistan tamamen ücretsiz katmanda çalışır; tüm ailenin ortak günlük kotası ve kişi başı mesaj hakkı vardır, her gün 03:00’te yenilenir. Rehber’in üstündeki ince çubuğa dokununca “Ailemizin bu ayı” açılır: anlatılan hikâyeler, eklenen kişiler, ses arşivi.',
        guven: 'genel', kaynak: [] },
      { baslik: 'Görünüm ve temalar', anahtar: ['tema', 'karanlık', 'gece', 'gündüz', 'yadigar', 'yadigâr', 'renk', 'nasıl okunur'],
        metin: 'Sol menüdeki tema düğmesi yadigâr (1956 çizimine uygun kâğıt), gece ve gündüz arasında geçiş yapar. “Ağaç nasıl okunur?” kutusu renklerin anlamını açıklar: erkek, kadın, rahmetli, sen, soy hattı, evlilik, anne bağı.',
        guven: 'genel', kaynak: [] },
      { baslik: 'Kökenimiz ve araştırma', anahtar: ['köken', 'araştır', 'kaynak', 'arşiv', 'gençler'],
        metin: 'Sol menüdeki “Köken” düğmesi Fahri Arslan’ın 1956 çizimini açar. “📜 Kökenimizin hikâyesi” panelinde zaman çizelgesi, Osmanlı arşiv kayıtları ve gençler için araştırma köşesi (adım adım rehber, sözlük, kaynakça, indirilebilir dosya) var.',
        guven: 'genel', kaynak: [] },
    ],
  },

  lazca: {
    ad: 'Lazca (Lazuri)',
    aciklama: 'Selamlaşma, teşekkür, akrabalık adları ve yazım notları.',
    konular: [
      { baslik: 'Lazca hakkında', anahtar: ['lazca nedir', 'lazca hakkında', 'laz dili', 'lazuri', 'alfabe', 'hangi dil', 'lazca konuşabilir', 'lazca biliyor'],
        metin: 'Lazca (Lazuri), Kafkas dillerinin Güney Kafkas (Kartvel) koluna ait bir dildir; Gürcüce ve Megrelceyle akrabadır, Türkçeyle akraba değildir. Türkiye’de Latin harfli Laz alfabesiyle yazılır (ç̌, ǩ, p̌, t̆ gibi özel harfler). MEB’in “Yaşayan Dil ve Lehçeler” dersinde seçmeli olarak okutulur. Ağızlar arasında (Arhavi, Fındıklı, Pazar, Hopa) söyleyiş ve yazım farkları vardır.',
        guven: 'kaynak', kaynak: ['meb', 'lazenstitu'] },
      { baslik: 'Selamlaşma', anahtar: ['merhaba', 'selam', 'nasılsın', 'iyiyim', 'hoş geldin', 'görüşürüz', 'iyi akşamlar', 'iyi geceler', 'iyi günler', 'xelaǩaoba', 'xela', 'muç̌ore', 'ǩai'],
        metin: 'Merhaba: Xelaǩaoba · Nasılsın?: Muç̌ore? · İyiyim: Ma ǩai vore · Hoş geldin: Ǩai moxti · İyi günler: Ǩai dğalepe · İyi akşamlar: Ǩai lumcepe · İyi geceler: Ǩai serepe · Görüşürüz: Ǩaobate. (Yazım kaynaktan kaynağa değişir; örn. lazca.org merhaba için “Xela do K’aoba” yazar.)',
        guven: 'kaynak', kaynak: ['lazenstitu', 'lazcaOrgSelam'] },
      { baslik: 'Teşekkür', anahtar: ['teşekkür', 'sağ ol', 'didi mardi', 'mersi'],
        metin: 'Teşekkürler / sağ ol: Didi mardi. Lazca.org, Türkçedeki “teşekkür ederim”in birebir karşılığı olmadığını, “Pirito iya” da denebileceğini not eder.',
        guven: 'kaynak', kaynak: ['lazenstitu', 'lazcaOrgGunluk'] },
      { baslik: 'Akrabalık adları', anahtar: ['anne', 'baba', 'dede', 'nine', 'babaanne', 'anneanne', 'kardeş', 'abla', 'ağabey', 'amca', 'dayı', 'teyze', 'hala', 'kuzen', 'yeğen', 'akraba'],
        metin: 'Anne: Nana · Baba: Baba · Dede: P’ap’u · Nine (babaanne/anneanne): Bedi ya da Didinana · Erkek kardeş: Cuma · Kız kardeş: Da · Ağabey: Didi-cuma · Abla: Didi-da · Amca/dayı: Cumadi · Kuzen: Eksale · Yeğen: Animse. Teyze ve hala için kaynaklar farklı söylüyor (Mbula, Dadi, Bula) — büyüklerine sor.',
        guven: 'kaynak', kaynak: ['lazenstituAkraba'] },
    ],
    // "Lazca konuşalım" gibi, belirli bir konu içermeyen Lazca istekleri için karşılama
    karsilama: 'Xelaǩaoba! (Merhaba!) Muç̌ore? (Nasılsın?) — Lazcam sınırlı ama birlikte deneyelim. '
      + 'Bildiklerim: selamlaşma (Ǩai moxti = Hoş geldin, Ǩaobate = Görüşürüz), teşekkür (Didi mardi) ve akrabalık adları (Nana = anne, P’ap’u = dede, Bedi = nine). '
      + 'Bir sözcüğün Lazcasını sorabilirsin: “Lazca kardeş ne demek?” Bilmediğimi uydurmam; büyüklerimiz daha doğrusunu bilir.',
    model_notu: 'Kullanıcı Lazca yazarsa ya da Lazca yanıt isterse kısa Lazca cümleler kur ve HER ZAMAN Türkçe karşılığını ver. Lazca bilgin sınırlıdır: emin olmadığın sözcüğü uydurma; bilinen ifadeleri bu beceriden kullan, gerisini Türkçe söyle ve “Lazcam sınırlı, büyüklerine sorarsan daha doğrusunu öğrenirsin” de.',
  },
};

export const GUVEN = { kaynak: 'Kaynakta geçiyor', yorum: 'Yorum', belirsiz: 'Teyit gerekli', genel: 'Genel bilgi' };

function norm(s) {
  return String(s || '').toLocaleLowerCase('tr').replace(/[’'`]/g, ' ').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
}

// Sorguya en uygun konular (puanlı). beceri verilirse yalnız o modülde arar.
export function uzmanAra(sorgu, beceri, adet = 2) {
  const q = ` ${norm(sorgu)} `;
  if (!q.trim()) return [];
  const sonuc = [];
  for (const [ad, b] of Object.entries(BECERILER)) {
    if (beceri && beceri !== ad) continue;
    for (const k of b.konular) {
      let puan = 0;
      for (const a of k.anahtar) {
        const n = norm(a);
        if (!n) continue;
        if (q.includes(` ${n} `)) puan += 3 + n.split(' ').length;          // tam sözcük/öbek
        else if (n.length >= 4 && q.includes(` ${n.slice(0, Math.max(4, n.length - 2))}`)) puan += 2; // ek almış hâl (eklerim, adı…)
      }
      if (puan > 0) sonuc.push({ beceri: ad, beceriAdi: b.ad, ...k, puan });
    }
  }
  return sonuc.sort((x, y) => y.puan - x.puan).slice(0, adet);
}

// Model için kısa çıktı (kaynak adlarıyla)
export function uzmanBilgi(sorgu, beceri) {
  const l = uzmanAra(sorgu, beceri, 3);
  return {
    beceri: beceri || null,
    konular: l.map((k) => ({ beceri: k.beceriAdi, baslik: k.baslik, bilgi: k.metin, guven: GUVEN[k.guven],
      kaynak: (k.kaynak || []).map((x) => BECERI_KAYNAKLARI[x]?.ad).filter(Boolean).join('; ') || undefined })),
    lazca_notu: (!beceri || beceri === 'lazca') ? BECERILER.lazca.model_notu : undefined,
    not: l.length ? undefined : 'bu konuda kayıtlı bilgi yok; bilmediğini söyle',
  };
}

// Lazca yazılmış mı? (Laz alfabesinin özel harfleri ya da bilinen sözcükler)
export function lazcaMi(metin) {
  const t = String(metin || '');
  return /[ǩǯʒ]|ç̌|p̌|t̆|k̆/i.test(t) || /\b(xela|muç̌?ore|didi mardi|ǩai|kai moxti|nana|p'?ap'?u)\b/i.test(t);
}
