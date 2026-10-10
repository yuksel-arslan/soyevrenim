# Ağaç servisi — `api/agac.js`

Ortak soy ağacı (kişiler, bağlar, evlilikler, anne bağları ve **profiller**: fotoğraf, bilgiler, anılar)
tek JSON olarak `agac` tablosunda (id = 1). Her kayıt `gunluk` tablosuna da yazılır (geri alma).

## Uç

| İstek | Yetki | Yanıt |
|---|---|---|
| `GET /api/agac` | herkes | `{ok, veri, guncelleme, guncelleyen}` |
| `POST /api/agac` `{veri, guncelleyen, jeton}` | yalnız **yönetici** | `{ok, guncelleme}` · oturum geçersiz `401` · aile üyesi `403` (öneri yolu: `api/oneri`) |

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

## Kimlik

Ağaçtaki her kişinin kalıcı bir **id**'si var (örn. `p12222123`; kişi kartında görünür). Giriş ise
ortak aile/yönetici şifresiyledir; "ben kimim" (`kok_ben`) her cihazda bir kez seçilir (bkz. `docs/giris.md`).

## Ortam değişkenleri

`DATABASE_URL`, `OTURUM_GIZLI`.
