// MODEL · KOTA · LİMİT — tek kaynak. Kodun başka hiçbir yerinde bu sayılar yazılmaz.
// İstemci kamuya açık olanları /api/kullanim?adim=ayar ile alır.
//
// Model: tamamen ücretsiz katman. Ödeme yok. Groq'un ücretsiz günlük sınırları SİSTEM
// GENELİDİR; adil paylaşım için kişi başı ayrıca sınırlanır. Gün sınırı UTC 00:00
// (Türkiye 03:00) — Groq sayaçlarıyla aynı an.

export const LLM = { saglayici: 'groq', model: 'openai/gpt-oss-120b' }; // ileride tek satırla değişebilir
export const STT = { saglayici: 'groq', model: 'whisper-large-v3-turbo' };
export const GUNLUK_SISTEM = { token: 190000, istek: 950, sesSn: 27000 }; // Groq sınırının %95'i
export const GUNLUK_KISI = { mesaj: 20, sesDk: 30 };  // ortak kotayı adil paylaştırmak için
export const MESAJ_MAX_TOKEN = 4000;                 // tüm ağacı isteme koyma, araçla getir
export const HIKAYE_MAX_CHARS = 20000;

// — Sağlayıcı uçları —
export const SAGLAYICI = {
  groq: {
    sohbet: 'https://api.groq.com/openai/v1/chat/completions',
    yaziya: 'https://api.groq.com/openai/v1/audio/transcriptions',
    anahtarEnv: 'GROQ_API_KEY',
  },
};

// — Asistan —
export const ASISTAN = {
  maxTur: 4,               // sunucu tarafı araç döngüsü üst sınırı
  ciktiMaxToken: 1200,     // tek yanıt (gerekçe dahil) üst sınırı
  gerekce: 'low',          // gpt-oss reasoning_effort — kısa düşün, kota harcama
  gecmisTur: 6,            // istemciden kabul edilen önceki mesaj sayısı
  mesajMaxKarakter: 600,   // kullanıcı mesajı
  aracSonucMaxKarakter: 2500,
  soyTarihiMaxKarakter: 6500, // soy_tarihi aracı (Fahri Arslan notu + kaynaklı bağlam)
  aramaSonucMax: 8,
  aniParcaKarakter: 300,
  kisiAniMax: 6,
  tokenKarakter: 3,        // kaba tahmin: 1 token ≈ 3 karakter (Türkçe, temkinli)
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
  whisperMinSn: 10,        // Groq istek başına en az 10 sn sayar
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

// — Panel: katkı sıralaması (1 eklenen kişi = bu kadar saniyelik hikâye ağırlığında)
export const KATKI = { kisiAgirlikSn: 60 };

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
    ASISTAN: { mesajMaxKarakter: ASISTAN.mesajMaxKarakter, gecmisTur: ASISTAN.gecmisTur },
  };
}
