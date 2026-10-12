# Medya servisi — `api/medya.js`

Kişi kartındaki **profil fotoğrafı**, galeri ve anı fotoğrafları/videoları.
Depo: **Cloudflare R2** — sesli hikâyelerle aynı kova, `medya/AAAAAA/` altında. Kova özel kalır.
(Eskiden Vercel Blob kullanılıyordu; ayrı kurulum istediği ve 4,5 MB gövde sınırına takıldığı için kaldırıldı.)

## Uç

| İstek | Yetki | Yanıt |
|---|---|---|
| `POST /api/medya?adim=yukle-url` `{jeton, tip}` | aile / admin jetonu | `{ok, anahtar, tip, url, okuUrl}` — `url`: 15 dk geçerli imzalı **PUT** |
| `POST /api/medya?adim=yukle&jeton=…&tip=…` — gövde: ham dosya (octet-stream) | aile / admin jetonu | `{ok, anahtar, okuUrl}` — yedek yol, en çok `MEDYA.vekilMaxMb` |
| `GET /api/medya?adim=oku&anahtar=…` | herkes | `302` → taze imzalı R2 **GET** (tarayıcı `MEDYA.okuOnbellekSn` önbellekler) |

R2 reddederse (`502`) yanıt R2'nin hata kodunu ve ne yapılacağını söyler (`api/_lib/r2.js → r2Hatasi`):

| Kod | Anlamı / yapılacak |
|---|---|
| `AccessDenied` (ya da kodsuz 403) | R2 API anahtarının kovaya **yazma** izni yok → Manage API tokens: "Object Read & Write", doğru kova |
| `SignatureDoesNotMatch` | `R2_SECRET_ACCESS_KEY` yanlış/eksik kopyalanmış |
| `InvalidAccessKeyId` | `R2_ACCESS_KEY_ID` yanlış ya da anahtar silinmiş |
| `NoSuchBucket` | `R2_BUCKET` adı yanlış |
| `Unauthorized` | `R2_ACCOUNT_ID` ile anahtar farklı hesaplara ait |

Hatalar: `401` giriş gerekli · `400` desteklenmeyen tür / geçersiz anahtar · `503` R2 ayarları eksik.
Türler (`MEDYA.turler`): jpg, png, webp, gif, heic, mp4, mov, webm.

## Akış (istemci `uploadMedia`)

1. Fotoğraf tarayıcıda küçültülür (`shrinkImage` → JPEG, en fazla `maxW` px).
2. Boyut sınırı (`MEDYA.fotoMaxMb` / `videoMaxMb`, istemciye `kamuAyar`).
3. `yukle-url` → `yetkiliIstek()`: 401 gelirse şifre penceresi, girişten sonra yeniden denenir.
4. Dosya **doğrudan R2'ye** `PUT` edilir (Vercel'den geçmez).
4b. **Yedek yol:** doğrudan yükleme olmazsa (çoğunlukla R2 CORS bu adrese izin vermiyor) dosya
   `MEDYA.vekilMaxMb` altındaysa `POST /api/medya?adim=yukle&jeton=…&tip=…` (gövde: ham dosya) ile
   **sunucu** R2'ye yükler — sunucu→R2 isteğinde CORS yoktur. Küçültülmüş fotoğraflar her zaman bu
   sınırın altındadır; büyük videolar için CORS şarttır (hata mesajı izinli olması gereken adresi söyler).
5. Profilde `okuUrl` (`/api/medya?adim=oku&anahtar=…`) saklanır; görüntülemede taze imzalı bağlantıya yönlenir.

R2 kovasında CORS: site adresine `PUT`, `GET`, başlık `content-type` (bkz. `KURULUM.md`).
Eski Vercel Blob adresleriyle kaydedilmiş fotoğraflar (varsa) olduğu gibi görünmeye devam eder.

## Onaysız kayıt (aile üyesi)

Aile üyesinin yüklediği **profil fotoğrafı ve galeri öğesi yönetici onayı beklemez**:
`POST /api/agac?adim=medya {jeton, kisi_id, alan:'photo'|'gallery', url, video}` yalnız o kişinin
medya alanını değiştirir (ağacın geri kalanına dokunmaz). `url` kendi depomuzdan olmalı
(`/api/medya?adim=oku&anahtar=…`, `medyaUrlGecerli`); başka adres `400`. Oturumsuz `401`.
Yönetici eskisi gibi tam kayıt (`saveProfile → cloudSave`) yapar. Eskiden aile üyesinin fotoğrafı
"Onaya gönder" çubuğuna düşüyor ve onaylanmadıkça görünmüyordu.

## Ortam değişkenleri

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (ses ile ortak), `OTURUM_GIZLI`.
Ayarlar: `api/_lib/ayar.js → MEDYA`. Test: `test/medya.test.mjs`.
