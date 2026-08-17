# Görev: Sesli Komut — Kullanıcı Mikrofonla Konuşarak Komut Versin

## Amaç
Kullanıcı yazmak yerine mikrofona konuşarak komut verebilsin: "Yüksel'i göster", "Emine ile Fahri nasıl akraba", "yaşayanları göster" gibi. Konuşma metne çevrilir ve mevcut AI diyalog komut akışına (`diyalogGonder` / `yurut`) beslenir. Yeni paralel sistem kurma — sadece ses girişini var olan akışa bağla.

## Teknoloji
Tarayıcının yerleşik **Web Speech API**'si (`SpeechRecognition` / `webkitSpeechRecognition`). Ek servis, API anahtarı veya kütüphane gerekmez. Türkçe için `lang = "tr-TR"`.

## Yapılacak

### 1. Mikrofon butonu
- Diyalog kutusunun yanında bir 🎤 mikrofon butonu.
- Tıklanınca dinlemeye başlar; dinlerken görsel geri bildirim (nabız/dalga animasyonu, kırmızı nokta) ver.
- Tekrar tıklama veya konuşma bitişi → durur.

### 2. Tanıma kurulumu
```js
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let taniyici = null;

function sesBaslat() {
  if (!SR) { cevapGoster("Tarayıcın sesli komutu desteklemiyor, yazabilirsin."); return; }
  taniyici = new SR();
  taniyici.lang = "tr-TR";
  taniyici.interimResults = true;   // konuşurken canlı metin göster
  taniyici.continuous = false;      // tek komut, bitince dur
  taniyici.maxAlternatives = 1;

  taniyici.onstart = () => setMicState("dinliyor");
  taniyici.onresult = (e) => {
    const metin = Array.from(e.results).map(r => r[0].transcript).join("");
    gosterCanliMetin(metin);                 // input'a canlı yaz
    if (e.results[e.results.length - 1].isFinal) {
      diyalogGonder(metin);                  // <-- mevcut akışa ver
    }
  };
  taniyici.onerror = (e) => {
    setMicState("kapali");
    if (e.error === "not-allowed") cevapGoster("Mikrofon izni gerekiyor. Tarayıcı ayarlarından izin ver.");
    else if (e.error === "no-speech") cevapGoster("Sesini duyamadım, tekrar dener misin?");
    else cevapGoster("Ses tanımada sorun oldu, yazarak deneyebilirsin.");
  };
  taniyici.onend = () => setMicState("kapali");

  try { taniyici.start(); } catch(_) {}
}

function sesDurdur() { if (taniyici) taniyici.stop(); }
```

### 3. Mikrofon izni
- İlk kullanımda tarayıcı izin ister; reddedilirse net mesaj göster ("Mikrofon izni gerekiyor").
- HTTPS zorunlu (Web Speech API yalnızca güvenli bağlamda çalışır) — soyevrenim.com zaten HTTPS, sorun yok. localhost testte de çalışır.

### 4. Canlı metin ve onay
- Kullanıcı konuşurken tanınan metni input alanında canlı göster (interim results).
- Konuşma bitince komut çalışır ve kısa sesli-olmayan onay görünür ("Yüksel'i getirdim").

### 5. iOS / mobil özel notlar (ÖNEMLİ)
- **iOS Safari** `webkitSpeechRecognition`'ı destekler ama davranışı Android'den farklıdır: `continuous` ve `interimResults` bazı sürümlerde sınırlı çalışır. iOS'ta `continuous=false` + kısa komut modeli en güvenlisi.
- iOS'ta tanıma bazen sessizce durur; `onend`'de mic durumunu her zaman sıfırla ki buton takılı kalmasın.
- Mikrofon erişimi kullanıcı hareketiyle (buton tıklaması) tetiklenmeli — otomatik başlatma iOS'ta engellenir.
- API hiç yoksa (`!SR`) mikrofon butonunu gizle veya pasifleştir, kullanıcıyı yazmaya yönlendir.

### 6. Türkçe tanıma toleransı
- Sesli tanıma "Yüksel"i "yüksel/yüksek/yüksele" gibi çevirebilir. `diyalogGonder` zaten Claude'a gidiyor; sistem promptu bu tür ses-kaynaklı yazım hatalarını toleransla yorumlasın (isim eşleştirmede bulanık eşleşme mevcut).

## Çıktı ve doğrulama
1. Uygula, çıktıyı `/mnt/user-data/outputs/`'a kopyala.
2. Test:
   - 🎤 tıkla → izin iste → konuş → metin canlı görünüyor mu?
   - "Yüksel'i göster" desende komut çalışıyor mu?
   - İzin reddi / ses yok / desteklenmiyor durumlarında net mesajlar çıkıyor mu?
   - Buton durumu (dinliyor/kapalı) doğru mu, takılı kalmıyor mu?
   - **Gerçek iPhone Safari** ve Android Chrome'da ayrı ayrı test et.
3. İlgili `.md` dosyasını güncelle: sesli komut akışı, Web Speech kurulumu, iOS notları, izin/hata durumları.

## Kısıtlar
- Vanilla JS + HTML/CSS, framework yok.
- Mevcut `diyalogGonder`/`yurut` komut akışını kullan — ses sadece bir giriş yöntemi.
- API anahtarı yok (tarayıcı yerleşik API).
- Dark mod ve mobil uyum korunur.
