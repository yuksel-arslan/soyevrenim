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
│   ├── agac.js           ← veritabanına oku/yaz (Vercel fonksiyonu)
│   ├── giris.js          ← aile/admin şifresiyle giriş, oturum jetonu
│   ├── oneri.js          ← onay kuyruğu (öneri gönder/listele/karar)
│   ├── medya.js          ← foto/video yükleme (Vercel Blob)
│   └── sohbet.js         ← aile sohbeti / kişi yorumları
├── schema.sql            ← Neon'da bir kez çalıştırılacak tablo kurulumu
├── package.json          ← bağımlılık (@neondatabase/serverless)
├── vercel.json           ← Vercel ayarı
└── KURULUM.md            ← bu dosya
```

---

## Yetkiler — kim kimi düzenler?

Bu sürümde herkes **sadece kendi yakınlarını** düzenleyebilir:
kendisi + ebeveyni + kardeşleri + çocukları + eşi. Düzenlemek için kişi
**aile şifresiyle** giriş yapar. Giriş yapmayan herkes ağacı görür ama düzenleyemez.

**Sen (admin) her şeyi düzenleyebilirsin** — sol alttaki 🔑 ile admin şifreni girersin.

### Nasıl çalışır (özet)

1. İki şifre vardır: **aile şifresi** (tüm aileye verdiğin ortak şifre) ve
   **admin şifresi** (yalnızca sende).
2. Kişi siteye girer → şifre alanına aile şifresini yazar.
3. Sunucu (`/api/giris`) şifreyi kontrol eder, imzalı bir **oturum jetonu** verir.
   Jeton tarayıcıda saklanır, **30 gün** geçerlidir.
4. Aile jetonu → öneri gönderme + sohbet. Admin jetonu → onaylama + doğrudan düzenleme.

> Şifreler sunucuda, ortam değişkenlerinde durur — sayfanın kaynağında **görünmez**.
> Jeton `OTURUM_GIZLI` ile HMAC-SHA256 imzalanır, taklit edilemez.

**Şifreleri değiştirmek:** Vercel → Settings → Environment Variables → `AILE_SIFRESI`
veya `ADMIN_SIFRESI` değerini güncelle → Redeploy. Kodda hiçbir değişiklik gerekmez.

---

## Giriş sistemi — harici servis gerekmez

Giriş tamamen kendi sunucunda çalışır: SMS servisi, telefon numarası, üçüncü taraf
hesap yok. Sadece üç ortam değişkeni gerekir (3. adımdaki tabloda):

| Değişken | Ne işe yarar |
|----------|--------------|
| `AILE_SIFRESI` | Ailenin ortak şifresi — öneri gönderme + sohbet yetkisi |
| `ADMIN_SIFRESI` | Senin yönetici şifren — onay + doğrudan düzenleme |
| `OTURUM_GIZLI` | Jetonları imzalamak için en az 40 karakterlik rastgele metin |

**Maliyet: sıfır.** (Önceki sürümde SMS için Twilio kullanılıyordu; bu sürümde
tamamen kaldırıldı — `TWILIO_*` değişkenlerine artık gerek yok, varsa silebilirsin.)

> Aile şifresini değiştirmek istediğinde tek yapman gereken Vercel'de değeri
> güncelleyip yeniden dağıtmak; eski jetonlar 30 gün içinde kendiliğinden düşer.

---

## Onay sistemi — istenmeyen kayıtları önle

Bu sürümde **kimse ana ağacı doğrudan değiştiremez.** Akış şöyle:

1. Aile şifresiyle giren bir kişi kendi yakınlarında değişiklik yapar (ekler/düzenler).
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

## Sohbet — aile buluşma alanı

İki tür sohbet var:

1. **Genel aile sohbeti** — sol alttaki 💬 düğmesiyle açılır. Tüm ailenin
   yazdığı ortak akış. Anı paylaşımı, sohbet, haberleşme için.
2. **Kişi yorumları** — her kişinin panelinde "Yorumlar" bölümü. O kişi
   hakkında yazılır (anı, not, "seni özledik" gibi).

**Kim yazar:** Aile şifresiyle giren herkes yazabilir (onaya gerek yok — sohbet akıcı olsun).
Giriş yapmayanlar okur ama yazamaz. Herkes kendi mesajını silebilir; admin hepsini silebilir.

> Sohbet mesajları ağaç düzenlemesinden farklı — onaydan geçmez, anında görünür.
> (Ağaç değişiklikleri hâlâ senin onayından geçer; sadece sohbet serbest.)

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
| `AILE_SIFRESI` | Ailenin ortak şifresi — bunu aile üyelerine verirsin |
| `ADMIN_SIFRESI` | Senin yönetici şifren — kimseyle paylaşma |
| `OTURUM_GIZLI` | En az 40 karakter rastgele metin (jeton imzası için) |
| `BLOB_READ_WRITE_TOKEN` | **Otomatik** — Blob deposu oluşturunca Vercel kendi ekler |

Kaydet, sonra **Deployments → en üstteki → ⋯ → Redeploy** (değişkenlerin geçerli olması için).

> `AILE_SIFRESI`, `ADMIN_SIFRESI` ve `OTURUM_GIZLI` girilmezse giriş çalışmaz —
> ağaç görüntülenir ama kimse düzenleme öneremez ve sohbete yazamaz.
> `OTURUM_GIZLI` için örnek üretme yolu: `openssl rand -hex 32`

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

**Fotoğraflar ortak mı?**
Evet. Vercel Blob'da saklanır, ekleyen kim olursa olsun herkes görür
(yukarıdaki "Fotoğraf & Video" bölümüne bak).

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
Zaten öyle: düzenleme önerisi göndermek için aile şifresi gerekir, ve hiçbir öneri
senin onayın olmadan ağaca işlenmez. Şifreyi kimlere verdiğin tamamen sende.

---

Hazır olduğunda, fotoğrafları da buluta taşımak veya düzenleme iznini kısıtlamak
istersen, o adımları da ekleyebiliriz.
