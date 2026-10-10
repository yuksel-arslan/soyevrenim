# Giriş servisi — `api/giris.js`

Aile şifresi / yönetici şifresiyle giriş; veritabanı gerekmez. Jeton HMAC ile imzalanır, diğer uçlar
`jetonDogrula()` ile denetler.

## Uç (`POST /api/giris`)

| Gövde | Yanıt |
|---|---|
| `{sifre}` | `{ok, rol:'aile'|'admin', jeton}` · yanlışsa `401` |
| `{adim:'dogrula', jeton}` | geçerliyse `{ok, rol, jeton}` (**taze jeton**, süre yenilenir) · değilse `401` |

- Jeton `{rol, t, kisi?}` + imza; `GIRIS.oturumGun` gün geçerli. İstemci açılışta `dogrula` ile tazeler: siteyi kullanan
  kişinin oturumu düşmez.
- `OTURUM_GIZLI` değişirse eski jetonların hepsi geçersiz olur (güvenlik için doğru davranış).

## İstemci

- Jeton `localStorage.kok_session`. Açılışta `oturumDogrula()`: geçersizse oturum temizlenir ve
  "Oturumun süresi dolmuş — yeniden giriş yap" denir (eskiden arayüz girişli görünüp her işlemde
  "Giriş gerekli" alıyordu).
- `yetkiliIstek(yap, neden)`: istek 401 alırsa şifre penceresi (`girisPenceresi`) açılır, girişten
  sonra istek **bir kez** yeniden denenir. Kullananlar: fotoğraf yükleme, öneri gönderme, sohbete yazma.
- Şifre kutuları: karşılama, Aile Sohbeti, asistan, kişi kartı şeridi ve bu pencere — hepsi `sifreyleGir()`.

## Kişi kimliği (ID)

Ağaçtaki her ferdin kalıcı bir **id**'si var (`p12222123`). Giriş ortak şifreyle olsa da kimlik artık
**oturuma bağlı**: jeton `{rol, t, kisi}` taşır ve sunucu kimliği önce buradan okur
(`kimlikCoz`, sohbet, öneri; tarayıcının söylediği `kisi_id` yalnız yedek).

| İstek (`POST /api/giris`) | Ne yapar |
|---|---|
| `{sifre, kisi}` | girişte cihazda seçili kişi oturuma işlenir |
| `{adim:'ben', jeton, kisi}` | "Ben …" / "Bu benim" / ad seçimi → kişiyi oturuma işler (rol aynı) |
| `{adim:'dogrula', jeton}` | taze jeton; **kişi korunur** |
| `{adim:'davet-uret', jeton, kisi}` | **yalnız yönetici**: o kişiye özel giriş bağlantısı (`GIRIS.davetGun` gün) |
| `{adim:'davet', davet}` | bağlantıyla gelen: şifresiz, doğrudan o kişi olarak (aile rolü) |

- **Kişisel giriş bağlantısı:** yönetici kişi kartında **🔗 Kişisel giriş bağlantısı gönder** →
  `/?giris=…`. Açan kişi hangi cihazda olursa olsun doğrudan **kendisi** olarak girer; bağlantı adres
  çubuğundan hemen silinir. Bağlantı jetonu (`tur:'davet'`) oturum yerine kullanılamaz.
  Tüm bağlantıları iptal etmek için `OTURUM_GIZLI` değiştirilir (herkes yeniden girer).
- Oturumu ve kişisi bilinen kullanıcı karşılamada adını yeniden seçmez (`tanidikIceriAl`).
- **Düzeltilen hata:** kişi seçilmemişse kimlik, ekranın merkezindeki kişiden (`viewerId`) alınıyordu —
  başkasını merkeze alınca site kullanıcıyı o kişi sanıyordu. Artık kimlik yalnız oturumdan ya da
  açıkça seçilen kişiden gelir.
- Süreler `api/_lib/ayar.js → GIRIS` (`oturumGun`, `davetGun`). Test: `test/giris.test.mjs`.

## Rol görünürlüğü

- Durum satırında her zaman rol: **🔓 Yönetici** ya da **👤 Aile üyesi** (girişsizse yok).
- Aile üyesinin değişikliği öneri olur; onay çubuğu bunu söyler ("Aile üyesi olarak düzenledin —
  değişiklik yöneticinin onayına gider") ve **🔓 Yöneticiyim** düğmesi sunar: yönetici şifresiyle
  girilince bekleyen değişiklikler onaysız, doğrudan kaydedilir. Aile olarak gönderilmiş öneriler
  yönetici girişinden sonra onay kutusunda görünür (sayaç rozetiyle).

## Çıkış (hesap menüsü)

Durum satırındaki rol rozetine (**🔓 Yönetici** / **👤 Aile üyesi**) dokununca hesap menüsü açılır:
kim olarak girildiği ("Fahri oğlu Yüksel olarak") ve

- **🔓 Yönetici olarak gir** (aile üyesiyken) — yönetici şifresi penceresi,
- **🔄 Ben değilim — kişiyi değiştir** — `kok_ben` temizlenir; "Ben …" ya da kartta "Bu benim" ile yeniden seçilir,
- **⎋ Çıkış yap** — oturum (`kok_session`), "ben kimim" (`kok_ben`) ve **bu cihazın push bildirim
  aboneliği** kaldırılır (ortak kullanılan telefonda başkasının adına bildirim gelmesin).

Soldaki 🔑 düğmesi de yönetici modunu açar/kapatır.

## Ortam değişkenleri

`AILE_SIFRESI`, `ADMIN_SIFRESI`, `OTURUM_GIZLI` (uzun, rastgele; Sensitive işaretle).
