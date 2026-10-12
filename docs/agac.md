# Ağaç servisi — `api/agac.js`

Ortak soy ağacı (kişiler, bağlar, evlilikler, anne bağları ve **profiller**: fotoğraf, bilgiler, anılar)
tek JSON olarak `agac` tablosunda (id = 1). Her kayıt `gunluk` tablosuna da yazılır (geri alma).

## Uç

| İstek | Yetki | Yanıt |
|---|---|---|
| `GET /api/agac` | herkes | `{ok, veri, guncelleme, guncelleyen}` |
| `POST /api/agac` `{veri, onceki, guncelleyen, jeton}` | yalnız **yönetici** | `{ok, guncelleme}` · oturum geçersiz `401` · aile üyesi `403` (öneri yolu) · **`409` çakışma** + `{veri, guncelleme, guncelleyen}` |

Ek adımlar (aile üyesine açık, küçük ve sınırlı yazım — tam ağaç yazımı yine yalnız yönetici):

| Adım | Ne yapar | Ayrıntı |
|---|---|---|
| `POST ?adim=kayit` | Ağaçta olmayan aile üyesi kendini mevcut bir kişiye bağlayarak ekler | `docs/giris.md → Kayıt` |
| `POST ?adim=medya` | Profil fotoğrafı / galeri öğesini onaysız işler | `docs/medya.md → Onaysız kayıt` |

İkisi de `agacYamala`: güncel sürümü okur, değişikliği uygular, koşullu yazar (arada kayıt olduysa
`KAYIT.deneme` kez yeniden dener), `gunluk`'e yazar.

## Cihazlar arası eşitleme (istemci)

- **Yönetici** düzenleyince `cloudSave()` ağacı 1,2 sn sonra kaydeder. İstek `yetkiliIstek()` ile gider:
  oturum düşmüşse (`401`) şifre penceresi açılır, girişten sonra kayıt yeniden denenir.
  Kayıt başarısızsa **uyarı gösterilir** ("⚠ Kaydedilemedi … değişiklik yalnızca bu cihazda").
  Eskiden hata sessizdi: düzenleme yalnız o cihazda kalıyor, diğer cihazlara hiç gitmiyordu.
- Kaydın yanıtındaki `guncelleme` saklanır; cihaz kendi kaydını "yeni sürüm" sanıp yeniden yüklemez.
- **Aile üyesi** düzenlemesi öneri olur (`pendingChanges`); "Onaya gönder" ile `api/oneri`'ye gider.
- **Yoklama** (`bulutYokla`, 30 sn + sekmeye dönünce): sunucuda daha yeni sürüm varsa ağaç **ve
  profiller** (`absorbCloudProfiles`) yeniden yüklenir. Eskiden yalnız ağaç yapısı geliyordu; fotoğraf
  ve bilgi değişiklikleri ancak sayfa yenilenince görünüyordu.
- Yoklama yalnızca yerelde kaydedilmemiş iş varken bekler: yöneticide kayıt sürerken, aile üyesinde
  gönderilmemiş öneri varken. Eskiden her düzenleme `dirty` bırakıyordu ve o cihaz bir daha hiç
  eşitlenmiyordu.

## Çakışma: iki cihaz aynı anda düzenleyince

Ağaç bütün olarak kaydedildiği için eskiden **son kaydeden kazanıyordu**: eski kopyası açık duran
cihaz (ör. bilgisayar), başka cihazda (mobil) yüklenen fotoğrafı geri alıyordu.

- İstemci kaydederken elindeki sürümü (`onceki` = son `guncelleme`) gönderir. Sunucu yalnızca sürüm
  tutuyorsa yazar (`date_trunc('milliseconds', guncelleme) = onceki`); değilse **409** + güncel veri.
- İstemci **üç yönlü birleştirir** (`agacBirlestir(taban, yerel, sunucu)`, `api/_lib/agac.js`):
  taban = son eşitlenen sunucu sürümü (`CLOUD.taban`), yerel = kendi ekranı, sunucu = güncel.
  Yalnızca yerelde tabana göre **değişen** alanlar sunucunun üstüne işlenir — her derinlikte
  (kişi → profil → bilgi). Listeler (anılar, galeri) küme olarak birleşir: iki cihazın eklediği de kalır.
  Boş değerler ("", {}, []) "yok" sayılır (varsayılan boş profil gerçek fotoğrafı silmez).
- Birleşmiş hâl ekrana uygulanır, en çok 3 deneme ile yeniden kaydedilir; kullanıcıya
  "iki değişiklik birleştirildi" denir. `onceki` göndermeyen eski istemci koşulsuz yazar.

## Kimlik

Ağaçtaki her kişinin kalıcı bir **id**'si var (örn. `p12222123`; kişi kartında görünür). Giriş ise
ortak aile/yönetici şifresiyledir; "ben kimim" (`kok_ben`) her cihazda bir kez seçilir (bkz. `docs/giris.md`).

## Nesil

Nesil = ana köke (Molla Memiş, 0) uzaklık. Kök, alt ağacı **en büyük** köksüz kişidir (eşin
babası gibi dünür ataları da köksüz görünür). Ana soydan sonra yayılım: **eş aynı nesil**,
ebeveyn bir üst, çocuk bir alt. Böylece kişi, eşi ve eşinin kardeşleri aynı nesil; dünür anne-baba
bir önceki, onların çocukları bir sonraki nesildir.

- İstemci: `reindex()` → `n._depth`, gösterim `nesilOf(n)` (kartlar, arama, Çınar yanıtları).
- Sunucu: `api/_lib/agac.js → nesilHaritasi(g)` / `nesil(g, id)` (grafta önbellekli).
- Eskiden yalnız baba zinciri sayılıyordu: eşin kardeşi "1. nesil" görünüyordu. Test: `test/agac.test.mjs`.

## Kural: anne-babası aynı iki kişi aynı adı taşıyamaz

Aynı baba (`edges`) ve aynı anne (`motherEdges`) altında aynı adlı iki kardeş, aynı kişinin iki kaydıdır.
`ayniAdliKardesler(veri)` / `yeniKardesIhlali(eski, yeni)` (`api/_lib/agac.js`).

- Ad karşılaştırması harf/aksan duyarsız; **sıra numarası korunur**: ağaçta aynı adlı kardeşler
  sonlarına sayı alarak ayrılır (`Hasan1`, `Hasan2` — ekranda ikisi de "Hasan"; eskiden küçük yaşta
  ölen çocuğun adı sonraki kardeşe verilirdi). Sayıyla ayrılmış adlar farklıdır.
- Kural dışı: anne-babası hiç bilinmeyenler, "Yeni kişi" taslağı, farklı anneden kardeşler (her ikisinin annesi kayıtlıysa).
- Uygulandığı yerler: yönetici kaydı (`POST /api/agac` → `400 {kural:'ayni-ad-kardes', catisma}`),
  öneri gönderme (`/api/oneri?adim=gonder`), kayıt ve medya yamaları (`agacYamala` → `409`),
  istemcide kişi kartında ad girilince (ihlalde ad eski hâline döner, uyarı çıkar).
- **Yalnız YENİ ihlal engellenir**: veride zaten olan kopyalar kaydı kilitlemez; yönetici onları
  "Birleştir" ile temizler ya da sıra numarası ekler.

## Aynı kişinin iki kaydını birleştirme (yönetici)

Örn. "Nevin Kaya" (Celal Kaya kızı) ve "Nevin Arslan (Kaya)" (Fahri Kaan'ın annesi). Kişi kartında
yöneticiye **"⇄ “X” ile aynı kişi mi? Birleştir"** önerisi çıkar (`olasiKopyalar`: aynı ilk ad, aynı
cinsiyet; babaları farklı adaşlar önerilmez). Pencerede hangi adın kalacağı seçilir.

- `kisiBirlestir(veri, tutId, silId)`: baba/anne/evlilik bağları taşınır (tekrar ve kendine bağ
  oluşmaz; bir çocuğa iki baba düşerse tutulanınki kalır), profil birleşir (tutulanın dolu alanı
  kalır, boşsa silinenin; galeri/anılar toplanır), başkalarının eş yazıları ve `kin` bağları güncellenir.
- Kayıtta aynı TAM adla (ad+soyad) evlenmemiş biri varsa ikinci kişi açılmaz, evlilik o kişiye bağlanır
  (`kayitEkle`; çift kayıt böyle oluşuyordu).
- Test: `test/agac.test.mjs`, `test/kayit.test.mjs`.

## Çift kayıtlar ekranı (veritabanı temizliği, yönetici)

Hesap menüsü → **🧹 Çift kayıtlar (N)** ya da Çınar'a "çift kayıtları bul". `ciftKayitlar(veri)` iki tür çift bulur:

| Tür | Ölçüt |
|---|---|
| `kural` | Anne-babası, cinsiyeti ve adı aynı (sıra numarası farklı ad sayılır) |
| `tam-ad` | Ad + soyad sözcükleri biri ötekinde tümüyle geçiyor ("Nevin Kaya" ⊂ "Nevin Arslan (Kaya)"), aynı cinsiyet, babaları çelişmiyor |

Tek sözcüklü adaşlar (çok sayıda Mehmet, Ali) ve farklı babalılar önerilmez. Her çift için:
**⇄ Birleştir** (hangi ad kalsın penceresi) ya da **Farklı kişiler**: `kural` çiftinde ikinci kayda ilk boş
sıra numarası eklenir (Ali → Ali2; ekranda yine "Ali"), `tam-ad` çiftinde bu tarayıcıda gizlenir
(`localStorage.kok_cift_farkli`). Farklı cinsiyetteki kayıtlar asla birleştirilmez (kız ve oğlan aynı adı taşısa da ayrı kişidir).
Canlı veritabanı yalnız bu ekrandan (yönetici oturumuyla) temizlenir; işlemler `gunluk`'e yazılır, geri alınabilir.

## Veri denetimi (yönetici)

Hesap menüsü → **🩺 Veri denetimi (N önemli)** ya da Çınar'a "saçmalıkları bul" / "veri denetimi".
`veriDenetimi(veri)` bulguları önem sırasıyla listeler; ekran yalnız gösterir, kişinin adına dokununca kartı açılır.

| Tür | Önem | Ne yakalar |
|---|---|---|
| `kirik-bag` | önemli | Bağın bir ucu ağaçta yok |
| `es-adi-uyusmuyor` | önemli | Evli olduğu kişinin kaydındaki eş adı farklı — ad yanlışlıkla değişmiş olabilir ("Yüksel" → "Nurten") |
| `anne-erkek` / `anne-alani` | önemli | Anne olarak erkek bağlı (çoğu zaman babanın kendisi; gerçek anne bağlanmamış) |
| `ayni-profil` | önemli | Aynı fotoğraf+meslek bilgisi iki kişide (yanlış kişiye kopyalanmış) |
| `dongu`, `kendisiyle-evli` | önemli | Kendi atası / kendisiyle evli |
| `cift-kayit` | önemli/orta | Çift kayıt adayları (bkz. Çift kayıtlar) |
| `es-bagsiz`, `ayni-foto`, `dogum-yili` | orta | Eş yazısı var ama evlilik bağı yok; aynı fotoğraf; ebeveynle çocuk arasında `DENETIM.ebeveynMinYas` yıldan az |
| `kin-yanlis`, `rol-etiketi`, `bagsiz-kisi`, `taslak-ad` | küçük | Eş göstergesi yanlış; kızın çocuğunda rol "baba" yazılı; bağsız kişi; "Yeni kişi" |

Kızların çocuklarının annelerinin altında çizilmesi (1956 çizimindeki gibi) hata sayılmaz.
**Güvenli düzeltmeler** (`guvenliDuzelt`): yalnız kesin yanlışlar — bir erkeğin aynı çocuğun hem babası hem
"annesi" yazılması; anne bağı ve anne alanı silinir, başka hiçbir şeye dokunulmaz.

Önleyici düzeltmeler:
- **Ad koruması:** kişinin kartındaki "Ad" kutusunda ad tamamen başka bir ada dönerse onay sorulur
  (kişi aramak isteyen biri bu kutuya yazınca kişinin adı değişiyordu). Küçük düzeltmeler sormaz.
- **Bulut esas:** bulut modunda profiller yalnız sunucudan gelir; tarayıcıda kalmış eski profiller atılır
  (eskiden birleştiriliyordu: bir id başka kişiye geçtiyse eski foto/meslek yanlış kişide görünüyor ve
  yöneticinin kaydıyla sunucuya yazılıyordu).

## Öz-denetim (her kayıtta)

Onay kuyruğu yok: aile şifresiyle giren doğrudan kaydeder (tek sınır: tek kayıtta `AILE.silmeMax`'tan fazla
kişiyi yalnız yönetici siler). Bu yüzden sistem her kayıtta kendini denetler — `api/_lib/denetim.js`:

1. **Damga:** yeni kişiye `ekleyen`, değişen kişiye `duzenleyen` = `{kisi, ad, zaman}` (sunucu yazar; istemci
   göndermese de eskiden korunur). Kişinin kartında "ekleyen: Ali · son değiştiren: Veli" görünür.
2. **Çelişki:** bu kaydın getirdiği YENİ denetim bulguları (`veriDenetimi` farkı; önem `DENETIM_UYARI.onemler`)
   ve başkasının girdiği bilginin değişmesi (ad, cinsiyet, yaşam durumu, doğum/meslek…, fotoğraf).
3. **Uyarı:** kaydedene yanıtta (`uyarilar`) → "⚠ Kaydedildi — ama bir çelişki olabilir" penceresi.
   İlgili öteki kişilere (ilk ekleyen / son değiştiren) `uyari` tablosuna hatırlatma + varsa telefonlarına push;
   girişte "⚠ Eklediğin bilgilerle ilgili N hatırlatma" penceresi, "Tamam, gördüm" ile okundu.

Hiçbir şey kendiliğinden düzeltilmez. Uçlar: `POST /api/agac?adim=uyarilar {jeton}`, `?adim=uyari-okundu {jeton, ids?}`.
Tam kayıt, kayıt/medya yamaları ve "✓ Ağaca işle" (öneri) aynı denetimden geçer. Tablo: `uyari` (`sql/uyari.sql`).
Ayarlar `api/_lib/ayar.js → DENETIM_UYARI`, `AILE`. Test: `test/denetim.test.mjs`.

## Onay yok (aile güvenilir)

- Aile şifresiyle giren herkes kişi ekler, bilgi düzeltir, fotoğraf yükler, kayıt birleştirir — hemen kaydedilir.
- Çınar'ın hazırladığı değişiklik: model kendiliğinden yazmaz; kişi "✓ Ağaca işle"ye dokununca işlenir
  (`/api/oneri?adim=karar`: önerinin sahibi ya da yönetici).
- Sesli hikâye: anı doğrudan karta; hikâyede geçen yeni kişiler öneri olarak "📥 Önerilerim"de.
- Yönetici araçları (veri denetimi, çift kayıtlar, toplu silme, kişisel bağlantı) yöneticide kalır.

## Ortam değişkenleri

`DATABASE_URL`, `OTURUM_GIZLI`.
