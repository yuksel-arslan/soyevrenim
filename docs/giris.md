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

## Ortam değişkenleri

`AILE_SIFRESI`, `ADMIN_SIFRESI`, `OTURUM_GIZLI` (uzun, rastgele; Sensitive işaretle).
