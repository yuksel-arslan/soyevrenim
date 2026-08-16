# KÖK · Abdurrahman Oğulları Soy Ağacı

Ortak, canlı bir aile soy ağacı. Herkes girip görebilir; aile şifresiyle giren
kişiler kendi yakınlarında değişiklik önerebilir; tüm değişiklikler yöneticinin
onayından geçer.

## Özellikler

- **Bloom tarzı görsel ağaç** — nesil halkaları, eğik disk perspektifi, dinamik merkez
- **Herkes kendi bakışının merkezinde** — kim bakıyorsa onun soyu aydınlanır
- **Aile şifresiyle giriş** — ortak şifre girilir, imzalı oturum jetonu verilir (SMS/telefon yok)
- **Onay sistemi** — kimse ana ağacı doğrudan değiştiremez; değişiklikler admin onayından geçer
- **Foto & video** — Vercel Blob'da ortak saklanır, herkes görür
- **Fotoğraflı avatarlar, iletişim, sosyal medya, anılar**
- **Mobil uyumlu, dark/light**

## Teknoloji

- Frontend: tek dosya (`public/index.html`) — kütüphane bağımlılığı yok, saf Canvas
- Backend: Vercel Serverless Functions (`api/`)
- Veritabanı: Neon (PostgreSQL)
- Medya: Vercel Blob
- Giriş: aile/admin şifresi + HMAC imzalı oturum jetonu (harici servis yok)

## Kurulum

Ayrıntılı adım adım rehber için **[KURULUM.md](./KURULUM.md)** dosyasına bak.

Kısaca:
1. Neon'da `schema.sql`'i çalıştır.
2. Bu depoyu Vercel'e import et.
3. Ortam değişkenlerini gir (`.env.example`'a bak).
4. Vercel'de Blob deposu oluştur.
5. `soyevrenim.com`'u bağla.

## Yapı

```
public/index.html   → ağacın kendisi (frontend)
api/agac.js         → ağacı oku/kaydet
api/giris.js        → aile/admin şifresiyle giriş, oturum jetonu üretir
api/oneri.js        → onay kuyruğu (öneri gönder/listele/karar)
api/medya.js        → foto/video yükleme (Blob)
api/sohbet.js       → aile sohbeti / kişi yorumları
schema.sql          → Neon tabloları
```

## Not

Bu proje bir ailenin hatırasıdır — Fahri Arslan'ın 1956'da elle çizdiği soy
ağacının dijital, yaşayan hâli.
