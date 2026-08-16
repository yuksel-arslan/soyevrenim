# KÖK · Ortak Soy Ağacı — Kurulum Rehberi (Vercel + Neon)

Bu rehber, ağacı **herkesin girip görebileceği ve düzenleyebileceği** canlı bir siteye
dönüştürür. Fotoğraflar şimdilik her kişinin kendi cihazında kalır; ağacın kendisi
(kişiler, bağlar, iletişim, anılar) ise ortak veritabanında toplanır — biri ekleyince
herkes görür.

Zaten Vercel ve Neon kullandığın için sana tanıdık gelecek. ~15 dakika sürer.

---

## Klasördeki dosyalar

```
kok-canli/
├── public/
│   └── index.html        ← ağacın kendisi (senin tasarımın)
├── api/
│   └── agac.js           ← veritabanına oku/yaz (Vercel fonksiyonu)
├── schema.sql            ← Neon'da bir kez çalıştırılacak tablo kurulumu
├── package.json          ← bağımlılık (@neondatabase/serverless)
├── vercel.json           ← Vercel ayarı
└── KURULUM.md            ← bu dosya
```

---

## Yetkiler — kim kimi düzenler?

Bu sürümde herkes **sadece kendi yakınlarını** düzenleyebilir:
kendisi + ebeveyni + kardeşleri + çocukları + eşi. Düzenlemek için kişi
**telefonuyla SMS doğrulaması** yaparak giriş yapar (gerçek kimlik kanıtı).
Giriş yapmayan herkes ağacı görür ama düzenleyemez.

**Sen (admin) her şeyi düzenleyebilirsin** — sol alttaki 🔑 ile admin koduyla girersin.

### Nasıl çalışır (özet)

1. Sen admin olarak her kişinin kaydına **giriş telefonunu** girersin
   (panelde, admin modundayken "Giriş telefonu" alanı çıkar).
2. Kişi siteye girer → telefonunu yazar → telefonuna **6 haneli SMS kodu** gelir.
3. Kodu girer → o kişi olarak giriş yapar, yakınlarını düzenleyebilir.
4. Numara ağaçta kayıtlı değilse giriş yapamaz (senden eklemeni ister).

---

## SMS için Twilio kurulumu (giriş sistemi bunu kullanır)

SMS göndermek için bir servis gerekir. Twilio en yaygını:

1. twilio.com'da hesap aç (deneme kredisi verir; kalıcı kullanım için kart eklersin).
2. Bir telefon numarası al (SMS gönderebilen) — panelde "Phone Numbers → Buy a number".
   - Alternatif: "Messaging Service" oluşturup onun SID'ini kullanabilirsin.
3. Console'dan şunları al: **Account SID**, **Auth Token**, ve aldığın **numara**.
4. Bunları Vercel'e ortam değişkeni olarak gir (aşağıda 3. adımda hepsi birlikte).

**Maliyet:** Türkiye'ye SMS ~$0.02–0.04/adet. Ayda birkaç yüz giriş olsa birkaç dolar.
Twilio deneme kredisi başlangıç için yeter.

> SMS istemiyorsan / maliyet istemiyorsan: giriş sistemini kapatıp herkesin açık
> düzenlediği moda dönebiliriz, ya da e-posta ile kod (ücretsiz) kurabiliriz. Söyle yeter.

---

## Admin kodunu değiştir (ÖNEMLİ)

Varsayılan `kok-admin`. Değiştir:
1. `public/index.html`'i aç, `ADMIN_CODE` ara.
2. `const ADMIN_CODE = "kok-admin";` → tırnak içini kendi kodunla değiştir.
3. Ayrıca sunucu tarafı için Vercel'e `ADMIN_CODE` ortam değişkenini de ekle (3. adımda).

---

## Onay sistemi — istenmeyen kayıtları önle

Bu sürümde **kimse ana ağacı doğrudan değiştiremez.** Akış şöyle:

1. SMS ile giren bir kişi kendi yakınlarında değişiklik yapar (ekler/düzenler).
2. Ekranın altında **"Kaydedilmemiş değişikliklerin var → Onaya gönder"** çubuğu çıkar.
3. Kişi "Onaya gönder"e basar → değişiklik sana **öneri** olarak iletilir.
4. Sen (admin) sol alttaki **📋 Onay kutusu**'nda bekleyen önerileri görürsün:
   - Kim gönderdi, ne zaman, tam olarak ne değişti (yeni kişi / düzenleme / silme).
   - Her öneride **✓ Onayla** ve **✕ Reddet** düğmeleri.
5. **Onayla** → değişiklik ana ağaca işlenir, herkes görür.
   **Reddet** → değişiklik çöpe gider, ağaca hiç ulaşmaz.

Böylece istenmeyen ya da yanlış hiçbir kayıt senin onayın olmadan yayınlanmaz.
Kimin ne yaptığı da her öneride yazılıdır — tam denetim sende.

> Admin (sen) kendi yaptığın düzenlemeleri doğrudan kaydeder (onaya gerek yok).
> Onay kutusundaki sayı rozeti, kaç öneri beklediğini gösterir.

**Geçmişi görmek / geri almak:** Tüm öneriler `oneri` tablosunda durur (onaylanan,
reddedilen dahil). Neon SQL Editor'da geçmişi görebilir, gerekirse eski bir ağaç
durumunu geri yazabilirsin:
```sql
-- son önerileri gör
select id, durum, gonderen_ad, ozet, olusma from oneri order by olusma desc limit 20;
```

---

## Fotoğraf & Video — Vercel Blob

Foto ve videolar artık **ortak** saklanır (herkes görür), Vercel Blob'da. Kurulumu:

1. Vercel'de projene gir → üstten **Storage** → **Create Database** → **Blob** seç → oluştur.
2. Vercel otomatik olarak `BLOB_READ_WRITE_TOKEN` değişkenini projene ekler — ekstra iş yok.
3. `package.json`'da `@vercel/blob` zaten var; deploy edince kurulur.

Artık bir kişinin panelinden fotoğraf ya da video eklediğinde Blob'a yüklenir,
herkes görür. Video için "Fotoğraf / Video ekle" düğmesini kullan (aynı yerden).

**Sınırlar / maliyet:**
- Bu sürümde dosya başına **50 MB** sınırı var (kısa videolar için ideal; ayarlanabilir).
- Vercel Blob ücretsiz katman: belli bir depolama + trafik ücretsiz, sonrası cüzi.
  Aile fotoğrafları/kısa videolar için başlangıçta ücretsiz katman yeter.
- Uzun/çok sayıda video biriktikçe ücretli katmana geçebilirsin — panelden takip edilir.

> Not: Fotoğraflar yüklenmeden önce otomatik küçültülür (hızlı yüklensin, yer kaplamasın).
> Videolar olduğu gibi yüklenir.

---

## soyevrenim.com'u bağla (Squarespace)

Domain Squarespace'ten alındığı için DNS'i oradan yönlendireceğiz.

**A) Vercel tarafı:**
1. Vercel'de projene gir → **Settings → Domains**.
2. `soyevrenim.com` yaz → **Add**. (İstersen `www.soyevrenim.com`'u da ekle.)
3. Vercel sana bağlanman için DNS kayıtlarını gösterir. Genelde:
   - **A** kaydı: `@` → `76.76.21.21`
   - **CNAME** kaydı: `www` → `cname.vercel-dns.com`
   - (Vercel'in ekranında gösterdiği güncel değerleri esas al.)

**B) Squarespace tarafı:**
1. Squarespace hesabına gir → **Settings → Domains** → `soyevrenim.com`'a tıkla.
2. **DNS Settings** (veya "Advanced / Custom Records") bölümünü aç.
3. Vercel'in verdiği kayıtları ekle:
   - A kaydı: Host `@`, Value `76.76.21.21`
   - CNAME: Host `www`, Value `cname.vercel-dns.com`
   - (Squarespace'in kendi eklediği çakışan A/CNAME kayıtları varsa, `@` ve `www`
     için olanları Vercel'inkilerle değiştir.)
4. Kaydet.

**C) Bekle:**
- DNS yayılması birkaç dakika–birkaç saat sürer. Vercel Domains ekranında
  `soyevrenim.com` yanında yeşil "Valid Configuration" görünce hazır demektir.
- Vercel otomatik **https (SSL)** sağlar — ekstra iş yok.

Artık ailene `https://soyevrenim.com` linkini verebilirsin.

> Squarespace'te "domain'i Squarespace sitesine bağlı tutma" uyarısı çıkarsa,
> endişelenme — sadece DNS kayıtlarını Vercel'e yönlendiriyoruz, domain sahipliği
> sende kalır.

---

## 1) Neon: veritabanını hazırla

1. neon.tech → projene gir (ya da yeni proje aç, ücretsiz).
2. Sol menüden **SQL Editor**'ı aç.
3. `schema.sql` dosyasının içeriğini kopyala, editöre yapıştır, **Run**.
   - Bu, `agac` (ana kayıt) ve `gunluk` (değişiklik geçmişi) tablolarını oluşturur.
4. Sol menüden **Connection Details** (ya da Dashboard) → bağlantı dizesini kopyala.
   - Şöyle görünür: `postgresql://kullanici:sifre@ep-xxx.neon.tech/dbname?sslmode=require`
   - Bunu birazdan Vercel'e gireceğiz. **Kimseyle paylaşma.**

---

## 2) Vercel: siteyi yayına al

**Yol A — GitHub üzerinden (önerilen, güncellemesi kolay):**
1. Bu `kok-canli` klasörünü bir GitHub deposuna yükle.
2. vercel.com → **Add New → Project** → o depoyu seç → **Import**.
3. Ayarları değiştirmeden **Deploy** de (Vercel `api/` ve `public/`'i otomatik tanır).

**Yol B — Vercel CLI ile (bilgisayardan):**
```bash
npm i -g vercel          # bir kez
cd kok-canli
vercel                   # soruları geç, deploy et
```

---

## 3) Ortam değişkenlerini Vercel'e ver

Vercel'de projene gir → **Settings → Environment Variables** → şunları ekle:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Neon bağlantı dizesi (1. adımdan) |
| `ADMIN_CODE` | Kendi gizli admin kodun (index.html'dekiyle aynı olsun) |
| `TWILIO_SID` | Twilio Account SID |
| `TWILIO_TOKEN` | Twilio Auth Token |
| `TWILIO_FROM` | Twilio numaran (`+1...`) veya Messaging Service SID (`MG...`) |
| `BLOB_READ_WRITE_TOKEN` | **Otomatik** — Blob deposu oluşturunca Vercel kendi ekler |

Kaydet, sonra **Deployments → en üstteki → ⋯ → Redeploy** (değişkenlerin geçerli olması için).

> SMS kullanmayacaksan `TWILIO_*` değişkenlerini boş bırakabilirsin — ama o zaman
> telefonla giriş çalışmaz (sadece admin kodu ve görüntüleme olur).

---

## 4) Bitti — test et

- Vercel'in verdiği adrese gir (`https://senin-projen.vercel.app`).
- Açılışta "Ortak ağaca bağlandın" ipucunu görmelisin.
- Bir kişinin bilgisini düzenle. Başka bir cihaz/tarayıcıdan aynı adrese gir:
  değişikliğin orada olmalı (30 sn içinde otomatik gelir; sayfa yenilersen hemen).

Artık linki ailene / Facebook'a koyabilirsin. Herkes girer, görür, ekler.

---

## Nasıl çalışıyor? (kısaca)

- Ağacın tamamı Neon'da **tek bir JSON kaydı** olarak durur (250 kişi için en hızlı, en basit yol).
- Biri düzenleyince site `/api/agac`'a yazar; herkes 30 saniyede bir otomatik güncellenir.
- İnternet yoksa ya da dosyayı doğrudan açarsan, site sessizce **yerel modda** çalışır
  (senin tek-dosya sürümün gibi) — hiçbir şey kırılmaz.

---

## Sık sorulanlar

**Ücretsiz katman yeter mi?**
Fazlasıyla. Neon 0.5 GB (metin ağacı bunun binde birini bile doldurmaz), Vercel Hobby
aylık 100 GB trafik. Bir aile için yıllarca sorun çıkmaz.

**Fotoğraflar neden ortak değil?**
Bu sürümde fotoğraflar cihazda kalıyor (basit tutmak için). İstersen sonraki adımda
Vercel Blob ekleyip fotoğrafları da ortak yaparız — `api/foto.js` eklemek yeterli.

**Biri yanlışlıkla bozarsa?**
Her kayıt `gunluk` tablosuna da yazılıyor. Neon SQL Editor'da eski bir kaydı bulup
`agac`'a geri yazarak önceki hâle dönebilirsin:
```sql
-- son 10 değişikliği gör
select id, guncelleyen, zaman from gunluk order by zaman desc limit 10;
-- beğendiğin bir kaydı geri yükle (örnek: gunluk id=42)
update agac set veri = (select veri from gunluk where id = 42) where id = 1;
```

**Sadece belirli kişiler düzenlesin istersem?**
Şimdilik herkes açık düzenliyor (senin tercihin). İleride basit bir "düzenleme şifresi"
ya da giriş ekleyebiliriz.

---

Hazır olduğunda, fotoğrafları da buluta taşımak veya düzenleme iznini kısıtlamak
istersen, o adımları da ekleyebiliriz.
