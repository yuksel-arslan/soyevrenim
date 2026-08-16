# GitHub'a Yükleme

Bu klasör hazır bir git deposudur (ilk commit yapılmış). GitHub'a koymak için:

## 1) GitHub'da boş bir depo oluştur
- github.com → sağ üst **+** → **New repository**
- İsim: `soyevrenim` (ya da istediğin) · **Private** seç (aile verisi, gizli olsun)
- **README, .gitignore, license EKLEME** (zaten bizde var) → **Create repository**
- Açılan sayfada deponun adresini kopyala (örn:
  `https://github.com/KULLANICI/soyevrenim.git`)

## 2) Bu klasörü GitHub'a bağla ve gönder

Terminalde bu klasörün içinde:

```bash
# uzak depoyu ekle (KULLANICI/soyevrenim'i kendininkiyle değiştir)
git remote add origin https://github.com/KULLANICI/soyevrenim.git

# ana dalı 'main' yap ve gönder
git branch -M main
git push -u origin main
```

GitHub kullanıcı adı/şifre yerine **Personal Access Token** ister
(github.com → Settings → Developer settings → Personal access tokens → Generate).
Şifre sorulduğunda o token'ı yapıştır.

## 3) Vercel'e bağla
- vercel.com → **Add New → Project** → GitHub deponu seç → **Import** → **Deploy**
- Sonra ortam değişkenlerini gir (KURULUM.md'ye bak).

Artık her `git push` yaptığında Vercel otomatik günceller.

---

## Zaten git kurulu değilse

**git yoksa:** git-scm.com'dan indir, ya da GitHub Desktop (masaüstü uygulama,
komut gerektirmez) kullan — klasörü sürükle, "Publish repository" de.

**Hiç uğraşmak istemezsen:** GitHub Desktop en kolayı. Uygulamada
**File → Add Local Repository** → bu klasörü seç → **Publish repository** →
Private işaretle → bitti.

---

## ÖNEMLİ — güvenlik

- Gerçek şifreler (Neon bağlantısı, admin kodu, Twilio) **GitHub'a GİTMEZ**;
  `.gitignore` bunu engeller. Onları sadece Vercel panelinde girersin.
- `.env.example` sadece hangi değişkenlerin gerektiğini gösterir (boş şablon).
- Depoyu **Private** yap — aile bilgileri herkese açık olmasın.
