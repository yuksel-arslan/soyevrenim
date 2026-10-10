# Sesli hikâye — `/api/ses` · `/api/hikaye`

Kişi kartında **🎙 Hikâye anlat**: aile büyükleri kendi sesleriyle anlatır; ses saklanır, yazıya çevrilir, noktalama ve
paragraf eklenir, geçen kişi/yer/tarih çıkarılır ve sonuç **anı önerisi** olarak onay kutusuna düşer.

## Akış

```
MediaRecorder (webm/opus, mono, 32 kbps; iOS: mp4) ── her SES.parcaSn'de yeni dosya
   │  POST /api/ses/yukle-url  → imzalı PUT URL
   └─ PUT ─────────────────────► Cloudflare R2   (ses Vercel'den GEÇMEZ)
POST /api/hikaye?adim=olustur {parcalar}
   ├─ R2 HEAD ile gerçek boyut, anahtar sahibi kontrolü → hikaye_kuyruk
   ├─ kota var  → whisper (Groq, imzalı GET URL'den) → LLM düzenleme → anı + öneri  (durum: islendi)
   └─ kota yok  → "Kaydın saklandı, yazıya çevirme yarın yapılacak."            (durum: bekliyor)
Vercel Cron 00:30 UTC (03:30 TR) → GET /api/hikaye?adim=kuyruk → kota elverdikçe sırayla işler
```

- **25 MB sınırı / parçalama:** whisper tek dosyada `SES.parcaMaxMb` (25 MB) kabul eder. Parçalama kayıt sırasında yapılır:
  MediaRecorder her `SES.parcaSn` (20 dk ≈ 4,8 MB) saniyede yeniden başlatılır; her parça bağımsız, oynatılabilir bir dosyadır.
  Sunucu her parçayı R2 HEAD ile ölçer, 25 MB üstünü reddeder. (ffmpeg gerektirmez.)
- **İçerik değiştirme yok:** LLM'e yalnızca noktalama/paragraf görevi verilir; ayrıca `icerikKorundu()` bekçisi düzenlenmiş
  metnin ham sözcüklerin en az `SES.duzenleMinOran` (%90) kadarını koruduğunu doğrular — aksi hâlde **ham metin** kullanılır.
- **Uzun dökümler** `SES.duzenleParcaKarakter` ile cümle sınırından parçalanır (her istek `MESAJ_MAX_TOKEN` civarında).
- **Kişi önerileri:** hikâyede akrabalığı açıkça söylenen ve ağaçta olmayan kişi, hedef kişi **tek anlamlı** bulunursa aynı
  öneriye `kisi_ekle` olarak eklenir; belirsizse eklenmez.
- **Anı alanları** (ağaç JSON'unda, onaydan sonra): `kaynak:'ses'`, `ses_anahtar`, `ses_parcalar`, `transkript` (ham),
  `text` (düzenlenmiş, ≤ `HIKAYE_MAX_CHARS` = 20.000; yazılı anıların 1000 karakter sınırı uygulanmaz), `baslik`,
  `anlatan`, `anlatan_id`, `sure_sn`, `yerler`, `kisiler`, `date`.
- **Oynatma / indirme:** anıda `<audio>` + "⇩ İndir". Kova özeldir; `/api/ses/oku` kısa ömürlü imzalı URL'e yönlendirir.
- Onay beklerken kişi kartında "Kaydedilen sesli hikâyeler" altında oynatıcıyla görünür.

## Uçlar

| Uç | Gövde | Yanıt |
|---|---|---|
| `POST /api/ses/yukle-url` | `{jeton, kisi_id, tip}` (`audio/webm` \| `audio/mp4`) | `{anahtar, url, tip}` — tarayıcı `PUT url` (Content-Type: tip) |
| `GET /api/ses/oku?anahtar=…[&indir=1]` | — | 302 → imzalı R2 GET (`SES.imzaSureSn`) |
| `POST /api/hikaye?adim=olustur` | `{jeton, kisi_id, hedef_kisi_id, parcalar:[{anahtar, sn}], cevir?}` | `{id, durum:'islendi', oneri, baslik, metin}` veya `{id, durum:'bekliyor', mesaj}` |
| `POST /api/hikaye?adim=liste` | `{hedef_kisi_id}` | `{kayitlar:[{id, kisi_id, durum, baslik, saniye, parcalar, oneri_id}]}` |
| `GET /api/hikaye?adim=kuyruk` | `Authorization: Bearer $CRON_SECRET` | `{sonuc:[{id, durum}]}` |

`vercel.json`: `/api/ses/:adim → /api/ses?adim=:adim` yeniden yazımı, `crons: 30 0 * * *`, `api/hikaye.js maxDuration 60`.
Aynı işin cron ve anlık istekle iki kez işlenmesini `islenme` kilidi (`SES.kilitDk`) engeller.

## Tablo

`hikaye_kuyruk(id, kisi_id (anlatan), hedef_kisi_id, ses_anahtar, parcalar jsonb, saniye, bayt, durum['bekliyor'|'islendi'|'hata'], baslik, transkript, hata, oneri_id, olusturma, islenme)`

## Kota (ücretsiz katman)

| Sınır | Değer | Not |
|---|---|---|
| Sistem günlük ses | `GUNLUK_SISTEM.sesSn` = 27.000 sn (Groq 28.800'ün %95'i ≈ 7,5 saat) | whisper istek başına en az 10 sn sayar |
| Kişi günlük ses | `GUNLUK_KISI.sesDk` = 30 dk | anlatan kişiye yazılır |
| LLM düzenleme | sistem token kotasından düşer, kişi mesaj hakkından **düşmez** | tahmin: `SES.tokenDk` × dk × 2 |
| Depolama | R2 10 GB (`DEPOLAMA.kotaBayt`) | 32 kbps ≈ 0,24 MB/dk → **~700 saat** ses |

Kayıt: her yazıya çevirme bir `kullanim(tur='stt', saniye, islem='hikaye')`, düzenleme bir `kullanim(tur='llm', islem='hikaye')` satırı.

## Ortam değişkenleri

| Ad | Açıklama |
|---|---|
| `GROQ_API_KEY` | whisper + düzenleme |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Cloudflare R2 (S3 uyumlu API jetonu, yalnızca bu kova: Object Read & Write) |
| `CRON_SECRET` | Vercel Cron yetkisi (Vercel otomatik `Authorization: Bearer` gönderir) |

## R2 kurulumu

1. Cloudflare → R2 → kova oluştur (ör. `soyevrenim-ses`), **public erişim kapalı**.
2. R2 → Manage API Tokens → "Object Read & Write", yalnızca bu kova → anahtarları Vercel env'e gir.
3. Kova → Settings → **CORS**:
   ```json
   [{"AllowedOrigins":["https://soyevrenim.com"],"AllowedMethods":["PUT","GET","HEAD"],"AllowedHeaders":["content-type"],"MaxAgeSeconds":3600}]
   ```
4. İmza bağımlılıksızdır (`api/_lib/r2.js`, AWS SigV4); AWS belge örnek vektörüyle test edilir.

## Dosyalar

`api/ses.js` · `api/hikaye.js` · `api/_lib/hikaye-isle.js` · `api/_lib/r2.js` · `api/_lib/groq.js` ·
istemci: `hikayeAnlat()`, `bekleyenHikayeler()`, `sesOynaticiHtml()`
