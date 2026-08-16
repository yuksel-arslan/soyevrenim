# soyevrenim.com — Vercel'e Yükleme Rehberi
### (GitHub'sız, doğrudan yükleme)

Bu rehber, `kok-canli.zip` içindeki soy ağacını canlıya alır. ~15 dakika.

Yükleme sırası:
1. Neon veritabanını kur (ağaç burada saklanacak)
2. Kodu Vercel'e yükle
3. Ortam değişkenlerini gir
4. soyevrenim.com'u bağla

---

## ADIM 1 — Neon Veritabanı (5 dk)

1. **neon.tech** → giriş yap (zaten hesabın var)
2. **New Project** → bir isim ver (ör. "soyevreni") → **Create**
3. Sol menüde **SQL Editor**'ı aç
4. `kok-canli/schema.sql` dosyasını bir metin düzenleyiciyle aç, **tüm içeriğini** kopyala
5. SQL Editor'a yapıştır → **Run** (bir kez çalıştır, tablolar kurulur)
6. Sol menüde **Connection Details** → bağlantı dizesini kopyala
   (şöyle görünür: `postgresql://kullanici:sifre@ep-xxx.neon.tech/dbname?sslmode=require`)
   → Bunu bir kenara not et, ADIM 3'te lazım (DATABASE_URL)

---

## ADIM 2 — Kodu Vercel'e Yükle (3 dk)

### Yöntem A — Sürükle-Bırak (en kolay)

1. **vercel.com** → giriş yap
2. **Add New...** → **Project**
3. Açılan sayfada **"Deploy without Git"** ya da alttaki **"Browse"/"Upload"** seçeneğini bul
   (Vercel bazen bunu "Import Third-Party Git Repository" altında "deploy a template or upload" olarak gösterir)
4. `kok-canli` **klasörünü** (zip'i açtıktan sonra) sürükle-bırak
5. Framework Preset: **Other** (otomatik algılar)
6. **HENÜZ Deploy'a BASMA** — önce ADIM 3'teki ortam değişkenlerini gir

### Yöntem B — Vercel CLI (terminal seversen)

Bilgisayarında terminal aç, `kok-canli` klasörüne gir:
```
npm i -g vercel      # bir kez, Vercel komut aracını kurar
cd kok-canli         # klasöre gir
vercel               # giriş yapıp yükler (sorulara Enter yeterli)
```
Sonra ortam değişkenlerini eklemek için ADIM 3'e geç, ardından:
```
vercel --prod        # canlıya alır
```

---

## ADIM 3 — Ortam Değişkenleri (5 dk)

Vercel'de proje → **Settings** → **Environment Variables**.
Şunları tek tek ekle (Name / Value):

| Name | Value (ne yazacaksın) |
|------|------------------------|
| `DATABASE_URL` | ADIM 1'de kopyaladığın Neon bağlantı dizesi |
| `ADMIN_CODE` | Kendi belirlediğin yönetici şifresi (ör. güçlü bir parola) |
| `TWILIO_SID` | Twilio hesabından (SMS girişi için) |
| `TWILIO_TOKEN` | Twilio hesabından |
| `TWILIO_FROM` | Twilio telefon numaran (+1...) |
| `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob → Create, verilen token |

**Not — Twilio ve Blob şart mı?**
- **Twilio yoksa:** SMS girişi çalışmaz ama ağaç görüntülenir. Admin (sen) 🔑 ile ADMIN_CODE girip düzenlersin. İstersen Twilio'yu sonra eklersin.
- **Blob yoksa:** Fotoğraf yükleme çalışmaz, ama fotoğraflar zaten cihazda da tutulur. Sonra eklenebilir.
- **DATABASE_URL ve ADMIN_CODE zorunlu** — bunlar olmadan ağaç kaydedilemez.

Değişkenleri girdikten sonra **Deploy**'a bas (Yöntem A) ya da `vercel --prod` (Yöntem B).

---

## ADIM 4 — soyevrenim.com'u Bağla (2 dk)

1. Vercel'de proje → **Settings** → **Domains**
2. `soyevrenim.com` yaz → **Add**
3. Vercel sana DNS ayarlarını gösterir. Domain'i aldığın yerde (Squarespace)
   DNS bölümüne git, Vercel'in verdiği kayıtları ekle:
   - Genelde: `A` kaydı → `76.76.21.21`
   - veya `CNAME` → `cname.vercel-dns.com`
4. Birkaç dakika–saat içinde yayına girer (DNS yayılması)

---

## Bittiğinde

- **soyevrenim.com** → ağaç herkese açık görünür
- **Sen:** sol alttaki 🔑 → ADMIN_CODE ile girersin, her şeyi düzenlersin
- **Aile:** (Twilio kurduysan) telefonuyla SMS girişi yapıp yakınlarını düzenler,
  önerileri sen onaylarsın

Takıldığın adımı söyle, birlikte çözelim.
