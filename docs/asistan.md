# Asistan — `POST /api/asistan`

Soy ağacı hakkında soru yanıtlayan ve konuşarak kişi/ilişki ekleme **önerisi** oluşturan LLM asistanı.
Tamamen ücretsiz katmanda çalışır (Groq). Kota dolunca mevcut Rehber (`KOMUTLAR` / `calistirKomut()`) yedek olarak yanıtlar.

## Akış

```
Rehber girişi / 🎤 ─► arayüz komutu mu? (köken, istatistik, kol, "3-6 nesil", tümünü göster…)
                        ├─ evet ─► calistirKomut() (yerel, kota harcamaz)
                        └─ hayır ─► POST /api/asistan
                                     ├─ kimlik yok / kota dolu / Groq 429 ─► {yedek:true, mesaj}
                                     │        └─ istemci: calistirKomut() + tek satır not
                                     └─ araç döngüsü (≤ 4 tur) ─► {yanit, gorsel, oneriler, kota}
```

- **Kimlik:** "adını seç" kişi id'si (`kisi_id`) + aile oturum jetonu (`jeton`). Jeton, ücretsiz kotayı internetteki
  rastgele isteklere karşı korur. Jeton yoksa Rehber yedeği: "Asistan için aile şifresiyle giriş yap…"
  - Seçilen kişi tarayıcıda `kok_ben` anahtarında saklanır (karşılamada ad seçimi, Rehber'de **"Ben Yüksel"**
    — adaşta **"Ben Fahri oğlu Yüksel"** — ya da kişi kartında **🙋 Bu benim**).
  - Şifreyle girişte kişi seçilmemişse karşılama kapanmaz, ad sorulur. Jeton var ama kişi yoksa not:
    "Asistan için kim olduğunu yaz: “Ben Yüksel” gibi…". Yönetici de bu kurala tabidir.
  - Jeton yoksa notun altında **🔑 Aile şifresiyle giriş yap** düğmesi çıkar; kutu bir kerelik şifre
    kutusuna dönüşür (ortak `sifreyleGir()`, bkz. `docs/sohbet.md`).
  - Mobilde hazır sorular tek satırda yana kayar, yanıt alanı ≤30vh: yazı kutusu hep görünür.
- **Model ağaca yazmaz.** Ekleme/düzeltme `oneri_olustur` aracıyla `oneri` tablosuna **yama** (`islem`) olarak düşer;
  yönetici mevcut onay kutusundan onaylar. Onayda yama **o anki** ağaca uygulanır (araya giren onayları ezmez).
- **Belirsiz isim:** sistem istemi, birden çok eşleşmede tahmin yerine soru sormayı zorunlu kılar (ağaçta 37 tekrarlı ad var).
- **Kaynak:** yanıt sonunda `Kaynak: <kişi>'in anısı, <tarih>` ya da `Kaynak: soy ağacı kaydı`.
- **Görsel:** `yol_bul` çağrıldıysa istemci yolu ağaçta çizer (`gorsel.yol`), tek kişi getirildiyse kişiyi seçer (`gorsel.kisi`).

## Rehberin adı

Rehber, ailenin **yaşayan en büyüğünün** adını taşır (örn. "Naziye Nine · Rehber").
Hesap `api/_lib/agac.js → enBuyukYasayan()` (istemci aynı kodu `public/lib/agac.js`'ten kullanır):

1. Profilinde **Doğum yılı** girilmiş yaşayanlar arasında en eskisi (`yontem: 'dogum'`);
2. yoksa en eski nesildeki yaşayan; aynı nesilde kimlik sırası (kayıtlarda büyük kardeş önce) (`yontem: 'nesil'`).

Rehber o kişi **değildir**: sistem istemi modelin o büyüğün ağzından konuşmasını, onun adına
anı/söz uydurmasını yasaklar; ad yalnızca saygı ifadesidir. Doğum yılı girildikçe seçim kesinleşir.

## Rehberin becerileri (`uzman_bilgi` aracı)

`api/_lib/uzmanlik.js` (→ `public/lib/uzmanlik.js`) — Rehber'in uzmanlık modülleri:

| Beceri | İçerik |
|---|---|
| `bolge` | Doğu Karadeniz · Arhavi–Fındıklı (Viçe) tarihi: Lazlar, Osmanlı'ya katılış (1461), tahrir kayıtları, 17. yy göçleri, Viçe→Fındıklı, Lazistan, 1959 köy adı değişiklikleri |
| `site` | soyevrenim.com kullanımı: Rehber ne yapar, ağaçta gezinme (dokun / uzun bas), kişi ekleme ve öneri, sesli hikâye, giriş, kota, temalar, Köken ve araştırma köşesi |
| `lazca` | Lazca (Lazuri): dil hakkında, selamlaşma, teşekkür, akrabalık adları — Laz Enstitüsü ve lazca.org'dan, yazım farkları belirtilerek |

- **Model açıkken:** asistan bu modülleri `uzman_bilgi({sorgu, beceri})` ile çağırır. Kullanıcı Lazca yazarsa (`lazcaMi`) istemde
  Lazca kuralı devreye girer: kısa Lazca yanıt + **her zaman Türkçe karşılık**; bilinmeyen sözcük uydurulmaz.
  Not: Lazca az kaynaklı bir dildir; model Lazcayı akıcı konuşamaz, bilinen ifadelerle sınırlı kalır.
- **Model kapalıyken (kota/anahtar yok):** ücretsiz Rehber aynı modülleri anahtar sözcükle eşler (`uzmanYaniti`, eşik `UZMAN_ESIK`).
  Lazca becerisi yalnızca soruda "Lazca" geçerse ya da metin Lazca yazılmışsa çalışır; ağaçta bulunan bir kişinin adı geçen
  sorular ("Fahri'nin annesi kim?") akrabalık komutuna bırakılır. Hiçbir şey eşleşmezse "kimseyi bulamadım" yerine Rehber'in neler
  yapabildiği anlatılır.
- Yeni bilgi eklemek: ilgili becerinin `konular` listesine `{baslik, anahtar[], metin, guven, kaynak[]}` ekle → `npm run build`.

## Soy tarihi (`soy_tarihi` aracı)

`api/_lib/soy-tarihi.js` (→ `public/lib/soy-tarihi.js`): Fahri Arslan'ın 1956 çizimindeki not
(birincil kaynak, birebir) + internetten derlenen bağlam. Her bilgi bir güven etiketi taşır:
**Aile kaydı** · **Kaynakta geçiyor** (bağlantılı) · **Yorum** · **Teyit gerekli**.
**Osmanlı Arşivi** bölümü (`ARSIV`): 1486 ve 1583 Trabzon mufassal tahrirleri, 1564 TT 442 (Atina-Arhavi-Hemşin), 1681/82 Arhavi avârız defteri, 1835 Arhavi nüfus defteri (No. 1165; Hiçyılmaz 2015 yayını) — her biri için yayımlayan/inceleyen kaynak ve "ne bulunabilir" yol haritası. Defterlerin kendisi Devlet Arşivleri'nde tarama görüntüsüdür; bu bilgiler ikincil kaynaklardan derlenmiştir.
Asistan köken/göç/yer/kol sorularında bu aracı çağırır; araç ayrıca ağacın sayılarını
(kişi, yaşayan, nesil, kök, kolların soy büyüklüğü) döndürür. Sonuç `ASISTAN.soyTarihiMaxKarakter`
ile sınırlı, istem yine `MESAJ_MAX_TOKEN` altında. Aynı içerik Köken ekranında
**📜 Kökenimizin hikâyesi** panelinde gösterilir; kota yokken ücretsiz Rehber `tarih` komutuyla
Fahri Arslan'ın notunu söyler ve paneli açar.

## Uç

`POST /api/asistan`

| Alan | Tür | Açıklama |
|---|---|---|
| `jeton` | string | `/api/giris` oturum jetonu (aile/admin) |
| `kisi_id` | string | "Bu evrene kim bakıyor?" ile seçilen kişi |
| `mesaj` | string | ≤ `ASISTAN.mesajMaxKarakter` |
| `gecmis` | `[{rol:'kullanici'\|'asistan', metin}]` | son `ASISTAN.gecmisTur` mesaj |

Yanıt (her zaman HTTP 200):

```json
{ "ok": true, "yanit": "…\nKaynak: soy ağacı kaydı", "gorsel": {"yol": ["p122221","p12221"]},
  "oneriler": [{"id": 12, "ozet": "+ Ayşe (Fahri'in kardeşi)"}], "kota": { … } }
{ "ok": false, "yedek": true, "sebep": "sistem|kisi|saglayici|hata", "mesaj": "Bugünkü ücretsiz asistan kotası doldu, yarın 03:00'te yenilenir." }
```

## Rehber'de kişi sorusu: önce ne istendiğini sorar

Rehber'e yalnızca bir ad yazılınca ("Yüksel", "Hamit kim?", "Yüksel'i göster", en fazla üç sözcük)
soru asistana gitmez, Rehber yerelde yanıtlar:

1. **Adaş varsa** önce hangisi olduğunu sorar: "Fahri oğlu Yüksel · 7. nesil | Hasan oğlu Yüksel · 6. nesil".
2. Kişiyi kısaca tanıtır: "Yüksel — Fahri oğlu, 7. nesil, hayatta. Onun hakkında ne öğrenmek istersin?"
3. Seçenek çipleri sunar; seçilen türde ayrıntı verir:
   - 👪 **Ailesi:** anne, baba, eşler, çocuklar, kardeşler; aile ağaçta odaklanır.
   - 🌳 **Soy zinciri:** köke kaç kuşak olduğu ve aradaki atalar; hat ağaçta yanar.
   - 🔗 **Benimle akrabalığı:** `akrabalikAnlatisi(ben, kişi)`; yol çizilir. Kim olduğu bilinmiyorsa "Ben …" ister.
   - 📋 **Bilgileri:** doğum, meslek, eğitim, medeni durum, çalışma.
   - 📖 **Anıları:** ilk üç anı (tarih, başlık, kısa metin).
   - 🗂 **Ayrıntı kartı:** kişinin ayrıntı panelini açar.
   - ↩ **Diğer sorular:** genel örnek sorulara döner.

Seçenekler kota harcamaz. Komutlar `{metin, secenekler:[{etiket, eylem}]}` döndürebilir
(`kisiTanit`, `kisiSecenekleri`, `secenekleriKur`).

## Akrabalık anlatısı (`akrabalikAnlatisi`)

`api/_lib/agac.js` (istemciye `public/lib/agac.js` olarak kopyalanır). Yol kartı, Rehber ve
`yol_bul` aracı (`anlati` alanı) **aynı** metni kullanır. "A → B → C · 12 adım" listesi yerine
aile büyüğünün anlatacağı gibi:

- **Başlık:** Kardeş · Amca/Dayı/Hala/Teyze ile yeğeni · Kuzen · Aynı kökün iki dalı ·
  Baba/Anne ile evladı · Dede/Nine ile torunu · Eşler · Evlilikle akraba
- **Özet:** "Fahri, Emine'nin amcası: Emine'nin babası Ömer ile Fahri kardeş, ikisi de Hamit'in çocukları."
- **Soy cümleleri:** "Soy, Molla Memiş'ten Abdurrahman, Mehmet Yazıcı ve Hamit üzerinden Fahri'ye iniyor."
- Ölçü (N. dereceden kuzen, kuşak farkı) en sonda; adım adım yol kartta katlanmış.
- Türkçe ekler `ilgiEki` / `yonelmeEki` / `ayrilmaEki` (ünlü uyumu, kesme işareti).
- Adaşlar baba adıyla ayrılır: "Fahri oğlu Yüksel ile Hasan oğlu Yüksel …".
- Model kuralı 6: yanıtı `anlati` üzerine kur, liste ve "N adım" gibi mekanik ifade kullanma.

## Araçlar (sunucuda çalışır)

| Araç | Ne yapar |
|---|---|
| `kisi_ara {sorgu}` | İsimle arama (`api/_lib/agac.js → kisiAra`); baba/anne adı, nesil, yaşam durumu |
| `kisi_getir {kisi_id}` | Profil: ebeveyn, eş, çocuk, kardeş, meslek, eğitim, anılar (iletişim bilgisi **verilmez**) |
| `yol_bul {a_id, b_id}` | En kısa akrabalık yolu, adım ilişkileri, ortak ata, derece (istemcideki "Yol bul" ile aynı kod) |
| `ani_ara {sorgu, kisi_id?}` | Anı metni/başlık/tarih içinde arama |
| `uzman_bilgi {sorgu, beceri}` | Beceriler: bölge tarihi, site kullanımı, Lazca (kaynaklı, güven etiketli) |
| `soy_tarihi {}` | Fahri Arslan notu, zaman çizelgesi, yerler, adlar (güven etiketli, kaynaklı) + ağaç sayıları |
| `oneri_olustur {islemler, aciklama}` | `kisi_ekle`, `iliski_ekle`, `bilgi_duzelt` yaması → onay kuyruğu |

Yama işlemleri (`api/_lib/oneri.js`):

| `tur` | Alanlar | Anlam |
|---|---|---|
| `kisi_ekle` | `ad, cinsiyet(E/K), yasiyor, iliski, hedef_id, ref?` | yeni kişi = hedefin `iliski`si (`cocugu, esi, kardesi, babasi, annesi`) |
| `iliski_ekle` | `kisi_id, hedef_id, iliski` | mevcut iki kişi arasında bağ |
| `bilgi_duzelt` | `kisi_id, alan(ad, cinsiyet, yasiyor, meslek, egitim, medeni), deger` | alan düzeltme |
| `ani_ekle` | `kisi_id, ani` | yalnızca sesli hikâye akışı kullanır |

Aynı öneride `ref: "$1"` ile yeni eklenen kişiye başvurulabilir (ör. eş + çocuğu). Geçersiz yama (var olan babanın üstüne
baba, bilinmeyen ilişki) araç sonucu olarak modele hata döner; öneri oluşmaz.

## İstem boyutu

`MESAJ_MAX_TOKEN` (4000): tüm ağaç **asla** isteme konmaz, araçla çekilir. Her istekten önce `sigdir()` kaba tahminle
(`ASISTAN.tokenKarakter` karakter ≈ 1 token) ölçer; aşarsa önce eski geçmiş, sonra en uzun araç sonucu kısaltılır.
Araç sonuçları ayrıca `ASISTAN.aracSonucMaxKarakter` ile kırpılır. Son turda araç verilmez → model yanıt yazmak zorunda.

## Kota (ücretsiz katman)

| Sınır | Değer (`api/_lib/ayar.js`) | Kontrol |
|---|---|---|
| Sistem günlük token | `GUNLUK_SISTEM.token` = 190.000 (Groq 200K'nın %95'i) | kalan < `MESAJ_MAX_TOKEN` ise başlatılmaz |
| Sistem günlük istek | `GUNLUK_SISTEM.istek` = 950 (Groq 1K'nın %95'i) | her Groq çağrısı sayılır (`kullanim.istek`) |
| Kişi günlük mesaj | `GUNLUK_KISI.mesaj` = 20 | `islem ∈ {soru, ekleme, duzenle}` satır sayısı |
| Gün sınırı | UTC 00:00 = **TR 03:00** | Groq sayaçlarıyla aynı an |

Ücretsiz kota hesabı: bir mesaj tipik olarak 2–3 Groq isteği ve ~3–6K token harcar → günde kabaca **30–60 asistan mesajı**
(token sınırı önce dolar). 20 mesaj/kişi sınırı, birkaç kişinin tüm kotayı tüketmesini engeller. Groq ayrıca dakikalık
sınır uygular; 429 gelirse kullanıcıya hata gösterilmez, Rehber yanıtlar.

Kayıt: her `/api/asistan` çağrısı **gerçek** `usage` (prompt/completion token toplamı ve istek sayısı) ile bir `kullanim` satırı
yazar (yarıda 429 olsa bile harcanan kısım yazılır).

## Tablolar

- `kullanim(id, kisi_id, tur['llm'|'stt'], model, girdi_tok, cikti_tok, istek, saniye, islem['soru'|'ekleme'|'hikaye'|'duzenle'], olusturma)`
- `oneri` + `islem jsonb` (yama), `kaynak` (`elle`|`asistan`|`hikaye`), `kisi_id` (öneren)

## Ortam değişkenleri

| Ad | Açıklama |
|---|---|
| `GROQ_API_KEY` | Groq API anahtarı (console.groq.com) |
| `DATABASE_URL` | Neon (mevcut) |
| `OTURUM_GIZLI` | jeton imzası (mevcut) |

## Groq ayarı (yönetici yapar)

1. console.groq.com → API Keys → anahtar oluştur → Vercel → Settings → Environment Variables → `GROQ_API_KEY`.
2. **Settings → Data Controls → Zero Data Retention: AÇ.** Aile anıları ve sorular Groq'ta saklanmaz.
3. Model değiştirmek: `api/_lib/ayar.js` → `LLM.model` (tek satır). Sağlayıcı OpenAI uyumlu uç kullanır (`SAGLAYICI`).

## Dosyalar

`api/asistan.js` · `api/_lib/ayar.js` · `api/_lib/groq.js` · `api/_lib/kota.js` · `api/_lib/kimlik.js` ·
`api/_lib/agac.js` (→ `public/lib/agac.js`) · `api/_lib/oneri.js` · istemci: `public/index.html` → `rehberGonder()`

## Test

`npm test` (birim) · `TEST_DATABASE_URL=postgres://… npm test` (uçtan uca; `npm i --no-save pg`).
Senaryolar: "Ayşe, Fahri'nin kız kardeşi" → belirsizlikte soru, netleşince öneri + onayda ağaca ekleme;
"Emine ile Fahri nasıl akraba?" → yol + kaynaklı yanıt; sistem/kişi kotası dolu → yedek; Groq 429 → yedek.
LLM testlerde **senaryolu taklittir**: tesisatı doğrular, modelin gerçek davranışını değil.
