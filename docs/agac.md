# Ağaç servisi — `api/agac.js`

Ortak soy ağacı (kişiler, bağlar, evlilikler, anne bağları ve **profiller**: fotoğraf, bilgiler, anılar)
tek JSON olarak `agac` tablosunda (id = 1). Her kayıt `gunluk` tablosuna da yazılır (geri alma).

## Uç

| İstek | Yetki | Yanıt |
|---|---|---|
| `GET /api/agac` | herkes | `{ok, veri, guncelleme, guncelleyen}` |
| `POST /api/agac` `{veri, onceki, guncelleyen, jeton}` | yalnız **yönetici** | `{ok, guncelleme}` · oturum geçersiz `401` · aile üyesi `403` (öneri yolu) · **`409` çakışma** + `{veri, guncelleme, guncelleyen}` |

## Cihazlar arası eşitleme (istemci)

- **Yönetici** düzenleyince `cloudSave()` ağacı 1,2 sn sonra kaydeder. İstek `yetkiliIstek()` ile gider:
  oturum düşmüşse (`401`) şifre penceresi açılır, girişten sonra kayıt yeniden denenir.
  Kayıt başarısızsa **uyarı gösterilir** ("⚠ Kaydedilemedi … değişiklik yalnızca bu cihazda").
  Eskiden hata sessizdi: düzenleme yalnız o cihazda kalıyor, diğer cihazlara hiç gitmiyordu.
- Kaydın yanıtındaki `guncelleme` saklanır; cihaz kendi kaydını "yeni sürüm" sanıp yeniden yüklemez.
- **Aile üyesi** düzenlemesi öneri olur (`pendingChanges`); "Onaya gönder" ile `api/oneri`'ye gider.
- **Yoklama** (`bulutYokla`, 30 sn + sekmeye dönünce): sunucuda daha yeni sürüm varsa ağaç **ve
  profiller** (`absorbCloudProfiles`) yeniden yüklenir. Eskiden yalnız ağaç yapısı geliyordu; fotoğraf
  ve bilgi değişiklikleri ancak sayfa yenilenince görünüyordu.
- Yoklama yalnızca yerelde kaydedilmemiş iş varken bekler: yöneticide kayıt sürerken, aile üyesinde
  gönderilmemiş öneri varken. Eskiden her düzenleme `dirty` bırakıyordu ve o cihaz bir daha hiç
  eşitlenmiyordu.

## Çakışma: iki cihaz aynı anda düzenleyince

Ağaç bütün olarak kaydedildiği için eskiden **son kaydeden kazanıyordu**: eski kopyası açık duran
cihaz (ör. bilgisayar), başka cihazda (mobil) yüklenen fotoğrafı geri alıyordu.

- İstemci kaydederken elindeki sürümü (`onceki` = son `guncelleme`) gönderir. Sunucu yalnızca sürüm
  tutuyorsa yazar (`date_trunc('milliseconds', guncelleme) = onceki`); değilse **409** + güncel veri.
- İstemci **üç yönlü birleştirir** (`agacBirlestir(taban, yerel, sunucu)`, `api/_lib/agac.js`):
  taban = son eşitlenen sunucu sürümü (`CLOUD.taban`), yerel = kendi ekranı, sunucu = güncel.
  Yalnızca yerelde tabana göre **değişen** alanlar sunucunun üstüne işlenir — her derinlikte
  (kişi → profil → bilgi). Listeler (anılar, galeri) küme olarak birleşir: iki cihazın eklediği de kalır.
  Boş değerler ("", {}, []) "yok" sayılır (varsayılan boş profil gerçek fotoğrafı silmez).
- Birleşmiş hâl ekrana uygulanır, en çok 3 deneme ile yeniden kaydedilir; kullanıcıya
  "iki değişiklik birleştirildi" denir. `onceki` göndermeyen eski istemci koşulsuz yazar.

## Kimlik

Ağaçtaki her kişinin kalıcı bir **id**'si var (örn. `p12222123`; kişi kartında görünür). Giriş ise
ortak aile/yönetici şifresiyledir; "ben kimim" (`kok_ben`) her cihazda bir kez seçilir (bkz. `docs/giris.md`).

## Nesil

Nesil = ana köke (Molla Memiş, 0) uzaklık. Kök, alt ağacı **en büyük** köksüz kişidir (eşin
babası gibi dünür ataları da köksüz görünür). Ana soydan sonra yayılım: **eş aynı nesil**,
ebeveyn bir üst, çocuk bir alt. Böylece kişi, eşi ve eşinin kardeşleri aynı nesil; dünür anne-baba
bir önceki, onların çocukları bir sonraki nesildir.

- İstemci: `reindex()` → `n._depth`, gösterim `nesilOf(n)` (kartlar, arama, Çınar yanıtları).
- Sunucu: `api/_lib/agac.js → nesilHaritasi(g)` / `nesil(g, id)` (grafta önbellekli).
- Eskiden yalnız baba zinciri sayılıyordu: eşin kardeşi "1. nesil" görünüyordu. Test: `test/agac.test.mjs`.

## Ortam değişkenleri

`DATABASE_URL`, `OTURUM_GIZLI`.
