# Claude Code Talimatı — soyevrenim projesini GitHub'a aktar

Aşağıdaki metni olduğu gibi Claude Code'a yapıştır. (Önce `kok-github.zip`'i
indirip bir yere açmış ol; talimatta o klasörün yolunu soracak.)

---

## YAPIŞTIRILACAK TALİMAT:

Merhaba. Bir aile soy ağacı web projesini GitHub'a yüklemene ihtiyacım var.

**Proje konumu:** `kok-github.zip` dosyasını açtığım klasör — içinde `kok-canli/`
adında, git geçmişi zaten hazır (21 commit) bir depo var. (Yolu ben sana vereceğim;
sormadan önce `find . -name "kok-canli" -type d` ile arayabilirsin.)

**Yapmanı istediklerim, sırayla:**

1. Önce projenin durumunu doğrula:
   - `kok-canli` klasörüne gir
   - `git log --oneline | head -3` ile commit geçmişinin var olduğunu göster bana
   - `git status` ile temiz olduğunu kontrol et
   - `.gitignore` içinde `.env` ve `node_modules` hariç tutuluyor mu, teyit et
     (SIRLAR yüklenmemeli)

2. GitHub'da yeni bir **private** depo oluştur ve push et:
   - GitHub CLI (`gh`) kuruluysa: `gh auth status` ile girişli miyim bak.
     Girişliysem: `gh repo create soyevrenim --private --source=. --push` çalıştır.
   - `gh` yoksa ya da giriş yoksa: bana söyle, önce `gh auth login` yapmam
     gerektiğini hatırlat. Benim yerime tarayıcı/kimlik adımlarını sen yapamazsın,
     o kısmı ben hallederim; sen sadece komutu hazırla ve yönlendir.

3. Push bittikten sonra:
   - Deponun URL'sini bana ver (`gh repo view --web` ya da remote URL)
   - `git remote -v` çıktısını göster

**Önemli kurallar:**
- `.env` ya da içinde şifre/token olan hiçbir dosyayı push etme. `.gitignore`
  bunu zaten engelliyor ama sen de kontrol et.
- Depo **private** olmalı (aile verisi).
- Depo adı `soyevrenim` (ya da doluysa `soyevrenim-agac`).
- Bir şey ters giderse dur ve bana sor, zorlama.

Bittiğinde bana GitHub depo linkini ver — sonra Vercel'e ben bağlayacağım.

---

## Talimat sonrası — sen ne yapacaksın

- `gh auth login` isterse: Claude Code sana adımları söyler, tarayıcıdan GitHub'a
  giriş yaparsın (bir kere).
- Push için token/şifre isterse Claude Code yönlendirir.
- Depo açılınca linkini al → Vercel'de **Import Git Repository** ile bağla
  (GITHUB-YUKLEME.md'deki "Vercel'e bağla" bölümü).
