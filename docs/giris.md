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

## Ad arama (karşılama)

"Bu evrene kim bakıyor?" kutusu harf/Türkçe karakter (Yuksel = Yüksel) ve soyad toleranslıdır:
ilk sözcük (ad) eşleşmeli, diğerleri (soyad, baba adı) sıralamaya puan katar. Eskiden yazılanın
tamamı adın içinde aranıyordu; "Yüksel Arslan" yazan (ağaçta yalnız "Yüksel") "yaşayan biri
bulunamadı" görüp giremiyordu. Listenin altında her zaman **"Listede yok musun? Kaydol →"** var.
Ağaç henüz yüklenmediyse "Ağaç yükleniyor…" denir.

## Kayıt (ağaçta olmayan aile üyesi)

Kayıt formu karşılamada açılır: ad, soyad (isteğe bağlı), cinsiyet, doğum yılı (isteğe bağlı),
**ağaçtaki yakını** (arama ile seçilir, vefat etmiş biri de olabilir) ve bağ: **çocuğu / eşi / kardeşi**.
**Bağsız kayıt yok** — yakını seçilmeden düğme çalışmaz, sunucu da reddeder. Aile şifresi gerekir
(oturum açıksa sorulmaz).

`POST /api/agac?adim=kayit` `{ad, soyad, cinsiyet:'E'|'K', dogum, iliski:'cocuk'|'es'|'kardes', bag, sifre | jeton}`

| Durum | Yanıt |
|---|---|
| Şifre yok / yanlış, oturum yok | `401` |
| Ad, cinsiyet, ilişki, doğum yılı geçersiz; kardeş için yakınının anne-babası ağaçta yok | `400` |
| Yakını ağaçta yok | `404` |
| Aynı bağla aynı adda biri zaten var | `409 {var: id}` — istemci "Evet, bu benim" ile o kişi olarak girer |
| Başarılı | `{ok, kisi, ad, rol, jeton, guncelleme}` — jeton yeni kişiye bağlı; doğrudan girilir |

- Bağlama kuralı (`api/_lib/kayit.js → kayitEkle`): çocuğu → babadan ağaç bağı (`edges`), anneden
  anne bağı (`motherEdges`); yakının ağaçta tek eşi varsa o eş de ebeveyn olur. Eşi → `marriages`,
  yakının adla yazılmış eş kaydı ("Nevin Kaya") bu kişiye döner. Kardeşi → aynı anne/baba.
- Yeni kişide `kayit: {zaman, bag, iliski}` iz kalır (yönetici kimin nasıl eklendiğini görür, gerekirse siler).
- Ağaca yazım koşullu ve yeniden denemeli (`agacYamala`), `gunluk`'e de yazılır.
- Sınırlar `api/_lib/ayar.js → KAYIT` (`adMin`, `adMax`, `iliskiler`, `deneme`, `dogumMin`).
- Test: `test/kayit.test.mjs`.

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
