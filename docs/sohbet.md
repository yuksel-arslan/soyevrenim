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

## Giriş (istemci)

Şifre kutusu artık üç yerde, hepsi `sifreyleGir()` ortak fonksiyonunu kullanır:

1. Karşılama ekranı (ad seçilmemişse girişten sonra ad sorulur).
2. **Aile Sohbeti:** giriş yoksa yazı kutusu şifre kutusuna dönüşür, düğme **Giriş** olur.
3. **Asistan (Çınar):** "🔑 Aile şifresiyle giriş yap" düğmesi kutuyu bir kerelik şifre moduna alır.

Jeton `localStorage.kok_session` içinde saklanır. Panel açıkken `SOHBET.acikYoklamaSn` saniyede bir yenilenir.
Mobilde sohbet açıkken mikrofon düğmesi gizlenir (`body.sohbet-acik`).

## Ortam değişkenleri

`DATABASE_URL`, `OTURUM_GIZLI` (jeton imzası), `AILE_SIFRESI`, `ADMIN_SIFRESI` (giriş, `api/giris.js`).
