# Görev: Kişi Kartı — Eş/Çocuk Satırını Tam Cümle Yap

## Bağlam
Kişi detay/özet kartında şu an eş ve çocuk bilgisi kısaltılmış biçimde gösteriliyor:
`☞ Nevin Kaya · 1 çocuk`

Bunun yerine tam, doğal Türkçe cümle olacak:
`Nevin Kaya ile evli, 1 çocuğu var`

## Yapılacak
Kartın eş/çocuk satırını üreten yeri bul ve aşağıdaki cümle kurucu ile değiştir. İkon (☞) kalksın, düz cümle yazılsın.

```js
function esCocukCumlesi(kisi) {
  const parcalar = [];

  // Eş
  if (kisi.es && kisi.es.trim()) {
    parcalar.push(`${kisi.es.trim()} ile evli`);
  }

  // Çocuk
  const n = kisi.cocukSayisi ?? 0;   // veri alan adı neyse ona uyarla
  if (n > 0) {
    parcalar.push(`${n} çocuğu var`);
  }

  return parcalar.join(", ");   // "Nevin Kaya ile evli, 1 çocuğu var"
}
```

## Kenar durumları (hepsini karşıla)
- **Eş var + çocuk var:** `Nevin Kaya ile evli, 1 çocuğu var`
- **Sadece eş:** `Nevin Kaya ile evli`
- **Sadece çocuk:** `1 çocuğu var`
- **İkisi de yok:** satırı hiç gösterme (boş string → kartta o satır render edilmesin).
- Çocuk sayısı için tekil/çoğul ayrımı Türkçede gerekmiyor: 1 de 3 de "çocuğu var" (doğru). Yani sayıdan bağımsız hep "çocuğu var".

## Kısıtlar
- Vanilla JS + HTML/CSS, framework yok.
- Veri alan adları mevcut şemaya göre uyarlanacak (`es`, `cocukSayisi` vb. — gerçek isimler neyse onları kullan).
- Dark/light mod ve mobil görünüm bozulmayacak; sadece metin biçimi değişiyor.
- Bu kart hem sol panelde hem sağ üst sabit kartta kullanılıyorsa, ikisinde de aynı cümle kurucu kullanılsın (tek fonksiyon).

## Doğrulama
- Eşi + çocuğu olan kişi → tam cümle.
- Yalnız eşi olan / yalnız çocuğu olan / ikisi de olmayan kişilerde doğru varyant.
- İlgili `.md` dosyasında kart içeriği açıklamasını bu yeni biçime göre güncelle.
