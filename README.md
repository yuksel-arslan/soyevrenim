# KÖK · Abdurrahman Oğulları Soy Ağacı

Ortak, canlı bir aile soy ağacı. Herkes girip görebilir; aile şifresiyle giren
kişiler güvenilir sayılır: değişiklikleri hemen kaydedilir (yönetici onayı yok); sistem her kayıtta
kendini denetler, çelişkide ilgilileri uyarır.

## Özellikler

- **Bloom tarzı görsel ağaç** — nesil halkaları, eğik disk perspektifi, dinamik merkez
- **Herkes kendi bakışının merkezinde** — kim bakıyorsa onun soyu aydınlanır
- **Aile şifresiyle giriş** — ortak şifre girilir, imzalı oturum jetonu verilir (SMS/telefon yok)
- **Onay yok, öz-denetim var** — aile şifresiyle giren doğrudan kaydeder; çelişkide kaydeden ve bilgiyi ilk giren uyarılır · [docs/agac.md](docs/agac.md)
- **Foto & video** — Cloudflare R2'de (sesli hikâyelerle aynı depo) ortak saklanır, herkes görür
- **Fotoğraflı avatarlar, iletişim, sosyal medya, anılar**
- **Mobil uyumlu, dark/light/yadigâr**
- **Kullanma kılavuzu** — aile üyeleri için kısa rehber: `/kilavuz.html` (karşılama ekranındaki bağlantı, alt/sol çubuktaki “Kılavuz” düğmesi ve hesap menüsü; tema sitedekiyle aynı)
- **Aile Meydanı** — doğum günü kutlama, haftanın sorusu, büyüğe sor, etkinlikler, fotoğrafta kim var · [docs/meydan.md](docs/meydan.md)
- **Tanışma daveti** — birbirini tanımayan akrabalara şık kart; kabulde iki kişilik özel sohbet · [docs/sohbet.md](docs/sohbet.md)
- **Asistan** — soru yanıtlar, konuşarak kişi ekleme önerir (OpenAI GPT, günlük harcama tavanlı) · [docs/asistan.md](docs/asistan.md) · beceri: [docs/cinar-beceri.md](docs/cinar-beceri.md)
- **Sesli hikâye** — kendi sesinle anlat; saklanır, yazıya çevrilir, anı olarak doğrudan karta eklenir · [docs/hikaye.md](docs/hikaye.md)
- **Kökenimiz ve araştırma köşesi** — Fahri Arslan'ın 1956 notu, Osmanlı arşiv kayıtları, gençler için adım adım rehber, sözlük ve kaynakça · [docs/kaynakca.md](docs/kaynakca.md)
- **Ailemizin bu ayı** — kota, katkılar, hikâye şeridi · [docs/kullanim.md](docs/kullanim.md)

## Teknoloji

- Frontend: tek dosya (`public/index.html`) — kütüphane bağımlılığı yok, saf Canvas
- Backend: Vercel Serverless Functions (`api/`)
- Veritabanı: Neon (PostgreSQL)
- Medya: Cloudflare R2 (imzalı yükleme, doğrudan tarayıcıdan)
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
api/meydan.js       → Aile Meydanı (kutla, büyüğe sor, etkinlik)
api/oneri.js        → öneriler (Çınar / sesli hikâye hazırlar; sahibi ya da yönetici "✓ Ağaca işle")
api/medya.js        → foto/video yükleme (Blob)
api/sohbet.js       → aile sohbeti / kişi yorumları
api/asistan.js      → LLM asistanı (araç döngüsü, kota, öneri)
api/ses.js          → R2 imzalı ses yükleme / okuma
api/hikaye.js       → sesli hikâye: yazıya çevirme, kuyruk, gece cron'u
api/kullanim.js     → kota durumu, "Ailemizin bu ayı"
api/_lib/ayar.js    → model / kota / limit — tek kaynak
api/_lib/agac.js    → yol bulma, ortak ata, kişi arama (public/lib/agac.js'e kopyalanır: npm run build)
schema.sql          → Neon tabloları
test/               → npm test (DB testleri: TEST_DATABASE_URL + npm i --no-save pg)
```

## Not

Bu proje bir ailenin hatırasıdır — Fahri Arslan'ın 1956'da elle çizdiği soy
ağacının dijital, yaşayan hâli.
