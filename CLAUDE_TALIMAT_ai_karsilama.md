# Görev: Açılışta AI Karşılama ve Yardım Teklifi

## Amaç
Kullanıcı uygulamayı açtığında AI onu karşılasın, ne işe yaradığını kısaca tanıtsın ve yardım teklif etsin. İkonlar gizlendiği için bu karşılama, kullanıcının "ne yapabilirim?" sorusuna ilk ve net cevabı olacak.

## Yapılacak

### 1. Açılış karşılama mesajı
Uygulama ilk yüklendiğinde AI diyalog kutusu (veya küçük bir karşılama balonu) otomatik görünsün ve sıcak, kısa bir mesaj göstersin. Örnek ton (aynen kullanma, buna benzer doğal Türkçe):

> "Merhaba! Ben Abdurrahman Oğulları soy ağacının rehberiyim. Bir kişiyi göstermemi, iki kişinin nasıl akraba olduğunu bulmamı ya da ağacı nesillere göre süzmemi isteyebilirsin. Ne yapmak istersin?"

- Mesaj aile ağacına özel ve sıcak olsun (bu kişisel bir miras projesi — ton kuru/teknik olmasın).
- Çok uzun olmasın; 2-3 cümle.

### 2. Yardım tekliflerini tıklanabilir çip olarak sun
Karşılamanın hemen altında örnek komutlar çip olarak dursun (kullanıcı yazmak zorunda kalmadan tıklayabilsin):
- "Yüksel'i göster"
- "Emine ile Fahri nasıl akraba?"
- "Yaşayanları göster"
- "İstatistikleri aç"
- "Kökenimizi göster" (Fahri Arslan'ın 1956 orijinal çizimi)

Çipe tıklamak doğrudan ilgili komutu çalıştırsın (mevcut `diyalogGonder`/`yurut` akışı).

### 3. Görünürlük ve tekrar davranışı
- Karşılama, açılışta bir kez belirgin görünsün ama ekranı boğmasın; kullanıcı ilk etkileşimde (tıklama/yazma/pan) kenara çekilsin ya da küçülsün.
- Kullanıcı diyaloğu kapatabilsin; 💬 butonuyla tekrar açabilsin.
- **Her açılışta tekrar tam karşılama gösterme.** İlk ziyaretten sonra kısa selam yeterli (ör. "Tekrar hoş geldin! Ne yapmak istersin?"). İlk-ziyaret bilgisini basit bir işaretle tut (not: localStorage bu ortamda kullanılamıyorsa oturum içi değişkenle; kalıcı gerekiyorsa backend/Neon'da bir bayrak).

### 4. Ton ve dil
- Türkçe, samimi ama sade. Aşırı resmi değil, aşırı senli benli değil.
- Kullanıcıya sürekli "benimle konuş" baskısı yapma; bir kez teklif et, sonra sessizce hazır bekle.
- Yanıtlarda kısa onaylar ver ("Yüksel'i getirdim", "1–6 nesil gösteriliyor").

### 5. Mobil
- Karşılama mobilde ekranın altından yumuşak açılan bir panel olsun; klavye açılınca örtülmesin.
- Çipler dar ekranda alt alta sığsın, dokunulabilir boyutta.

## Çıktı ve doğrulama
1. Uygula, çıktıyı `/mnt/user-data/outputs/`'a kopyala.
2. Test:
   - Uygulama açılınca karşılama + yardım teklifi çıkıyor mu?
   - Çiplere tıklamak doğru komutu çalıştırıyor mu?
   - İlk etkileşimde karşılama kenara çekiliyor / kapanıyor mu?
   - İkinci açılışta kısa selam mı geliyor (tam karşılama tekrarı yok)?
   - Mobilde panel + klavye + çipler sorunsuz mu?
3. İlgili `.md` dosyasını güncelle: açılış karşılama akışı, yardım çipleri, ilk-ziyaret davranışı.

## Kısıtlar
- Vanilla JS + HTML/CSS, framework yok.
- Mevcut AI diyalog komut akışını (`KOMUTLAR`, `diyalogGonder`, `yurut`) kullan — yeni paralel sistem kurma.
- Ton, kişisel miras projesine yakışır sıcaklıkta olsun.
- Dark mod ve mobil uyum korunur.
