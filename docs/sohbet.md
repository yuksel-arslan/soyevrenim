# Sohbet servisi — `api/sohbet.js`

Genel **Aile Sohbeti** ve kişi kartındaki **Yorumlar** tek uçtan, tek tablodan çalışır.

## Uç

| Adım | İstek (POST `/api/sohbet?adim=…`) | Yetki | Yanıt |
|---|---|---|---|
| `oku` | `{kapsam}` | herkes | `{ok, mesajlar:[{id, yazan_id, yazan_ad, mesaj, zaman}]}` (en fazla 300, eskiden yeniye) |
| `yaz` | `{kapsam, mesaj, jeton, yazan_ad}` | aile / admin jetonu | `{ok, mesaj}` · jetonsuz `401` |
| `sil` | `{id, jeton}` | yalnız admin | `{ok}` · `403` / `404` |

- `kapsam`: `genel` (Aile Sohbeti) ya da `kisi:<id>` (o kişinin yorumları). Başka değer → `genel`.
- `mesaj` en fazla 2000 karakter. `yazan_id` = rol (`aile` / `admin`), `yazan_ad` = istemcinin seçili kişisi.
- Bağlantı `api/_lib/db.js → db()` üzerinden (testte yerel PostgreSQL).

## Tablo

`sohbet (id, kapsam, yazan_id, yazan_ad, mesaj, zaman)` — `schema.sql`; dizin `(kapsam, zaman desc)`.

## Giriş (istemci)

Şifre kutusu artık üç yerde, hepsi `sifreyleGir()` ortak fonksiyonunu kullanır:

1. Karşılama ekranı (ad seçilmemişse girişten sonra ad sorulur).
2. **Aile Sohbeti:** giriş yoksa yazı kutusu şifre kutusuna dönüşür, düğme **Giriş** olur.
3. **Asistan (Çınar):** "🔑 Aile şifresiyle giriş yap" düğmesi kutuyu bir kerelik şifre moduna alır.

Jeton `localStorage.kok_session` içinde saklanır. Panel 15 sn'de bir (sekme görünürken) yenilenir.
Mobilde sohbet açıkken mikrofon düğmesi gizlenir (`body.sohbet-acik`).

## Ortam değişkenleri

`DATABASE_URL`, `OTURUM_GIZLI` (jeton imzası), `AILE_SIFRESI`, `ADMIN_SIFRESI` (giriş, `api/giris.js`).
