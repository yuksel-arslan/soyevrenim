# Görev: Soy Ağacında Cinsiyet Alanı Ekleme ve Doğrulama

## Bağlam
"Abdurrahman Oğulları" soy ağacı projesi (244 kişi, 9 nesil). Kişilere cinsiyet bilgisi eklenecek ve baba/anne rolleriyle çelişkiler bulunacak. **"Bedriye" gibi kadın isimlerinin baba pozisyonunda görünmesi gibi hatalar tespit edilip düzeltilecek.**

## Kurallar
1. **İsimden tahmine güvenme.** Ek kuralı (`-iye`, `-e`) kullanma — yanlış sonuç verir (örn. Yahya erkek).
2. Cinsiyet için **açık sözlük** kullan. Sözlükte olmayan isimleri `null` bırak ve raporla; ASLA tahmin uydurma.
3. Yapısal doğrulama yap: `baba` bağıyla bağlı düğüm → E, `anne` bağıyla bağlı → K. Çelişkileri uyarı olarak listele.

## Adımlar

### 1. Veriyi bul ve incele
- Proje dizinlerinde (`kok-3d/`, `kok-spiral/`, `kok-canli/`) kişi verisinin tutulduğu dosyayı bul (JSON veya JS array).
- Veri şemasını (isim, id, baba/anne/parent alanları) çıkar ve özetle.

### 2. Cinsiyet sözlüğü oluştur
- Ve/deki tüm benzersiz ilk isimleri çıkar.
- `ERKEK` ve `KADIN` set'lerini bilinen Türkçe isimlerle doldur.
- Eşleşmeyenleri `bilinmeyen[]` listesine koy.

```js
const KADIN = new Set(["Bedriye","Fatma","Ayşe","Hatice","Zeynep","Emine","Elif",
  "Hanife","Şerife","Hava","Sultan","Gülizar","Nazlı","Havva","Rukiye","Naciye"]);
const ERKEK = new Set(["Fahri","Yüksel","Memiş","Abdurrahman","Mehmet","Ali",
  "Hüseyin","Osman","Yahya","İbrahim","İsmail","Süleyman","Mustafa","Ahmet"]);

function cinsiyetBul(isim) {
  const ad = isim.trim().split(/\s+/)[0];
  if (KADIN.has(ad)) return "K";
  if (ERKEK.has(ad)) return "E";
  return null;
}
```

### 3. Her kişiye `cinsiyet` alanı ekle
- Sözlükten bulunabilenleri işaretle.
- Bulunamayanları `cinsiyet: null` yap.

### 4. Çelişki tespiti
Aşağıdaki durumları RAPORLA (otomatik değiştirme, sadece listele):
- `baba` rolündeki kişi cinsiyet=K → **ÇELİŞKİ** (örn. Bedriye)
- `anne` rolündeki kişi cinsiyet=E → **ÇELİŞKİ**
- cinsiyet=null olan kişiler → **MANUEL ETİKET GEREKLİ**

```js
function veriDogrula(kisiler) {
  const celiskiler = [], eksikler = [];
  for (const k of kisiler) {
    if (k.rol === "baba" && k.cinsiyet === "K")
      celiskiler.push(`${k.id} - ${k.isim}: baba ama kadın işaretli`);
    if (k.rol === "anne" && k.cinsiyet === "E")
      celiskiler.push(`${k.id} - ${k.isim}: anne ama erkek işaretli`);
    if (k.cinsiyet === null)
      eksikler.push(`${k.id} - ${k.isim}`);
  }
  return { celiskiler, eksikler };
}
```

### 5. Çıktı
- Güncellenmiş veri dosyasını yaz (`cinsiyet` alanı eklenmiş).
- Konsola / ayrı bir `cinsiyet-rapor.md` dosyasına:
  - Toplam kişi sayısı
  - Erkek / Kadın / Bilinmeyen dağılımı
  - **Çelişki listesi** (baba=kadın vb.)
  - Manuel etiketlenmesi gereken isimler listesi

### 6. Doğrulama
- Script'i çalıştır, rapordaki her çelişkiyi tek tek göster.
- Çelişkileri otomatik düzeltme — bana listeyi sun, karar vereyim.

## Kısıtlar
- Vanilla JS + HTML/CSS, framework yok.
- Mevcut dosya yapısını bozma; cinsiyet alanını ek olarak ekle.
- İşin sonunda `cinsiyet-rapor.md` dosyasını güncel tut (bu mikroservisin .md'si).
