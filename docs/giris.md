# Giriş servisi — `api/giris.js`

Aile şifresi / yönetici şifresiyle giriş; veritabanı gerekmez. Jeton HMAC ile imzalanır, diğer uçlar
`jetonDogrula()` ile denetler.

## Uç (`POST /api/giris`)

| Gövde | Yanıt |
|---|---|
| `{sifre}` | `{ok, rol:'aile'|'admin', jeton}` · yanlışsa `401` |
| `{adim:'dogrula', jeton}` | geçerliyse `{ok, rol, jeton}` (**taze jeton**, süre yenilenir) · değilse `401` |

- Jeton `{rol, t}` + imza; **30 gün** geçerli. İstemci açılışta `dogrula` ile tazeler: siteyi kullanan
  kişinin oturumu düşmez.
- `OTURUM_GIZLI` değişirse eski jetonların hepsi geçersiz olur (güvenlik için doğru davranış).

## İstemci

- Jeton `localStorage.kok_session`. Açılışta `oturumDogrula()`: geçersizse oturum temizlenir ve
  "Oturumun süresi dolmuş — yeniden giriş yap" denir (eskiden arayüz girişli görünüp her işlemde
  "Giriş gerekli" alıyordu).
- `yetkiliIstek(yap, neden)`: istek 401 alırsa şifre penceresi (`girisPenceresi`) açılır, girişten
  sonra istek **bir kez** yeniden denenir. Kullananlar: fotoğraf yükleme, öneri gönderme, sohbete yazma.
- Şifre kutuları: karşılama, Aile Sohbeti, asistan, kişi kartı şeridi ve bu pencere — hepsi `sifreyleGir()`.

## Rol görünürlüğü

- Durum satırında her zaman rol: **🔓 Yönetici** ya da **👤 Aile üyesi** (girişsizse yok).
- Aile üyesinin değişikliği öneri olur; onay çubuğu bunu söyler ("Aile üyesi olarak düzenledin —
  değişiklik yöneticinin onayına gider") ve **🔓 Yöneticiyim** düğmesi sunar: yönetici şifresiyle
  girilince bekleyen değişiklikler onaysız, doğrudan kaydedilir. Aile olarak gönderilmiş öneriler
  yönetici girişinden sonra onay kutusunda görünür (sayaç rozetiyle).

## Ortam değişkenleri

`AILE_SIFRESI`, `ADMIN_SIFRESI`, `OTURUM_GIZLI` (uzun, rastgele; Sensitive işaretle).
