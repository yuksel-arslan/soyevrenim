# Güncel kodu GitHub'a push et (aile şifresi sistemi)

## ÖNCE SEN — dosyaları yerleştir

İndirdiğin `kok-github.zip`'i aç. İçinden `kok-canli` klasörü çıkar.
Bu klasörün TÜM içeriğini (gizli `.git` klasörü dahil) mevcut `D:\kok-canli`
klasörünün ÜZERİNE kopyala (eskisinin yerine geçsin, "değiştir/replace" de).

> Not: Bu paket zaten güncel git geçmişini içeriyor (22 commit, en üstte
> "aile şifresi sistemine geçiş"). Yani üzerine kopyalayınca hem dosyalar
> hem commit geçmişi güncellenir.

## SONRA — PowerShell'de

```
D:
cd D:\kok-canli
claude
```

Claude Code açılınca AŞAĞIDAKİNİ yapıştır:

---

## CLAUDE CODE'A YAPIŞTIR:

`D:\kok-canli` klasöründeki projeyi GitHub'a göndermene ihtiyacım var.
Bu proje daha önce GitHub'a bağlanmıştı (yuksel-arslan/soyevrenim). Şimdi
güncellenmiş haliyle push edeceğiz. Sırayla yap:

1. `git status` ve `git log --oneline | head -3` çalıştır, durumu bana göster.
   En üstteki commit "aile şifresi sistemine geçiş" olmalı.

2. Uzak depo bağlı mı kontrol et: `git remote -v`.
   - Bağlıysa (origin görünüyorsa) → adım 3'e geç.
   - Bağlı DEĞİLSE: `git remote add origin https://github.com/yuksel-arslan/soyevrenim.git`

3. Push et:
   ```
   git push origin master
   ```
   (branch adı master; eğer "main" derse `git push origin main` dene.)
   - Kimlik/token isterse bana söyle, ben gireceğim.

4. Push başarılıysa bana onayı göster (`git log origin/master --oneline | head -1`
   ya da benzeri) ve deponun web linkini ver.

KURALLAR:
- `.env` ya da şifre içeren dosya push etme (.gitignore zaten engelliyor).
- Ters giden olursa dur, sor.

Push bitince: Vercel otomatik olarak yeni deploy başlatacak (GitHub bağlı).
Bana "push oldu" de.

---

## Push sonrası (otomatik olur)
- Vercel yeni commit'i görüp otomatik deploy eder (~1-2 dk).
- Deploy bitince site aile şifresi sistemiyle çalışır.
- Ortam değişkenleri (AILE_SIFRESI, ADMIN_SIFRESI, OTURUM_GIZLI) zaten girili.
- soyevrenim.vercel.app → aile şifresiyle giriş → öneri + sohbet çalışmalı.
