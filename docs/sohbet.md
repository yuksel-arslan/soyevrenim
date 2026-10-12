# Sohbet servisi — `api/sohbet.js`

Genel **Aile Sohbeti** ve kişi kartındaki **Yorumlar** tek uçtan, tek tablodan çalışır.

## Uç

| Adım | İstek (POST `/api/sohbet?adim=…`) | Yetki | Yanıt |
|---|---|---|---|
| `oku` | `{kapsam}` | herkes | `{ok, mesajlar:[{id, yazan_id, yazan_ad, mesaj, zaman}]}` (en fazla 300, eskiden yeniye) |
| `yeni` | `{kapsam, son}` | herkes | `{ok, sayi, sonId, yazanlar:[{yazan_id, yazan_ad}]}` — `son` id'sinden sonraki mesajlar (en çok `SOHBET.yeniMax`) |
| `yaz` | `{kapsam, mesaj, jeton, yazan_ad, kisi_id}` | aile / admin jetonu | `{ok, mesaj}` · jetonsuz `401` |
| `sil` | `{id, jeton}` | yalnız admin | `{ok}` · `403` / `404` |

- `kapsam`: `genel` (Aile Sohbeti) ya da `kisi:<id>` (o kişinin yorumları). Başka değer → `genel`.
- `mesaj` en fazla 2000 karakter. `yazan_id` = yazanın ağaçtaki **kişi id'si** (`kisi_id`; seçilmemişse rol
  `aile` / `admin`), `yazan_ad` = adı. Eskiden hep rol yazılıyordu; kimin yazdığı ayırt edilemiyordu.
- Bağlantı `api/_lib/db.js → db()` üzerinden (testte yerel PostgreSQL).

## Tablo

`sohbet (id, kapsam, yazan_id, yazan_ad, mesaj, zaman)` — `schema.sql`; dizin `(kapsam, zaman desc)`.

## Grup sohbeti: kim kiminle konuşuyor

- Aile Sohbeti **tüm ailenin ortak odasıdır**: aile şifresiyle giren herkes okur ve yazar (grup sohbeti).
- Başlık altında: "Tüm ailenin ortak odası · konuşanlar: Fahri, Aysel, sen".
- Mesajlarda yazar ağaçtaki kimliğiyle görünür ("Kadir oğlu Fahri", "Hasan oğlu Aysel"); kendi mesajların
  "Sen" ve sağda. Yazı kutusu: "Tüm aileye yaz (Yüksel olarak)…".
- Silme yalnızca yöneticide görünür (sunucu da yalnız yöneticiye izin verir).

## Davet ve bildirim

- **＋ Davet et** (başlıkta): telefonun paylaşım menüsü (`navigator.share`); yoksa metin panoya
  kopyalanır ve WhatsApp açılır. Bağlantı `/?sohbet=1` — açan kişi karşılamadan sonra doğrudan sohbete
  gelir (asistan kendiliğinden açılmaz). **Şifre bağlantıya yazılmaz**; metin "şifreyi bana sor" der.
- **Rozet:** panel kapalıyken her `SOHBET.yoklamaSn` saniyede (sekme görünürken) `adim=yeni` sorulur;
  başkalarının yeni mesaj sayısı sohbet düğmesinde rozet olur.
- **Bildirim:** "💬 Fahri, Aysel Aile Sohbeti'ne yazdı · aç" — dokununca sohbet açılır (mobilde düğme
  menüde kayık kalabileceği için).
- Son görülen mesaj `localStorage.kok_sohbet_son`; ilk ziyarette eski mesajlar "yeni" sayılmaz.
- Süreler `api/_lib/ayar.js → SOHBET` (`yoklamaSn`, `acikYoklamaSn`, `yeniMax`); istemciye `kamuAyar` ile.

## Push bildirimleri (telefon kilitliyken de)

Bağımlılıksız Web Push: `api/_lib/push.js` (Node `crypto`).

| Parça | Ne yapar |
|---|---|
| `public/sw.js` | Service worker: şifreli yükü açar, "💬 Fahri · Aile Sohbeti" bildirimini gösterir; dokununca sohbeti açar. Sayfa açık ve görünürse göstermez (sayfa kendi rozetini gösterir). Önbellek yok. |
| `public/manifest.webmanifest` + `simge-192/512.png` | Ana ekrana eklenebilir uygulama. **iPhone'da push yalnızca ana ekrana eklenmiş sitede çalışır** (iOS 16.4+). |
| `adim=vapid` | Açık VAPID anahtarı. Anahtar `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` ortam değişkenlerinden; yoksa ilk kullanımda üretilip `bildirim_anahtar` tablosuna yazılır (elle anahtar taşımak gerekmez). |
| `adim=abone` | `{jeton, kisi_id, abonelik}` — giriş gerekir. Aynı tarayıcı tekrar abone olursa güncellenir (`endpoint` benzersiz). |
| `adim=birak` | `{endpoint}` — aboneliği siler. |
| `adim=yaz` (genel) | Mesaj kaydedilince **yazan hariç** tüm abonelere gönderir; yanıtta `bildirim: {gonderilen, silinen}`. 404/410 dönen (geçersiz) abonelik silinir. Gönderim hatası mesajı bozmaz. |

- Şifreleme RFC 8291 (aes128gcm), imza RFC 8292 (VAPID, ES256). Ayarlar `api/_lib/ayar.js → BILDIRIM`
  (`ttlSn`, `jwtSureSn`, `zamanAsimiMs`, `kayitBoyu`, `metinMax`, `enCokAlici`, `konu`).
- Arayüz: sohbet başlığında **🔕 Bildirim al / 🔔 Bildirim açık**. iPhone'da (ana ekrana eklenmemişse)
  dokununca "Paylaş → Ana Ekrana Ekle" yönergesi; izin reddedildiyse tarayıcı ayarı yönergesi.
- Açılışta abonelik varsa sunucudaki kayıt tazelenir (kişi değiştiyse `kisi_id` güncellenir).
- Tablolar: `bildirim_abonelik`, `bildirim_anahtar` (`schema.sql`; tek başına `sql/bildirim.sql`).
- Test: `test/push.test.mjs` — şifreli yük bağımsız çözücüyle açılır, JWT açık anahtarla doğrulanır,
  uçtan uca (taklit push servisi) yazana gitmediği ve 410'un silindiği denetlenir.

## Ana ekrana ekleme (iPhone)

Site indirme/mağaza gerektirmez; her telefonda tarayıcıdan çalışır. Ancak **iPhone'da push yalnızca
ana ekrana eklenmiş sitede** gelir (Apple kuralı, iOS 16.4+). Bu yüzden iPhone/iPad'de (iPadOS
masaüstü UA'sı dahil) ve site ana ekrandan açılmamışsa alt sayfada yönerge çıkar:

1. Paylaş simgesi (Safari'de altta; görünmüyorsa önce ⋯) · 2. "Ana Ekrana Ekle" · 3. Ekle.

- Instagram/Facebook gibi **uygulama içi tarayıcıda** önce "Safari'de aç" adımı eklenir;
  Chrome/Firefox (iOS) için "adres çubuğundaki Paylaş" denir.
- Ne zaman: karşılama kapanınca `ANA_EKRAN.gecikmeSn` saniye sonra. **Anladım** → `ANA_EKRAN.tekrarGun`
  gün sonra yine; **Bir daha gösterme** → hiç (`localStorage.kok_ana_ekran`).
- Her zaman açılabilir: hesap menüsü → **📲 Ana ekrana ekle**, ya da sohbetteki **🔕 Bildirim al** (iPhone'da).
- Android ve masaüstünde gösterilmez (orada tarayıcıdan da bildirim gelir).
- Kod: `public/index.html → anaEkranRehberi / anaEkranZamanla / iosCihaz / anaEkranda`; ayar `api/_lib/ayar.js → ANA_EKRAN`.

## Giriş (istemci)

Şifre kutusu artık üç yerde, hepsi `sifreyleGir()` ortak fonksiyonunu kullanır:

1. Karşılama ekranı (ad seçilmemişse girişten sonra ad sorulur).
2. **Aile Sohbeti:** giriş yoksa yazı kutusu şifre kutusuna dönüşür, düğme **Giriş** olur.
3. **Asistan (Çınar):** "🔑 Aile şifresiyle giriş yap" düğmesi kutuyu bir kerelik şifre moduna alır.

Jeton `localStorage.kok_session` içinde saklanır. Panel açıkken `SOHBET.acikYoklamaSn` saniyede bir yenilenir.
Mobilde sohbet açıkken mikrofon düğmesi gizlenir (`body.sohbet-acik`).

## Ortam değişkenleri

`DATABASE_URL`, `OTURUM_GIZLI` (jeton imzası), `AILE_SIFRESI`, `ADMIN_SIFRESI` (giriş, `api/giris.js`).
İsteğe bağlı: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (yoksa anahtar veritabanında üretilir).
