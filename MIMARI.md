# KÖK · Soy Evrenim — Mimari ve Karar Notları

Bu belge **ne yapıldığını değil, neden öyle yapıldığını** anlatır. Kod ne olduğunu
zaten söylüyor; kaybolan şey gerekçe. Bir şeyi "sadeleştirmek" istediğinde önce
buraya bak — çoğu tuhaf görünen tercih, denenip başarısız olmuş bir alternatifin
sonucu.

Tek uygulama dosyası: `public/index.html` (~163 KB, kütüphanesiz, tek `<script>`).

---

## 1. En önemli tuzak: hangi yerleşim çalışıyor?

Kodda **iki** yerleşim fonksiyonu var:

| Fonksiyon | Durum |
|---|---|
| `layoutRadial()` (satır ~652) | **ETKİN OLAN.** Her yol bunu çağırıyor. |
| `layoutSpiral()` (satır ~790) | Ölü sayılır. `loadGraph()` çağırıyor ama hemen üzerine yazılıyor. |

Akış şöyle: `loadGraph()` → `layoutSpiral()`, ardından `cloudLoad` / yoklama /
`reparent` / `startAs` yollarının **hepsi** `layoutRadial()` çağırıp bütün
konumları eziyor.

> **Bu belgedeki en pahalı ders:** `layoutSpiral()` iki tur boyunca düzeltildi,
> canlıda hiçbir şey değişmedi. Yerleşimle ilgili bir şey değiştirecekseniz
> `layoutRadial()` içinde değiştirin. `resize()` de bir ara yanlışlıkla
> `layoutSpiral()` çağırıyordu; telefon çevrilince ağaç başka bir algoritmaya
> atlıyordu.

`layoutSpiral()` neden silinmedi: `loadGraph` üzerinden hâlâ çağrılıyor ve
`SPIRAL_OF` / `SPIRAL_NAME` / `SPIRAL_ANCESTORS` haritalarını da o kuruyor —
kol renkleri ve kol filtresi bunlara bağlı. Silmek için önce o haritaların
üretimini ayırmak gerekir.

---

## 2. Yerleşim: kama payı, eşit aralık, halka mesafesi

Üç kural birbirine bağlı; birini bozmadan diğerini değiştirmek zor.

### 2.1 Kama payı = alt ağacın en kalabalık nesli (`_need`)

Eskiden **yaprak sayısı** (`_w`) kullanılıyordu. Yanlış ölçüydü: 20 yaprağı tek
nesilde toplanmış bir alt ağaç ile aynı 20 yaprağı dört nesle yaymış bir alt ağaç
aynı genişliği alıyordu — ikincisi hiçbir nesilde 7 kişiyi geçmediği hâlde.

Doğru ölçü `_need`: alt ağacın **herhangi bir neslindeki en yüksek kişi sayısı**.
Nesil profili (`_lvl`) alttan yukarı hesaplanır, `_need = max(_lvl)`.

### 2.2 Sıkışma açıyla çözülür, yarıçapla DEĞİL

**Halka yarıçapına dokunulmaz.** `ringRadius(d) = d * RING_GAP` (RING_GAP=130),
sabit. Nesiller arası mesafe ayrı bir tasarım kararıdır.

Bir ara `RING_R_OVR` diye bir mekanizma vardı: kalabalık nesillerde halkayı
büyütüyordu. Kaldırıldı, çünkü (a) nesiller arası mesafeyi bozuyordu, (b) gereksizdi:

```
8. nesil yarıçapı 1040 → çevre ~6530 birim
42 birim aralıkla 155 kişi sığar; orada ~60 kişi var
```

Yer bol. Sorun kamaların adaletsiz bölüşülmesiydi, dar çevre değil.

Sıkışma yerine **halka üzerinde açısal itekleme** ile çözülür: her halkada
düğümler açıya göre sıralanır, soldan sağa ve sağdan sola geçişlerle minimum açı
farkı (`MIN_SEP / R`) zorlanır. Klasik 1B çakışma giderme — **sırayı bozmaz,
kaydırmayı en küçük tutar**. Toplam kaydırma ortalanır ki halka bir yöne kaymasın.

### 2.3 Neden "nesli daireye eşit yay" DEĞİL

Denendi ve geri alındı. Nesli kama içinde eşit yaymak sıkışmayı bitiriyordu ama
**ebeveyn–çocuk yakınlığını yok ediyordu**: çocuk, ebeveyninin altında değil
neslin sırasında rastgele bir yere düşüyordu (somut şikâyet: "oğlum Fahri Kaan
bana çok uzakta"). Şimdi herkes atasının kamasının ortasında duruyor.

Tam daireye eşit dağıtım ayrıca kol yapısını da dağıtırdı: kollar bitişik
damarlar olarak okunmalı, kardeşler çemberin dört bir yanına saçılmamalı.

### 2.4 `MIN_SEP = NODE_R * 4`

Aralarında **bir çap** boşluk olsun: yarıçap R, çap 2R, kenar-kenar boşluk 2R,
merkez-merkez = R + 2R + R = **4R**. (Eski talimatta "3*r" yazıyordu ama hemen
ardından "çap × 2" diyordu; 4R doğrusu. 3R ile boşluk yarım çap kalıyor.)

### 2.5 `cakismaCoz()` — güvence katmanı

Yerleşimden sonra 60 tura kadar gevşetme. O(n²) yerine uzamsal ızgara (göz =
`MIN_SEP`). İtmeden sonra her düğüm **kendi halka bandına geri kırpılır**:
çakışma çoğunlukla açısal çözülür, kimse başka nesle kaymaz. Kök (`_pin`)
oynamaz. **Rastgelelik yok** — aynı veri aynı yerleşimi verir.

---

## 3. İzdüşüm: koni ve düzlem

`project(wx, wy, h)` → yaw ile döndür, perspektif uygula, `TILT` ile dikeyde ez.

| Sabit | Değer | Ne yapar |
|---|---|---|
| `TILT` | 0.62 | kamera eğimi (diske yukarıdan bakış) |
| `CAM_DIST` | 1400 | perspektif gücü |
| `DEPTH_K` | 0.9 | derinlik→ölçek etkisi |
| `CONE_H` | 155 | nesiller arası dikey mesafe |

**Düzlem modu (`duzMod`) perspektifi ve eğimi KAPATMAZ.** Yalnızca `coneMode`'u
kapatır → `nodeHeight()` 0 döner, nesiller tek düzleme iner.

Bir denemede tam düz (tepeden dik) izdüşüm yazıldı; teknik çizim gibi durdu ve
istenen his kayboldu. İstenen görünüm: **"belli bir açıyla yukarıdan güneş
sistemine bakmak"**. Bu yüzden eğim ve perspektif her iki modda da uygulanır ve
düzlem modunda da yatay sürükleme diski döndürür (yaw) — o his kasten korunuyor.

---

## 4. `zoomK()` tabanı neden 0.28

```js
function zoomK(){ return Math.max(0.28, Math.min(3.4, scale)); }
```

Düğüm yarıçapı bu çarpanla ölçeklenir. Taban **0.5 iken aralık garantisi
ekranda bozuluyordu**: uzaklaşınca dünya mesafeleri `scale` ile küçülürken
düğümler 0.5'te takılıp küçülmüyordu. Açılış `fit()` zoom'u (~0.35) tam o bölgeye
düşüyor:

```
aralık 42 × 0.35 ≈ 15 px
çap    2 × 10.5 × 0.5 ≈ 10 px      ← taban yüzünden küçülmedi
boşluk ≈ 5 px  (bir çap, yani 10 px olmalıydı)
```

Taban 0.28 ile düğümler mesafeyle birlikte küçülüyor, boşluk açılış görünümünde
de korunuyor; genel bakışta hâlâ görünür kalıyorlar.

Üst sınır 3.4: en yakın zoom'da ekranı kaplamasın.

**Uyarı:** garanti orta zoom bandında geçerli. Çok uzakta (scale 0.15) düğümler
yine değebilir; bu, tabanın var olmasının kaçınılmaz bedeli (taban olmasa
düğümler tamamen kaybolurdu).

---

## 5. Görünürlük ve parlaklık: tek hat

Dört Bloom özelliği ve kol filtresi aynı iki fonksiyondan geçer. **Yeni bir
filtre eklerken buraya ekleyin**, çizim döngüsüne dağıtmayın — çakışma buradan
doğar.

```js
nodeVisible(n)  // kademeli açılım ∩ nesil aralığı  → çizilir mi?
nodeAlpha(n)    // kol filtresi + odak + yol + arama → ne kadar parlak?
```

Çizim, **tıklama isabeti (`pick`)** ve **`fit()`** aynı `nodeVisible` kuralını
kullanır: gizli düğüm çizilmez, tıklanmaz, kadraja girmez. Üçünden birini
atlarsanız "görünmeyen şeye tıklanıyor" ya da "boş alana zoomlanıyor" hatası çıkar.

Derinlik soluklaştırması (`depthAlpha`) `nodeAlpha`'dan **ayrı** çarpan olarak
kalır — o 3B his, filtre değil.

---

## 6. Bloom özellikleri

| Özellik | Nerede | Not |
|---|---|---|
| Yol bulma | `shortestPath` (BFS), `lcaOf`, `akrabalikEtiketi` | `ADJ` yönsüz; eşler de komşu sayılır |
| Kademeli açılım | `BLOOM.visible`, `expandNode`/`collapseNode` | **varsayılan kapalı**, `?kademeli=1` ile açılır |
| Odak modu | `odakAc`/`odakKapat` | düğmeyle açılır; açıkken seçim onu takip eder |
| Nesil kaydırıcısı | `genUygula`, `BLOOM.genLo/genHi` | çift uçlu, canlı sayaç |

Graf katmanı `reindex()` sonunda `buildGraphHelpers()` ile tazelenir:
`ADJ` (yönsüz komşuluk), `CHILDREN`, `PARENTS`.

**Bilinçli sapmalar (talimattan):**

- **Kademeli açılım varsayılan kapalı.** Canlı aile sitesinde açılışta yalnızca
  kök + 1. nesil göstermek ziyaretçiyi şaşırtır. `?kademeli=1` ile denenebilir.
- **Odak modu seçimle kendiliğinden açılmaz.** Her tıklamada ekranın sönmesi
  mevcut gezinmeyi bozuyordu. Çift tık ise **merkeze al + odak** yapar.
- **Görünürlük değişiminde yerleşim yeniden hesaplanmaz**, sadece `fit()`.
  Yeniden hesaplamak her açılışta ağacın şeklini değiştirirdi.

---

## 6b. Kişi kartı içeriği

İki kart aynı bilgiyi gösterir: **hover kartı** (`updateHoverCard`) ve **sağ üst
sabit kart** (`showActiveCard`).

Eş/çocuk satırı **tam cümle** olarak yazılır, kısaltma ve ikon yok:

| Durum | Çıktı |
|---|---|
| eş + çocuk | `Nevin Kaya ile evli, 1 çocuğu var` |
| yalnız eş | `Nevin Kaya ile evli` |
| yalnız çocuk | `1 çocuğu var` |
| ikisi de yok | satır hiç gösterilmez |

Tek kaynak: **`esCocukCumlesi(n)`**. Eskiden `⚭ Ad · N çocuk` biçimi iki kartta
ayrı ayrı kuruluyordu; biçim değişince ikisini birden güncellemek gerekiyordu.

Ayrıntılar:
- Türkçede sayıdan sonra ad tekil kalır: 1 de 3 de **"çocuğu var"**.
- Eş adından `" (aileden)"` eki temizlenir; birden fazla eş `" ve "` ile bağlanır
  (bu veride çoklu eş yok, dal pratikte sınanmadı).
- Çocuk sayısı = baba hattı + **yalnızca** anne hattından gelenler; çift sayma yok.

## 6c. Rehber (açılış karşılaması + komut çipleri)

Dock'taki **?** düğmesi. Açılışta bir kez kendiliğinden görünür:

- **ilk ziyaret** → tam karşılama (projeyi tanıtır, ne yapabileceğini söyler)
- **sonraki ziyaretler** → kısa selam. Bayrak: `localStorage.kok_rehber_gorildi`
- karşılama ekranı ("Bu evrene kim bakıyor?") kapanana kadar **bekler** (800 ms
  aralıkla yoklar). Tek `setTimeout` ile vazgeçilirse karşılamadan geçen
  kullanıcı rehberi hiç görmüyordu.
- panel dışındaki ilk etkileşimde (tık/tekerlek/klavye) kendini kapatır

### LLM YOK — yerel kural tablosu

Talimat mevcut bir AI diyaloğunu (`KOMUTLAR` / `diyalogGonder` / `yurut`)
varsayıyordu; **bu kod tabanında öyle bir sistem yoktu** (talimat başka bir
sürüm için yazılmış, `kok-spiral` talimatları gibi). LLM de kurulmadı:

- ücretsiz katmanda kalma kısıtı var (§12), LLM çağrısı maliyet demek
- gerek de yok: çiplerin hepsi **zaten var olan** işlevlere denk düşüyor

`KOMUTLAR` = `{desen (regex), calistir()}` listesi. Sıra önemli: özel desenler
önce, en sonda "her şeye uyan" isim araması. Komutlar mevcut işlevleri çağırır
ya da ilgili dock düğmesini tıklar — paralel bir sistem kurulmadı.

| Komut | Yapar |
|---|---|
| "Yüksel'i göster" | `rehberKisiBul` → `selectNode` + `merkezeAl` |
| "Emine ile Fahri nasıl akraba?" | `yolBul(a,b)` |
| "Yaşayanları göster" | `.lensOpt[data-lens="alive"]` tıklar |
| "İstatistikleri aç" | `#statsBtn` tıklar |
| "Kökenimizi göster" | `#kokenBtn` tıklar |
| "3–6 nesil" | `genUygula(3,6)` |
| "tümünü göster" | filtreleri sıfırlar |

`rehberKisiBul()`: tam eşleşme > baştan eşleşme > içinde geçen. Adaş varsa nesli
en küçük olan (en eski) seçilir — 37 tekrarlı ad var (§10), bu kaçınılmaz bir
tercih; kullanıcı üst bar aramasından ebeveyn adına bakarak daraltabilir.

Yanıtlar kısa onay biçiminde: "Yüksel getirildi — 7. nesil · Nevin Kaya ile
evli, 1 çocuğu var."

## 7. Etkileşim modeli

```
tık (moved ≤ TAP_SLOP, süre ≤ TAP_TIME) → seç + merkeze yaklaştır
çift tık                                → merkeze al + yakınlarını göster
merkezdeyken tekrar dokun               → düzenleme paneli
uzun bas (~450ms, kademeli açılımda)    → alt ağacı aç/kapat
sürükleme                               → pan / yaw döndürme
iki parmak                              → pinch zoom
```

`TAP_SLOP=10 px`, `TAP_TIME=600 ms`.

### iOS Safari: `movementX` tuzağı

**Pan iPhone'da hiç çalışmıyordu, Android'de çalışıyordu.** Sebep `e.movementX` /
`e.movementY` kullanmaktı:

- Bunlar Pointer Lock API'sine ait; Chrome dokunma kaynaklı pointer olaylarında
  da hesaplar, **WebKit pointer lock dışında 0 döner**.
- Sonuç: iOS'ta `moved` hiç artmıyor → `moved > TAP_SLOP` hiç doğru olmuyor →
  pan hiç başlamıyor. Dokunma seçimi ise `moved` 0 kaldığı için çalışmaya devam
  ediyordu; "tıklama oluyor ama kaydırma olmuyor" tablosu buradan geliyor.

**Kural: pointer olaylarında `movementX/Y` kullanma.** Delta `clientX/clientY`
farkından hesaplanır (`sonPX`/`sonPY`); her tarayıcıda çalışır ve ayrı bir touch
kod yolu gerektirmez.

Ek sertleştirmeler (aynı düzeltmeyle birlikte):

- Tüm `touch*` dinleyicileri **`{passive:false}`**. iOS Safari onları varsayılan
  passive sayar ve passive dinleyicide `preventDefault()` sessizce yok sayılır.
- `html,body { overscroll-behavior:none }` — iOS lastik-bant kaydırması dokunma
  olaylarını canvas'tan çalabiliyor.
- Canvas'ta `-webkit-tap-highlight-color:transparent`, `user-select:none`,
  `-webkit-touch-callout:none` — uzun bas bizim jestimiz, sistem menüsü
  araya girmesin.

**Ayrı touch kod yolu eklenmedi** (talimat öneriyordu). Pointer olayları düzeltmeden
sonra üç platformda da çalışıyor; ikinci bir sistem eklemek Android ve masaüstünde
çift işleme riski doğurur — talimatın kendi 6. maddesi de bu riski söylüyor.

**Viewport `user-scalable=no` yapılmadı** (talimat öneriyordu): sayfa genelinde
yakınlaştırmayı kapatmak erişilebilirlik gerilemesi olur. Canvas'ta zaten
`touch-action:none` var, panellerde metin büyütmek gerekebilir.

**Düğüm sürükleme kaldırıldı.** Mobilde parmağı düğüme değdirince düğüm
yakalanıyor ve taşınıyordu. Kalıcı bir kayıp yok: konumlar hiçbir yere
yazılmıyor (`currentGraphJSON` `x`/`y` göndermez), her yüklemede yeniden
hesaplanıyor — sürükleme sayfa yenilenince zaten kayboluyordu. `dragNode`
değişkeni artık yalnızca "basılan düğüm" referansı.

---

## 8. Veri ve tek doğruluk kaynağı

**Tek kaynak: Neon.** `agac` tablosunda `id=1` satırında tek JSON.

Gömülü `GRAPH` sabiti (244 kişi, 58 KB) `index.html`'den **kaldırıldı**. Sebep
sadece boyut değildi: o kopya **bayatlamıştı** — cinsiyet düzeltmesi öncesi hâli
taşıyordu (Bedriye baba konumunda). Sayfa açılışta onu çizip sonra bulut üstüne
yazıyordu, yani tutarsızlık kaynağıydı.

Gömülü yedek kalmadığı için iki koruma var:
- `tohumla()` **boş ağacı buluta yazmaz** (yoksa veriyi silerdi)
- bulut erişilemezse sessiz boş ekran değil, uyarı gösterilir

Yedekler depoda: `agac-verisi-yukle.sql`, `yedek-cinsiyet-oncesi.json`.
Ayrıca Neon `gunluk` tablosunda `guncelleyen='cinsiyet-duzeltmesi-oncesi'`.

### Alan anlamları (veriden çıkarıldı, tahmin değil)

| Alan | Anlamı |
|---|---|
| `edges` | ana soy bağı: ebeveyn → çocuk |
| `parentRole` | **çocuğun** ağaca hangi ebeveyn üzerinden bağlandığı (`baba`/`anne`) |
| `motherEdges` / `mother` | ikinci ebeveyn bağı (birbirinin aynası) |
| `sex` | `E`/`K`, 244 kişinin tamamında dolu |

> `parentRole` **"bu kişi anne/babadır" demek DEĞİL.** İlk cinsiyet denetimi bu
> yanlış okumayla yapıldı ve 15 çelişki bildirdi; 10'u yanlış alarmdı. Doğru
> okumayla gerçek sayı 5 çıktı. Bkz. `cinsiyet-rapor.md`.

---

## 9. Yetki modeli

Giriş **aile şifresi** ile: `/api/giris` şifreyi kontrol eder, HMAC-SHA256 imzalı
oturum jetonu verir (30 gün). Ortam değişkenleri: `AILE_SIFRESI`, `ADMIN_SIFRESI`,
`OTURUM_GIZLI`. SMS/Twilio **tamamen kaldırıldı**.

```
aile jetonu  → öneri gönderme + sohbet
admin jetonu → onaylama + doğrudan düzenleme
```

`api/agac.js` POST **yalnızca admin jetonu** kabul eder. Aile üyesinin hiçbir
değişikliği doğrudan ağaca yazılmaz; "Onaya gönder" ile `/api/oneri`'ye öneri
olur ve yönetici onayından geçer.

### `kimlikId()` neden var

`sessionKisiId` SMS döneminden kalma: giriş bir **kişiyi** doğruluyordu. Aile
şifresi sisteminde kişi kimliği yok, bu yüzden değişken **hiç atanmıyor** — ama
üç yerde kimlik kaynağı olarak kullanılıyordu ve şu hatalara yol açıyordu:

- `editorId` bulut açıkken her zaman `null` → **aile üyeleri hiçbir şeyi
  düzenleyemiyordu** (karşılama ekranının vaadinin tersi)
- sohbete yazamıyorlardı, hata metni "telefonla giriş yap" diyordu
- aile üyesinin mesajı **"Yönetici" imzalı** görünüyordu

`kimlikId()` = `sessionKisiId || (jeton varsa viewerId)`. **Jeton koşulu şart:**
`viewerId` yalnızca isim seçmekle doluyor, şifre istemiyor. Koşul olmadan şifre
girmemiş biri düzenleme alanlarını açık görüyordu — değişiklikleri hiçbir yere
gitmediği hâlde. Veri riski değildi (aşağıya bak) ama yanıltıcıydı.

**Kural: kimlik = şifreyle girmiş olmak + kim olduğunu seçmiş olmak.**

Jetonsuz yazmaya karşı üç katman (hepsi bağımsız):

1. "Onaya gönder" çubuğu `sessionToken` yoksa hiç görünmez
2. `/api/oneri` jetonsuz isteği **401** ile reddeder
3. `/api/agac` POST yalnızca **admin** jetonu kabul eder

Karşılama ekranından çıkış ipucu da yetkiye göre değişir: şifresiz kullanıcıya
"düzenle" vaat edilmez, "görüntüleme modu" denir.

**Yönetici yetkisi zaten tamdır:** `canEdit()` ilk satırı `if(isAdmin) return true`,
dört API'nin hepsinde admin sınırsız.

---

## 10. Kol (damar) sistemi

`KOL_BASLARI_ID` — kol başı id → halk-dili ad. **Derin baş, üst kolu ezer**
(işaretleme sırası sığdan derine), yani bir kişi hangi kol başına daha yakınsa o
kola sayılır.

```
1. halka — Molla Memiş'in oğulları
  p12    Abdurrahman Oğulları        143
  p11    Memiş Oğulları (Memişişi)    50
  p13    Aslan Oğulları (Aslanişi)    47
2. halka — torunlar
  p111   Baratişi                     30
  p112   Karyağdişi                   19
  p121   Musaşi                       18
  p123   Tayişi                       13
5. halka
  p12222 Noktaşi                      69
```

Abdurrahman (p12) kol başı olmalı: **"Abdurrahman oğulları Abdurrahman'dan
başlar."** Bir ara Noktaşi ondan alınıp torunu Ömer'e verilirken p12 kol başı
olmaktan çıkarıldı ve Mehmet Yazıcı/Hamit hattında ~45 kişi kolsuz (renksiz,
filtrede görünmez) kaldı.

Lens listesindeki halka numarası **kol başının `_depth`'inden türetilir**, elle
yazılmaz — tanımlar değişirse liste kendiliğinden doğru kalır.

`SPIRAL_OF` = en yakın kol (renk için). `SPIRAL_ANCESTORS` = soy hattındaki
**tüm** kol başları (filtre hiyerarşik olsun diye: "Abdurrahman" seçilince
Noktaşi/Musaşi üyeleri de görünür).

Eksik: **Şabanişi** henüz tanımlı değil.

---

## 11. Temalar

Üç tema, `data-theme` ile: `yadigar` (**varsayılan**), `dark`, `light`.
Düğme üçünü sırayla geçer. Anahtar `kok_theme_v2` — **sürümlü**, çünkü yadigâr
varsayılan olduğunda daha önce tema seçmiş kullanıcılar eski tercihte kilitli
kalıyordu ve sitede hiçbir değişiklik görmüyorlardı.

**Yadigâr**, 1956 çiziminin dilini taşır: sıcak kağıt, mürekkep kontur,
yaprakların yıkanmış tonları, CSS gradyanıyla kağıt dokusu (dosya eklemeden),
çift çizgili çerçeve, serif marka başlığı.

> Palet fotoğraftan **birebir örneklenmedi**. Örnekleme yapıldı (`#c1b9a9` kağıt,
> `#666e78` başlık mürekkebi…) ama o, cam arkasında sönük pozlanmış bir
> fotoğraf; renkleri doğrudan kullanmak tasarım değil kopya olurdu. Palet
> çizimin kendi tonlarından alınıp ekranda okunacak parlaklığa çekildi.

### Tema eklerken dikkat

Canvas çizimi CSS değişkenlerini `getVar()` ile okur. **Sabit renk yazmayın.**
İki kez bu hataya düşüldü:

- düğüm konturu `rgba(255,255,255,.28)` sabit kodluydu → kağıt temada düğümler
  görünmez oldu. Şimdi `--node-edge` / `--node-inner`.
- karşılama/Köken/sohbet ekranları satır içi sabit renklerle yazılmıştı → tema
  değişince dönüşmüyorlardı. 29 nokta değişkene bağlandı; ayrıca `--on-accent`
  (vurgu üstü yazı), `--overlay` (tam ekran katman), `--welcome-1/2` eklendi.

---

## 12. Maliyet: ücretsiz katmanda kalmak

Ölçülen gerçek rakamlar (brotli sonrası, telde):

```
ana sayfa : 484 KB → 52.9 KB   (%89 azalma)
koken.jpg : 427 KB, ayrı dosya + 30 gün önbellek, yalnız Köken açılınca
/api/agac :   4 KB
```

Yapılanlar:

1. **1956 görseli dışarı alındı** (`public/koken.jpg`). base64 olarak 556 KB
   HTML'in içindeydi; Köken ekranı hiç açılmasa bile iniyordu ve koddaki tek
   satır değişiklik 776 KB'ın tamamının önbelleğini düşürüyordu.
2. **Arka plan sekmesinde yoklama durur** (`document.hidden`). Açık bırakılan bir
   sekme saatte 120 istek üretiyordu (7/24 açıkken ayda ~86 bin çağrı) ve kimse
   bakmıyorken bunun tamamı boşaydı. Sekmeye dönünce `visibilitychange` ile
   hemen bir kez yoklanır.
3. Görsele 30 gün önbellek (`vercel.json`). `immutable`/1 yıl verilmedi: dosya
   adı hash'li değil, görsel değiştirilirse eski kopya takılı kalırdı.

Bant genişliği hiçbir zaman darboğaz değildi; asıl birikebilecek şey fonksiyon
çağrısıydı.

---

## 13. Bilinen eksikler

- **Şabanişi** kolu tanımlı değil.
- Kademeli açılımda `+N` sayısı `scale>0.45` eşiğini geçmediği için çıkmıyor
  (kesikli halka görünüyor).
- Açılan düğümlere geçiş animasyonu yok.
- Nesil kaydırıcısında mobil için özel thumb stili yok.
- "Kart kapatma → odak kapanır" bağlı değil (ESC ve boşluğa tık bağlı).
- 41 çocuğun **annesi bilinmiyor** (sahte kayıtlar silindi, uydurulmadı).
- `layoutSpiral()` ölü ama silinemiyor (bkz. §1).

### Tarayıcıda doğrulanamayanlar

Bu ortamda pencere yeniden boyutlandırma viewport'a yansımadı ve sentetik
dokunma olayları denenmedi. Şunlar **gözle test edilmedi**:

- mobil ~380px görünüm (kompakt kart, mobil aralık çarpanı, nesil paneli)
- uzun bas ile aç/kapat
- iki parmak pinch (hem grafikte hem Köken görselinde)
- Köken görselinde tekerlek/sürükleme jestleri
- bağlı olmayan iki kişi → "yol yok" mesajı
- dört Bloom özelliği aynı anda aktifken tutarlılık

---

## 14. Değişiklik yaparken kontrol listesi

1. Yerleşim mi? → `layoutRadial()`. `layoutSpiral()` değil.
2. Yeni filtre mi? → `nodeVisible` / `nodeAlpha`. Çizim döngüsüne dağıtma.
3. Görünürlük değişti mi? → `fit()` ve `updateStatus()` çağrılıyor mu?
4. Canvas'a renk mi yazıyorsun? → `getVar("--...")`, sabit hex değil.
5. Yeni tema değişkeni mi? → **üç temaya da** tanımla.
6. Halka mesafesine dokunuyor musun? → Dokunma. Sıkışmayı açıyla çöz.
7. Sözdizimi kontrolü: `<script>` bloğunu ayıklayıp `node --check`.
   (Bu dosya tek HTML olduğu için derleyici uyarısı yok — kontrol elle yapılır.)
8. Dağıtım: Vercel'in GitHub webhook'u bu projede güvenilmez davrandı;
   `vercel deploy --prod --yes` ile elle dağıtıp `curl` ile yayında olduğunu
   teyit et.
