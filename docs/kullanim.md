# Kullanım paneli — "Ailemizin bu ayı" · `/api/kullanim`

Maliyet tablosu değil; ailenin emeğini anlatan sayfa. Asistan (Çınar) panelindeki ince kota çubuğuna tıklayınca açılır.
Kütüphanesiz, elle SVG; yalnızca tema token'ları (`--spine`, `--accent`, `--line`…) — dark / light / yadigar.

## Bölümler

| Bölüm | Veri | Görsel |
|---|---|---|
| Üst cümle | ayın hikâye sayısı, ses dakikası, onaylanan yeni kişi | "Bu ay ailemiz 4 hikâye anlattı, 47 dakika ses, 6 yeni kişi ekledi." |
| Bugünkü ortak kota | sistem token/istek oranının büyüğü | `--spine` halka (kırmızı yok) + "Senin bugünkü hakkın: 14/20 mesaj", ses dk |
| Ses arşivi | `hikaye_kuyruk.bayt` toplamı | "Ses arşivi 1,2 GB / 10 GB" çubuğu |
| Kim neler kattı | kişi başı hikâye sn + onaylanan eklenen kişi | fotoğraflı yatay yığılmış çubuk, "bu ayın anlatıcısı" rozeti |
| Ayın hikâyeleri | ay içindeki kayıtlar | gün ekseninde noktalar (süreye göre büyür; bekleyenler soluk), üzerine gelince/dokununca başlık + anlatan |

Harcama ya da kişi bazında kota tüketimi **gösterilmez** (yalnızca kişinin kendi hakkı); katkılar görünür.
Sıralama ağırlığı: `KATKI.kisiAgirlikSn` (1 eklenen kişi = 60 sn hikâye).

Mobil: 16 px kenar, tek sütun, yatay kaydırma yok (Playwright ile 390 px genişlikte doğrulandı — `docs/ekran/`).

## Uçlar

| Uç | Gövde | Yanıt |
|---|---|---|
| `GET /api/kullanim?adim=ayar` | — | kamuya açık sınırlar (`kamuAyar()`), 5 dk önbellek |
| `POST /api/kullanim?adim=durum` | `{kisi_id?}` | `{kota:{sistem:{token,istek,sesSn}, kisi:{mesaj,sesSn}, limit, yenilenme}}` |
| `POST /api/kullanim?adim=ay` | `{kisi_id?}` | `{ay, ozet:{hikaye, ses_sn, yeni_kisi}, katki[], seridi[], depolama:{bayt,kota}, kota}` |

## Kaynak tablolar

- `kullanim` — kota sayaçları (ayrı sayaç yok; gün = UTC günü, TR 03:00'te yenilenir)
- `hikaye_kuyruk` — hikâyeler, süre, boyut
- `oneri` — `durum='onaylandi'` ve `karar_zaman` bu ay; `fark.eklenen` uzunluğu, `kisi_id` (öneren)

## Kota ve maliyet (özet)

| Kaynak | Sınır | Sistemin kullandığı | Pratikte |
|---|---|---|---|
| OpenAI `gpt-5-mini` (ücretli) | günlük tavan 950 istek, 190K token | tavan = harcama sınırı | ~30–60 asistan mesajı / gün |
| OpenAI `whisper-1` (ücretli) | günlük tavan 27.000 sn | tavan = harcama sınırı | ~7,5 saat ses / gün |
| Cloudflare R2 | 10 GB | `DEPOLAMA.kotaBayt` | ~700 saat ses (32 kbps) |
| Vercel Hobby | 12 fonksiyon | 9 fonksiyon | `agac, giris, medya, oneri, sohbet, asistan, ses, hikaye, kullanim` |
| Neon | mevcut | — | tablolar küçük |

Sitede kullanıcıdan ödeme alınmaz (Vercel Hobby ticari kullanımı yasaklar); OpenAI faturası yöneticinin hesabına gelir.

## Dosyalar

`api/kullanim.js` · `api/_lib/kota.js` · istemci: `aileAyiAc()`, `aileAyiCiz()`, `seritCiz()`, `kotaGoster()`
