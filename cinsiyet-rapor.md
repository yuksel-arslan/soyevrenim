# Cinsiyet Doğrulama ve Düzeltme Raporu

Kaynak: canlı `/api/agac` · düzeltme sonrası anlık görüntü `2026-08-17T06:46:59Z`
Durum: **çelişkiler giderildi (46 düzeltme uygulandı)**

## Özet

| | |
|---|---|
| Toplam kişi | **244** |
| Erkek / Kadın / İşaretsiz | **127 / 117 / 0** |
| Uygulanan düzeltme | **46** (5 ana bağ + 41 sahte anne bağı) |
| Kalan çelişki | **0** |

`sex` alanı veride zaten mevcut ve %100 doluydu; yeni bir `cinsiyet` alanı **eklenmedi**
(talimattaki "mevcut yapıyı bozma" kuralı). İsimden cinsiyet tahmini **yapılmadı** —
tüm bulgular yapısal bağlardan çıkarıldı, tahmine gerek kalmadı.

## Alanların anlamı (veriden çıkarıldı)

| Alan | Anlamı |
|---|---|
| `edges` | Ana soy bağı: ebeveyn → çocuk |
| `parentRole` | **Çocuğun** ağaca hangi ebeveyn üzerinden bağlandığı |
| `motherEdges` / `mother` | İkinci ebeveyn bağı (birbirinin aynası, 0 uyuşmazlık) |

**Doğrulama kuralı:** `parentRole="baba"` → `edges` kaynağı **E** olmalı;
`parentRole="anne"` → **K** olmalı.

> Not: İlk taramada bu kural yanlış kurulmuş, `parentRole` "bu kişi anne/babadır"
> sanılmıştı. O okumayla 15 çelişki görünüyordu; 10'u yanlış alarmdı. Alanın gerçek
> anlamı verinin kendisinden doğrulandıktan sonra gerçek sayı **5**'e indi.

## A · Ana soy bağı — 5 düzeltme

Kadın ebeveyne `parentRole="baba"` ile bağlanmış çocuklar `"anne"` olarak düzeltildi;
`mother` alanları ve `motherEdges` kayıtları buna göre eklendi.

| Çocuk | ID | Ebeveyn | Değişiklik |
|---|---|---|---|
| Birsen | `p1221131` | Bedriye (K) | baba → anne |
| M. Ali | `p1221132` | Bedriye (K) | baba → anne |
| Aysen | `p1221133` | Bedriye (K) | baba → anne |
| Yılmaz | `p1221134` | Bedriye (K) | baba → anne |
| Ferdane | `p122331` | Naciye (K) | baba → anne |

Ters yön (`parentRole="anne"` ama ebeveyn erkek): **0 kayıt** — bu tür hata veride yoktu.

## B · Sahte anne bağı — 41 düzeltme

41 çocukta `mother` alanı **babanın kendisini** gösteriyordu; yani iki ebeveyn de aynı
kişiydi. Bu bağlar kaldırıldı (anne bilgisi artık boş). Gerçek anne isimleri veride
hiç bulunmadığı için **uydurulmadı**.

Etkilenen babalar: Nazmi (8), Mehmet Reşat (6), Ruknettin (6), Enver (5), Behçet (3),
Ravi (3), Kadir (2), Hasan (2), Metin (2), Yüksel (1), Fehmi (1), Zeki (1), Tamer (1).

> `mother` alanı ana ebeveyni gösteren diğer 30 kayda **dokunulmadı** — onlar anne
> üzerinden bağlanan çocuklar, doğru durumdalar.

## C · Eş bağları

4 evlilik bağının tamamı tutarlı, aynı cinsiyet eşleşmesi yok. `spouse` alanında da
çakışma bulunmadı. Düzeltme gerekmedi.

## Düzeltme sonrası durum

```
nodes 244 · edges 241 · marriages 4 · motherEdges 88 → 52
parentRole: baba 214 → 209 · anne 30 → 35
mother alanı dolu: 88 → 52
id'siz 0 · adsız 0 · tekrarlı id 0 · kırık bağ 0
```

Tüm çelişki sınıfları (A, B1, B2, C) yeniden tarandı: **hepsi 0**.

## Yedekler

Düzeltme öncesi hâl iki yerde duruyor:

- `yedek-cinsiyet-oncesi.json` (proje kökü)
- Neon `gunluk` tablosu, `guncelleyen='cinsiyet-duzeltmesi-oncesi'`

Geri almak için `gunluk`'taki o kaydı `agac` tablosuna yazmak yeterli.

## Açık kalan

41 çocuğun **annesi bilinmiyor**. Bilgi sende varsa girilebilir; veriden çıkarılamazdı.
