# Görev: iPhone (iOS Safari) — Pan/Kaydırma Çalışmıyor Düzeltmesi

## Bağlam
Spiral/koni görünümü iPhone Safari'de parmakla sağa-sola-yukarı-aşağı hareket ettirilemiyor (pan çalışmıyor). **Android'de (Chrome) sorunsuz çalışıyor — sorun yalnızca iOS Safari'de.** Bu, kök nedeni ciddi şekilde daraltır: masaüstü ve Android çalıştığına göre pan mantığının kendisi doğru; sorun iOS Safari'nin touch olaylarını farklı ele almasında.

## En olası iki neden (Android çalışıp iOS çalışmıyorsa)
Android Chrome bu iki durumu toleranslı işler ama iOS Safari işlemez — önce bunlara bak:

**A) `{ passive: false }` eksikliği (EN OLASI).**
iOS Safari, `touchmove` dinleyicisini varsayılan **passive** kabul eder ve passive dinleyicide `e.preventDefault()` sessizce yok sayılır → sayfa kayar, canvas kaymaz. Android Chrome bu konuda daha esnektir, bu yüzden orada çalışır. Tüm touch dinleyicileri `{ passive: false }` ile yeniden bağla.

**B) `overscroll-behavior` / rubber-band scroll.**
iOS'un lastik-bant kaydırması touch olaylarını canvas'tan çalar. Android'de bu davranış farklıdır. Body/html scroll'unu iOS için kilitle (aşağıda madde 4).

Önce bu ikisini uygula; büyük ihtimalle sorun çözülür. Diğer maddeler tamamlayıcı güvence.


## Olası kök nedenler (hepsini kontrol et ve düzelt)

### 1. `touch-action` ayarı
Canvas/SVG elemanına `touch-action: none;` uygulanmış olmalı. Uygulanmadıysa iOS kendi kaydırma davranışını devralır ve senin pan mantığın çalışmaz.
```css
#graf-canvas { touch-action: none; -ms-touch-action: none; }
```

### 2. Pointer Events iOS'ta güvenilmez → Touch Events fallback ekle
iOS Safari `pointer` olaylarını destekler ama bazı sürümlerde eksik/tutarsız çalışır. En sağlam yol: **touch olaylarını doğrudan dinle.**
```js
const el = canvas;
let lastX = 0, lastY = 0, startX = 0, startY = 0, startT = 0, isPanning = false;
const TAP_SLOP = 10, TAP_TIME = 300;

function pt(e) {
  const t = e.touches ? e.touches[0] : e;
  const rect = el.getBoundingClientRect();
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

el.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    const p = pt(e);
    startX = lastX = p.x; startY = lastY = p.y;
    startT = performance.now(); isPanning = false;
  }
  e.preventDefault();               // iOS'ta zorunlu — yoksa sayfa kayar, canvas kaymaz
}, { passive: false });             // KRİTİK: passive:false olmalı

el.addEventListener('touchmove', (e) => {
  if (e.touches.length === 1) {
    const p = pt(e);
    const dx = p.x - startX, dy = p.y - startY;
    if (!isPanning && Math.hypot(dx, dy) > TAP_SLOP) isPanning = true;
    if (isPanning) {
      view.offsetX += (p.x - lastX);
      view.offsetY += (p.y - lastY);
      lastX = p.x; lastY = p.y;
      draw();
    }
  } else if (e.touches.length === 2) {
    handlePinch(e);                 // iki parmak zoom
  }
  e.preventDefault();               // KRİTİK: iOS'ta sayfa scroll'unu engeller
}, { passive: false });

el.addEventListener('touchend', (e) => {
  const dt = performance.now() - startT;
  const movedDist = Math.hypot(lastX - startX, lastY - startY);
  if (!isPanning && movedDist <= TAP_SLOP && dt <= TAP_TIME) {
    const node = pickNode(startX, startY);
    if (node) selectNode(node);
  }
  isPanning = false;
  e.preventDefault();
}, { passive: false });
```

### 3. `{ passive: false }` MUTLAKA belirtilmeli
iOS Safari touch dinleyicilerini varsayılan olarak **passive** kabul eder; passive dinleyicide `e.preventDefault()` çalışmaz, bu yüzden sayfa kayar ama canvas kaymaz. Tüm touch dinleyicileri `{ passive: false }` ile eklenmeli. Bu, iPhone'da pan çalışmamasının **en yaygın** nedenidir.

### 4. Sayfa geneli scroll/zoom'u kilitle
Body/html iOS'ta lastik-bant (rubber-band) scroll yapıp canvas'ı bloke edebilir.
```css
html, body { margin:0; height:100%; overflow:hidden; overscroll-behavior:none; position:fixed; width:100%; }
```
Ve viewport meta:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
```

### 5. `-webkit-` dokunma vurgusu ve seçim engelle
```css
#graf-canvas { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
```

### 6. Pointer + touch çift bağlama çakışması
Hem pointer hem touch dinleyicisi varsa, iOS'ta ikisi birden tetiklenip pan'i iptal edebilir. Karar ver: iOS/touch cihazda touch olaylarını, masaüstünde pointer/mouse olaylarını kullan. Basit ayrım:
```js
const hasTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (hasTouch) bindTouch(); else bindMouse();
```
Aynı hareketi iki sistemden işleme — çift işleme pan'i bozar.

## Çıktı ve doğrulama
1. Değişiklikleri uygula, çıktıyı `/mnt/user-data/outputs/`'a kopyala.
2. **Gerçek iPhone Safari'de test et** (simülatör değil tercihen):
   - Tek parmak → graf sağa/sola/yukarı/aşağı kayıyor mu?
   - Kısa dokunuş → düğüm seçiliyor, kaydırma seçmiyor mu?
   - İki parmak → zoom çalışıyor mu?
   - Sayfa kendisi kaymıyor / zıplamıyor (rubber-band yok) mu?
3. İlgili `.md` dosyasını güncelle: iOS touch pan çözümü, `{passive:false}` notu, touch/mouse ayrımı.

## Kısıtlar
- Vanilla JS + HTML/CSS, framework yok.
- Mevcut tap=seç / drag=pan / pinch=zoom mantığı, lens, kart, dark mod korunur.
- Masaüstü (mouse) davranışı bozulmayacak — iki cihaz da çalışmalı.
