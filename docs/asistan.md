# Asistan — `POST /api/asistan`

Soy ağacı hakkında soru yanıtlayan ve konuşarak kişi/ilişki ekleme **önerisi** oluşturan LLM asistanı.
Tamamen ücretsiz katmanda çalışır (Groq). Kota dolunca mevcut Rehber (`KOMUTLAR` / `calistirKomut()`) yedek olarak yanıtlar.

## Akış

```
Rehber girişi / 🎤 ─► arayüz komutu mu? (köken, istatistik, kol, "3-6 nesil", tümünü göster…)
                        ├─ evet ─► calistirKomut() (yerel, kota harcamaz)
                        └─ hayır ─► POST /api/asistan
                                     ├─ kimlik yok / kota dolu / Groq 429 ─► {yedek:true, mesaj}
                                     │        └─ istemci: calistirKomut() + tek satır not
                                     └─ araç döngüsü (≤ 4 tur) ─► {yanit, gorsel, oneriler, kota}
```

- **Kimlik:** "adını seç" kişi id'si (`kisi_id`) + aile oturum jetonu (`jeton`). Jeton, ücretsiz kotayı internetteki
  rastgele isteklere karşı korur. Jeton yoksa Rehber yedeği: "Asistan için adını seçip aile şifresiyle giriş yap…"
- **Model ağaca yazmaz.** Ekleme/düzeltme `oneri_olustur` aracıyla `oneri` tablosuna **yama** (`islem`) olarak düşer;
  yönetici mevcut onay kutusundan onaylar. Onayda yama **o anki** ağaca uygulanır (araya giren onayları ezmez).
- **Belirsiz isim:** sistem istemi, birden çok eşleşmede tahmin yerine soru sormayı zorunlu kılar (ağaçta 37 tekrarlı ad var).
- **Kaynak:** yanıt sonunda `Kaynak: <kişi>'in anısı, <tarih>` ya da `Kaynak: soy ağacı kaydı`.
- **Görsel:** `yol_bul` çağrıldıysa istemci yolu ağaçta çizer (`gorsel.yol`), tek kişi getirildiyse kişiyi seçer (`gorsel.kisi`).

## Uç

`POST /api/asistan`

| Alan | Tür | Açıklama |
|---|---|---|
| `jeton` | string | `/api/giris` oturum jetonu (aile/admin) |
| `kisi_id` | string | "Bu evrene kim bakıyor?" ile seçilen kişi |
| `mesaj` | string | ≤ `ASISTAN.mesajMaxKarakter` |
| `gecmis` | `[{rol:'kullanici'\|'asistan', metin}]` | son `ASISTAN.gecmisTur` mesaj |

Yanıt (her zaman HTTP 200):

```json
{ "ok": true, "yanit": "…\nKaynak: soy ağacı kaydı", "gorsel": {"yol": ["p122221","p12221"]},
  "oneriler": [{"id": 12, "ozet": "+ Ayşe (Fahri'in kardeşi)"}], "kota": { … } }
{ "ok": false, "yedek": true, "sebep": "sistem|kisi|saglayici|hata", "mesaj": "Bugünkü ücretsiz asistan kotası doldu, yarın 03:00'te yenilenir." }
```

## Araçlar (sunucuda çalışır)

| Araç | Ne yapar |
|---|---|
| `kisi_ara {sorgu}` | İsimle arama (`api/_lib/agac.js → kisiAra`); baba/anne adı, nesil, yaşam durumu |
| `kisi_getir {kisi_id}` | Profil: ebeveyn, eş, çocuk, kardeş, meslek, eğitim, anılar (iletişim bilgisi **verilmez**) |
| `yol_bul {a_id, b_id}` | En kısa akrabalık yolu, adım ilişkileri, ortak ata, derece (istemcideki "Yol bul" ile aynı kod) |
| `ani_ara {sorgu, kisi_id?}` | Anı metni/başlık/tarih içinde arama |
| `oneri_olustur {islemler, aciklama}` | `kisi_ekle`, `iliski_ekle`, `bilgi_duzelt` yaması → onay kuyruğu |

Yama işlemleri (`api/_lib/oneri.js`):

| `tur` | Alanlar | Anlam |
|---|---|---|
| `kisi_ekle` | `ad, cinsiyet(E/K), yasiyor, iliski, hedef_id, ref?` | yeni kişi = hedefin `iliski`si (`cocugu, esi, kardesi, babasi, annesi`) |
| `iliski_ekle` | `kisi_id, hedef_id, iliski` | mevcut iki kişi arasında bağ |
| `bilgi_duzelt` | `kisi_id, alan(ad, cinsiyet, yasiyor, meslek, egitim, medeni), deger` | alan düzeltme |
| `ani_ekle` | `kisi_id, ani` | yalnızca sesli hikâye akışı kullanır |

Aynı öneride `ref: "$1"` ile yeni eklenen kişiye başvurulabilir (ör. eş + çocuğu). Geçersiz yama (var olan babanın üstüne
baba, bilinmeyen ilişki) araç sonucu olarak modele hata döner; öneri oluşmaz.

## İstem boyutu

`MESAJ_MAX_TOKEN` (4000): tüm ağaç **asla** isteme konmaz, araçla çekilir. Her istekten önce `sigdir()` kaba tahminle
(`ASISTAN.tokenKarakter` karakter ≈ 1 token) ölçer; aşarsa önce eski geçmiş, sonra en uzun araç sonucu kısaltılır.
Araç sonuçları ayrıca `ASISTAN.aracSonucMaxKarakter` ile kırpılır. Son turda araç verilmez → model yanıt yazmak zorunda.

## Kota (ücretsiz katman)

| Sınır | Değer (`api/_lib/ayar.js`) | Kontrol |
|---|---|---|
| Sistem günlük token | `GUNLUK_SISTEM.token` = 190.000 (Groq 200K'nın %95'i) | kalan < `MESAJ_MAX_TOKEN` ise başlatılmaz |
| Sistem günlük istek | `GUNLUK_SISTEM.istek` = 950 (Groq 1K'nın %95'i) | her Groq çağrısı sayılır (`kullanim.istek`) |
| Kişi günlük mesaj | `GUNLUK_KISI.mesaj` = 20 | `islem ∈ {soru, ekleme, duzenle}` satır sayısı |
| Gün sınırı | UTC 00:00 = **TR 03:00** | Groq sayaçlarıyla aynı an |

Ücretsiz kota hesabı: bir mesaj tipik olarak 2–3 Groq isteği ve ~3–6K token harcar → günde kabaca **30–60 asistan mesajı**
(token sınırı önce dolar). 20 mesaj/kişi sınırı, birkaç kişinin tüm kotayı tüketmesini engeller. Groq ayrıca dakikalık
sınır uygular; 429 gelirse kullanıcıya hata gösterilmez, Rehber yanıtlar.

Kayıt: her `/api/asistan` çağrısı **gerçek** `usage` (prompt/completion token toplamı ve istek sayısı) ile bir `kullanim` satırı
yazar (yarıda 429 olsa bile harcanan kısım yazılır).

## Tablolar

- `kullanim(id, kisi_id, tur['llm'|'stt'], model, girdi_tok, cikti_tok, istek, saniye, islem['soru'|'ekleme'|'hikaye'|'duzenle'], olusturma)`
- `oneri` + `islem jsonb` (yama), `kaynak` (`elle`|`asistan`|`hikaye`), `kisi_id` (öneren)

## Ortam değişkenleri

| Ad | Açıklama |
|---|---|
| `GROQ_API_KEY` | Groq API anahtarı (console.groq.com) |
| `DATABASE_URL` | Neon (mevcut) |
| `OTURUM_GIZLI` | jeton imzası (mevcut) |

## Groq ayarı (yönetici yapar)

1. console.groq.com → API Keys → anahtar oluştur → Vercel → Settings → Environment Variables → `GROQ_API_KEY`.
2. **Settings → Data Controls → Zero Data Retention: AÇ.** Aile anıları ve sorular Groq'ta saklanmaz.
3. Model değiştirmek: `api/_lib/ayar.js` → `LLM.model` (tek satır). Sağlayıcı OpenAI uyumlu uç kullanır (`SAGLAYICI`).

## Dosyalar

`api/asistan.js` · `api/_lib/ayar.js` · `api/_lib/groq.js` · `api/_lib/kota.js` · `api/_lib/kimlik.js` ·
`api/_lib/agac.js` (→ `public/lib/agac.js`) · `api/_lib/oneri.js` · istemci: `public/index.html` → `rehberGonder()`

## Test

`npm test` (birim) · `TEST_DATABASE_URL=postgres://… npm test` (uçtan uca; `npm i --no-save pg`).
Senaryolar: "Ayşe, Fahri'nin kız kardeşi" → belirsizlikte soru, netleşince öneri + onayda ağaca ekleme;
"Emine ile Fahri nasıl akraba?" → yol + kaynaklı yanıt; sistem/kişi kotası dolu → yedek; Groq 429 → yedek.
LLM testlerde **senaryolu taklittir**: tesisatı doğrular, modelin gerçek davranışını değil.
