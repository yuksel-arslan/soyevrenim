# Medya servisi — `api/medya.js`

Kişi kartındaki **profil fotoğrafı**, galeri ve anı fotoğrafları/videoları.
Depo: **Cloudflare R2** — sesli hikâyelerle aynı kova, `medya/AAAAAA/` altında. Kova özel kalır.
(Eskiden Vercel Blob kullanılıyordu; ayrı kurulum istediği ve 4,5 MB gövde sınırına takıldığı için kaldırıldı.)

## Uç

| İstek | Yetki | Yanıt |
|---|---|---|
| `POST /api/medya?adim=yukle-url` `{jeton, tip}` | aile / admin jetonu | `{ok, anahtar, tip, url, okuUrl}` — `url`: 15 dk geçerli imzalı **PUT** |
| `GET /api/medya?adim=oku&anahtar=…` | herkes | `302` → taze imzalı R2 **GET** (tarayıcı `MEDYA.okuOnbellekSn` önbellekler) |

Hatalar: `401` giriş gerekli · `400` desteklenmeyen tür / geçersiz anahtar · `503` R2 ayarları eksik.
Türler (`MEDYA.turler`): jpg, png, webp, gif, heic, mp4, mov, webm.

## Akış (istemci `uploadMedia`)

1. Fotoğraf tarayıcıda küçültülür (`shrinkImage` → JPEG, en fazla `maxW` px).
2. Boyut sınırı (`MEDYA.fotoMaxMb` / `videoMaxMb`, istemciye `kamuAyar`).
3. `yukle-url` → `yetkiliIstek()`: 401 gelirse şifre penceresi, girişten sonra yeniden denenir.
4. Dosya **doğrudan R2'ye** `PUT` edilir (Vercel'den geçmez).
5. Profilde `okuUrl` (`/api/medya?adim=oku&anahtar=…`) saklanır; görüntülemede taze imzalı bağlantıya yönlenir.

R2 kovasında CORS: site adresine `PUT`, `GET`, başlık `content-type` (bkz. `KURULUM.md`).
Eski Vercel Blob adresleriyle kaydedilmiş fotoğraflar (varsa) olduğu gibi görünmeye devam eder.

## Ortam değişkenleri

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (ses ile ortak), `OTURUM_GIZLI`.
Ayarlar: `api/_lib/ayar.js → MEDYA`. Test: `test/medya.test.mjs`.
