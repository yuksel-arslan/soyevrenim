# Çınar becerisi (skill) — `api/_lib/beceri.js`

Çınar'ın **bilgi tabanı** ve **yanıt yöntemi** tek yerde. Amaç: siteyi ve içeriğini bilen, soy tarihi
ve yapılan araştırma hakkında kaynaklı, kısa ve doğru yanıt veren, bilmediğini uydurmayan bir asistan.

## Nasıl çalışır

```
soru ──► model (OpenAI gpt-5-mini) ──► bilgi_ara({sorgu, alan?}) ──► en uygun ≤ BECERI.sonucMax parça
                                                                    (başlık, bilgi, bulunabilir, güven, kaynak)
          └─ yanıt: yalnız araç sonucundan, güven etiketi sözle belirtilmiş, "Kaynak: …" satırıyla
```

Model bütün metni istemine almaz; yalnız soruya uyan parçalar gelir → daha az token, daha az uydurma.
Uyan parça yoksa araç `{sonuc: [], not: "… uydurma; bilmediğini söyle"}` döner.

## Alanlar (64 parça)

| Alan | İçerik | Kaynak modül |
|---|---|---|
| `soy` | Fahri Arslan'ın 1956 notu, zaman çizelgesi (1486 → 1959), yerler (Potocur/Dülgerli, Derbent, "Üçırmak" notu), adlar ("Molla", Uzunaloğulları) | `soy-tarihi.js` |
| `arastirma` | Osmanlı arşiv defterleri (1486, TT 442/1564, 1583, 1681/82 avârız, 1835 nüfus) ve her birinde **ne bulunabilir**, araştırma önerileri, gençler için adım adım rehber, arşiv sözlüğü (tahrir, mufassal, veled-i…), kaynakça (kategoriye göre) | `soy-tarihi.js` |
| `bolge` | Arhavi–Fındıklı / Doğu Karadeniz tarihi | `uzmanlik.js` |
| `lazca` | Selamlaşma, teşekkür, akrabalık adları | `uzmanlik.js` |
| `site` | Temel kullanım (`uzmanlik.js`) + güncel özellikler (`SITE_GUNCEL`): kayıt, giriş/çıkış, fotoğraf, ana ekran, sohbet ve bildirim, birleştirme, aynı ad kuralı, nesil hesabı, köken ekranı, Çınar | `beceri.js` |

`alan: 'soy'` araştırma parçalarını da kapsar (köken sorusu çoğu zaman arşive uzanır).

## Arama

- Türkçe katlama (büyük/küçük harf, aksan, ı/i) + dolgu sözcük ayıklama ("nedir", "nasıl", "bana"…).
- Ekler için kaba kök: uzun sözcüğün ilk `BECERI.kokHarf` harfi ("defterinde" ~ "defter").
- Puan: başlıkta eşleşme ×3, anahtar ×2, metin ×1; yıl/sayı tam eşleşirse +3. `BECERI.minPuan` altı elenir.
- Ayarlar `api/_lib/ayar.js → BECERI` (`sonucMax`, `minPuan`, `kokHarf`).

## Yanıt yöntemi (`YONTEM`, sistem istemine eklenir)

A. Soruyu sınıfla (kişi/akrabalık → ağaç araçları; köken/araştırma/bölge/site/Lazca → `bilgi_ara`; genel özet ve ağaç sayıları → `soy_tarihi`).
B. Yalnız araç sonucundan bilgi; tarih, ad, defter no, kaynak **uydurma**. Yoksa söyle ve yol öner.
C. Güveni sözle belli et: aile kaydı / kaynakta geçiyor / yorum / teyit gerekli.
D. Araştırma sorusunda somut sonraki adım (hangi defter, hangi sayfa/köy, nerede).
E. 3–6 cümle, en çok 4 madde; sonda en fazla bir takip sorusu; "Kaynak: …".
F. Site sorusunda düğme/menü adlarını olduğu gibi yaz; olmayan özellik anlatma.

Sistem isteminin diğer kuralları: kişi kimliklerini (id) yazma, Markdown kullanma (kural 12), "X ile Y aynı
kişi" isteğini birleştirmeye bırak (kural 13; bkz. `docs/asistan.md`).

## Genişletmek

- **Yeni araştırma bulgusu / kaynak:** `soy-tarihi.js` → `ARSIV`, `ZAMAN`, `YERLER`, `ADLAR`, `KAYNAKLAR` (güven etiketiyle). Beceri otomatik alır; `docs/kaynakca.md` ile uyumlu tut.
- **Yeni site özelliği:** `beceri.js → SITE_GUNCEL`'e `{baslik, anahtar, metin}` ekle (düğme adları ekrandakiyle aynı). İlgili `docs/*.md` ile uyumlu tut.
- **Bölge / Lazca:** `uzmanlik.js → BECERILER` (istemci de bunu kotasız yedek olarak kullanır).
- Her eklemeden sonra `npm test` (`test/beceri.test.mjs` doğru parçaya gidişi denetler).

## Testler

`test/beceri.test.mjs` (arama doğruluğu, güven etiketleri, ilgisiz soruda boş sonuç, alan süzgeci, yöntem
kuralları) · `test/api.test.mjs` → "araştırma sorusu → bilgi_ara" (model aracı çağırır, kaynaklı parçayı alır,
yöntem istemde).
