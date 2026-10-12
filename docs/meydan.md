# Aile Meydanı — `api/meydan.js`

Ailenin sosyalleşme yeri: kutlamalar, haftanın sorusu, büyüğe sor, etkinlikler, fotoğraf etiketleme ve aylık özet.
Arayüz: araç çubuğundaki **Meydan** (🏡), hesap menüsü → **🏡 Aile Meydanı**, Çınar'a "aile meydanı / etkinlik /
doğum günü / haftanın sorusu / büyüğe sor". Tüm uçlar **aile şifresiyle giriş + kişi seçimi** ister (`jeton.kisi`).

## Sekmeler

| Sekme | Ne yapar | Veri |
|---|---|---|
| 🎂 Kutlamalar | Bugün ve `MEYDAN.dogumGunuOnGun` gün içindeki doğum günleri; **🎂 Kutla** → kart + not | doğum tarihi profilde `gün.ay.yıl` (`info.dogum`) |
| ❓ Haftanın sorusu | ISO haftasına göre `MEYDAN.haftaninSorulari`'ndan sıradaki soru; yanıtlar herkese açık; istenirse yanıt kendi kartına anı olur | `sohbet` tablosu, kapsam `hafta:YYYY-WW` |
| 👴 Büyüğe sor | Bir büyüğe soru; o yazıyla yanıtlar (ya da kartındaki 🎙 Hikâye anlat); yanıt istenirse yanıtlayanın kartına anı olur | `soru` tablosu |
| 📅 Etkinlikler | Duyur (ad, tarih, saat, yer, açıklama) → aileye push; katılım Geliyorum / Belki / Gelemem; geçmişler `MEYDAN.etkinlikGecmisGun` gün kalır | `etkinlik`, `etkinlik_katilim` |
| 📷 Fotoğraflar | Tüm galeriler; etiketsizler önce; "Bu fotoğrafta kim var?" | ağaç verisi: galeri öğesi `{url, etiket:[id]}` |
| ⭐ Bu ay | "Ailemizin bu ayı" (katkı özeti, `docs/kullanim.md`) | `kullanim`, `oneri` |

Ayrıca: Çınar'ın selamında ve mobil Çınar şeridinde **bugün doğum günü olan** varsa "🎂 … kutla" önerisi;
kişinin kartında **❓ … soru sor** ve **👥 Etiketlendiği fotoğraflar**.

## Uç (`POST /api/meydan?adim=…`)

| Adım | Gövde | Yanıt / not |
|---|---|---|
| `kutla` | `{jeton, kime, mesaj, gonderen_ad, kime_ad}` | Aile Sohbeti'ne "🎂 …'nin doğum günü kutlu olsun! — not" + kutlanana push |
| `soru-sor` | `{jeton, kime, metin, soran_ad}` | `{id}`; alıcıya push (`/?meydan=sor`) |
| `soru-liste` | `{jeton}` | `{bana, benden, son}` |
| `soru-yanitla` | `{jeton, id, yanit, yanitlayan_ad}` | yalnız sorulan kişi (aksi 403); sorana push |
| `etkinlik-ekle` | `{jeton, baslik, tarih:'YYYY-AA-GG', saat?, yer?, aciklama?, olusturan_ad}` | `{id}`; duyuran "evet" sayılır; aileye push (`/?meydan=etkinlik`) |
| `etkinlik-liste` | `{jeton}` | `{etkinlikler:[… , katilim:[{kisi, ad, durum}]]}` |
| `etkinlik-katil` | `{jeton, id, durum:'evet'|'belki'|'hayir', ad}` | aynı kişi yeniden yanıtlarsa güncellenir |
| `etkinlik-sil` | `{jeton, id}` | yalnız duyuran ya da yönetici (aksi 403) |

Girişsiz `401`, kişi seçilmemiş `400`. Push hatası işlemi bozmaz (`bildirim.hata`).

## Fotoğraf etiketleme

Galeri öğesi düz URL (`"…"`) ya da nesne: video `{url, video:true}`, etiketli foto `{url, etiket:[kişi id]}`.
Etiket eklenince öğe nesneye döner, tüm etiketler kaldırılınca düz URL'ye. Kayıt normal ağaç kaydıdır
(onay yok, öz-denetim ve günlükten geçer). Kod: `fotoEtiketAc()`.

## Tablolar

`soru`, `etkinlik`, `etkinlik_katilim` — `schema.sql`; tek başına **`sql/meydan.sql`** (Neon'da bir kez çalıştır).

## Ayarlar

`api/_lib/ayar.js → MEYDAN`: `dogumGunuOnGun`, `etkinlikGecmisGun`, `metinMax`, `listeMax`, `haftaninSorulari`
(istemciye `kamuAyar` ile). Soru eklemek/değiştirmek için listeyi düzenle.

## Ortam değişkenleri

`DATABASE_URL`, `OTURUM_GIZLI`; bildirim için VAPID (bkz. `docs/sohbet.md`).

## Testler

`test/meydan.test.mjs` — giriş şartı, kutlamanın sohbete düşmesi, soru/yanıt yetkisi, etkinlik ekle/katıl/sil yetkisi,
haftanın sorusu kapsamı.
