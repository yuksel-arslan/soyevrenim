// MODEL · KOTA · LİMİT — tek kaynak. Kodun başka hiçbir yerinde bu sayılar yazılmaz.
// İstemci kamuya açık olanları /api/kullanim?adim=ayar ile alır.
//
// Model: OpenAI (GPT). ÜCRETLİDİR — kullandıkça ödenir. Aşağıdaki günlük sınırlar artık bir
// HARCAMA TAVANI: sistem geneli + kişi başı (adil paylaşım). Gün sınırı UTC 00:00 (Türkiye 03:00).
// Sağlayıcı tek satırla değişir (SAGLAYICI içinden); anahtar ortam değişkeninden okunur.

export const LLM = { saglayici: 'openai', model: 'gpt-5-mini' };   // Çınar + hikâye düzenleme
export const STT = { saglayici: 'openai', model: 'whisper-1' };    // ses → yazı (süre bilgisini verir)
export const GUNLUK_SISTEM = { token: 190000, istek: 950, sesSn: 27000 }; // günlük harcama tavanı
export const GUNLUK_KISI = { mesaj: 20, sesDk: 30 };  // ortak tavanı adil paylaştırmak için
export const MESAJ_MAX_TOKEN = 5000;                 // tek istek bütçesi (istem + araçlar + beceri yöntemi); tüm ağacı isteme koyma, araçla getir
export const HIKAYE_MAX_CHARS = 20000;

// — Sağlayıcı uçları —
export const SAGLAYICI = {
  openai: {
    sohbet: 'https://api.openai.com/v1/chat/completions',
    yaziya: 'https://api.openai.com/v1/audio/transcriptions',
    anahtarEnv: 'OPENAI_API_KEY',
    sesUrl: false,          // ses DOSYA olarak yüklenir (sunucu R2'den indirip gönderir)
    ekAlan: {},             // sağlayıcıya özgü ek istek alanı yok
  },
  // Eski sağlayıcı (kullanılmıyor; geri dönmek için LLM/STT.saglayici = 'groq')
  groq: {
    sohbet: 'https://api.groq.com/openai/v1/chat/completions',
    yaziya: 'https://api.groq.com/openai/v1/audio/transcriptions',
    anahtarEnv: 'GROQ_API_KEY',
    sesUrl: true,           // sesi imzalı URL'den kendisi indirir
    ekAlan: { include_reasoning: false },
  },
};

// — Asistan —
export const ASISTAN = {
  ad: 'Çınar',             // asistanın adı (tek kaynak: sunucu istemi + istemci başlığı)
  maxTur: 4,               // sunucu tarafı araç döngüsü üst sınırı
  ciktiMaxToken: 1200,     // tek yanıt (gerekçe dahil) üst sınırı
  gerekce: 'low',          // reasoning_effort — kısa düşün, az harca
  gecmisTur: 6,            // istemciden kabul edilen önceki mesaj sayısı
  mesajMaxKarakter: 600,   // kullanıcı mesajı
  aracSonucMaxKarakter: 2500,
  soyTarihiMaxKarakter: 6500, // soy_tarihi aracı (Fahri Arslan notu + kaynaklı bağlam)
  aramaSonucMax: 8,
  aniParcaKarakter: 300,
  kisiAniMax: 6,
  tokenKarakter: 3,        // kaba tahmin: 1 token ≈ 3 karakter (Türkçe, temkinli)
};

// — Çınar becerisi (bilgi_ara aracı, api/_lib/beceri.js) —
export const BECERI = {
  sonucMax: 4,             // tek aramada döndürülen en fazla parça
  minPuan: 2,              // bu puanın altındaki parça "ilgisiz" sayılır
  kokHarf: 5,              // Türkçe ekler için kaba kök uzunluğu ("defterinde" ~ "defte")
};

// — Ses / hikâye —
export const SES = {
  mime: 'audio/webm;codecs=opus',
  mimeYedek: 'audio/mp4',  // iOS Safari
  bitHizi: 32000,          // ≈ 0,24 MB/dk
  parcaSn: 1200,           // kayıt 20 dk'da bir yeni dosyaya bölünür (≈ 4,8 MB)
  parcaMaxMb: 25,          // whisper tek dosya sınırı; üstü reddedilir (parçalama kayıtta yapılır)
  maxKayitDk: 120,
  dil: 'tr',
  whisperMinSn: 10,        // kısa kayıt için kota sayımında en az bu kadar saniye
  duzenleParcaKarakter: 4500, // LLM düzenleme parçası (girdi+çıktı MESAJ_MAX_TOKEN civarında kalır)
  duzenleCiktiMaxToken: 3000,
  duzenleMinOran: 0.9,     // düzenlenmiş metin ham metnin sözcüklerinin en az %90'ını korumalı
  tokenDk: 350,            // kota tahmini: 1 dk Türkçe konuşma ≈ token
  kilitDk: 15,             // aynı iş iki kez işlenmesin (cron + anlık)
  imzaSureSn: 900,         // R2 imzalı URL ömrü
  kuyrukToplu: 10,         // cron başına en fazla iş
};

// — Depolama (Cloudflare R2) —
export const DEPOLAMA = { kotaBayt: 10 * 1024 ** 3, onEk: 'ses/' };

// Fotoğraf / video (api/medya.js) — aynı R2 kovası, "medya/" altında
export const MEDYA = {
  onEk: 'medya/',
  imzaSureSn: 900,         // imzalı PUT/GET bağlantısı ömrü
  okuOnbellekSn: 600,      // görüntüleme yönlendirmesinin tarayıcı önbelleği (imzadan kısa)
  fotoMaxMb: 15,           // küçültmeden sonra fotoğraf üst sınırı
  videoMaxMb: 200,         // video üst sınırı (doğrudan R2'ye gider)
  vekilMaxMb: 4,           // doğrudan yükleme olmazsa sunucu üzerinden yedek yol (Vercel gövde sınırı 4,5 MB)
  turler: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'image/heic': 'heic', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' },
};

// — Panel: katkı sıralaması (1 eklenen kişi = bu kadar saniyelik hikâye ağırlığında)
export const KATKI = { kisiAgirlikSn: 60 };

// Giriş: oturum ve kişisel giriş bağlantısı süreleri (api/giris.js)
export const GIRIS = {
  oturumGun: 30,           // oturum jetonu (kullandıkça yenilenir)
  davetGun: 180,           // kişisel giriş bağlantısı geçerliliği
};

// Aile üyesi (aile şifresiyle giren) ağaca DOĞRUDAN kaydeder — yönetici onayı yok (güvenilir sayılır).
// Tek güvenlik ağı: tek kayıtta bundan fazla kişiyi silmek yalnız yöneticide (yanlışlıkla toplu silme).
// Her kayıt gunluk'e yazılır, geri alınabilir.
export const AILE = { silmeMax: 3 };

// Öz-denetim (api/_lib/denetim.js): kayıtta yeni çıkan çelişkiler kaydedene ve ilgili kişilere bildirilir
export const DENETIM_UYARI = {
  onemler: ['yuksek', 'orta'],  // bu önemdeki YENİ bulgular uyarılır (küçükler denetim ekranında kalır)
  enCok: 8,                     // tek kayıtta en fazla uyarı
  farkMax: 4,                   // bir kişide listelenen en fazla değişen alan
  listeMax: 50,                 // kişinin okunmamış hatırlatma listesi
};

// Kayıt: ağaçta olmayan aile üyesi kendini ekler — mevcut bir kişiye BAĞLI olmak zorunda
// (api/agac.js?adim=kayit, api/_lib/kayit.js). Bağsız kayıt yok; aile şifresi gerekir.
export const KAYIT = {
  adMin: 2, adMax: 40,                      // ad + soyad karakter sınırı
  iliskiler: ['cocuk', 'es', 'kardes'],     // "kimin nesisin": çocuğu, eşi, kardeşi
  deneme: 3,                                // eşzamanlı kayıtta yeniden deneme
  dogumMin: 1900,                           // doğum yılı alt sınırı (üst sınır: bu yıl)
};

// iPhone "Ana Ekrana Ekle" yönergesi (istemci): giriş sonrası gecikme ve "Anladım" sonrası tekrar aralığı
export const ANA_EKRAN = { gecikmeSn: 6, tekrarGun: 14 };

// Aile sohbeti: yeni mesaj yoklaması (rozet + bildirim) ve panel açıkken yenileme
export const SOHBET = { yoklamaSn: 45, acikYoklamaSn: 15, yeniMax: 50 };

// Web Push bildirimleri (api/_lib/push.js)
export const BILDIRIM = {
  ttlSn: 86400,            // telefon kapalıysa push servisi bu kadar saklar (1 gün)
  jwtSureSn: 43200,        // VAPID imzası geçerliliği (≤ 24 sa olmalı)
  zamanAsimiMs: 5000,      // tek gönderim için bekleme sınırı
  kayitBoyu: 4096,         // aes128gcm kayıt boyu (rs)
  metinMax: 140,           // bildirim metni (mesajın başı)
  enCokAlici: 200,         // bir duyuruda en fazla abonelik
  konu: 'mailto:bildirim@soyevrenim.com',   // VAPID "sub" — push servisi sorun olursa buraya yazar
};

// — Yazılı anı (mevcut istemci sınırı) —
export const YAZILI_ANI_MAX_CHARS = 1000;

export const tahminiToken = (metin) => Math.ceil(String(metin || '').length / ASISTAN.tokenKarakter);

// İstemciye açılanlar
export function kamuAyar() {
  return {
    GUNLUK_SISTEM, GUNLUK_KISI, HIKAYE_MAX_CHARS, YAZILI_ANI_MAX_CHARS,
    SES: { mime: SES.mime, mimeYedek: SES.mimeYedek, bitHizi: SES.bitHizi, parcaSn: SES.parcaSn,
      parcaMaxMb: SES.parcaMaxMb, maxKayitDk: SES.maxKayitDk },
    DEPOLAMA: { kotaBayt: DEPOLAMA.kotaBayt },
    MEDYA: { fotoMaxMb: MEDYA.fotoMaxMb, videoMaxMb: MEDYA.videoMaxMb, vekilMaxMb: MEDYA.vekilMaxMb },
    SOHBET, ANA_EKRAN,
    KAYIT: { adMin: KAYIT.adMin, adMax: KAYIT.adMax, iliskiler: KAYIT.iliskiler, dogumMin: KAYIT.dogumMin },
    ASISTAN: { ad: ASISTAN.ad, mesajMaxKarakter: ASISTAN.mesajMaxKarakter, gecmisTur: ASISTAN.gecmisTur },
  };
}
