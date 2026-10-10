# Medya servisi — `api/medya.js`

Kişi kartındaki **profil fotoğrafı**, galeri ve anı fotoğrafları/videoları için yükleme.
Depo: **Vercel Blob** (Vercel → Storage → Blob → projeye bağla; `BLOB_READ_WRITE_TOKEN` otomatik eklenir).

## Uç

| İstek | Yetki | Yanıt |
|---|---|---|
| `POST /api/medya?ad=<dosya>&jeton=<oturum>` — gövde: ham dosya (`image/*`, `video/*`) | aile / admin jetonu | `{ok, url, tip}` |
| `DELETE /api/medya?url=<blob-url>&jeton=<oturum>` | aile / admin jetonu | `{ok}` |

Hatalar: `401` "Giriş gerekli" (jeton yok/geçersiz) · `413` dosya çok büyük · `503` "Fotoğraf deposu
kurulmamış" (Blob bağlı değil) · `500` diğer.

## İstemci (`uploadMedia`)

- Fotoğraf yüklemeden önce tarayıcıda küçültülür (`shrinkImage`, en fazla `maxW` piksel genişlik).
- İstek `yetkiliIstek()` ile gider: **401 gelirse** oturum kapatılır, "Giriş gerekli" penceresi açılır,
  şifre girilince yükleme kendiliğinden yeniden denenir (bkz. `docs/giris.md`).
- Vercel'in gövde sınırını aşan dosya (JSON olmayan 413) için "Dosya çok büyük" mesajı.
- Bulut kapalıysa (yerel mod) dosya data-URI olarak profilde tutulur.

## Ortam değişkenleri

`BLOB_READ_WRITE_TOKEN` (Vercel Blob bağlanınca otomatik), `OTURUM_GIZLI` (jeton doğrulama).
