# Görev: Spiral Sürümü — Düğüm Çakışması + Mobil Sürükleme Düzeltmesi

## Bağlam
`kok-spiral/kok-graf-spiral.html` — "Abdurrahman Oğulları" spiral network görselleştirmesi.
İki sorun var:
1. Düğümler iç içe geçiyor, spiral hissedilmiyor, mobile sığmıyor.
2. Mobilde ekranı kaydırmak için dokununca düğüme takılıp düğümü sürüklüyor.

Kesin çözülecek. Aşağıdaki adımları uygula.

---

## SORUN 1: Düğüm çakışması + spiral okunurluğu + mobil sığma

### Kural
Yan yana iki düğüm arasında **en az bir düğüm çapı kadar boşluk** olmalı. Yani iki komşu düğüm merkezi arası mesafe ≥ `2 * r + r` = `3 * r` (r = düğüm yarıçapı). Kısaca merkez-merkez minimum mesafe = `NODE_DIAMETER * 2`.

### Adımlar

**1. Ölçeği ekrana göre hesapla (mobil sığma)**
`layoutSpiral()` içinde sabit piksel değerleri kullanma. Şu ölçekleri canvas boyutundan türet:
```js
const W = canvas.width, H = canvas.height;
const minDim = Math.min(W, H);
const NODE_R = Math.max(4, minDim * 0.012);      // düğüm yarıçapı ekranla ölçekli
const RING_GAP = NODE_R * 6;                       // nesiller (halkalar) arası mesafe
const MIN_SEP = NODE_R * 3;                         // komşu düğümler arası min merkez mesafe (1 çap boşluk)
```

**2. Radyal yerleşim: her nesil bir halka**
Molla Memiş merkezde/tabanda. Her nesil (generation) için bir yarıçap:
```js
radius(gen) = BASE_R + gen * RING_GAP;
```
Bu, iç içe geçmeyi baştan azaltır çünkü nesiller ayrı halkalara oturur.

**3. Açısal aralık: çakışmayı garantile**
Bir halkadaki (aynı nesil) düğüm sayısı `n`, yarıçap `R` ise, iki komşu arası yay uzunluğu `arc = (2π R * dilim_oranı) / n`. Bu `arc >= MIN_SEP` olmalı.
- Eğer sığmıyorsa: o nesil için yarıçapı **otomatik büyüt** (`R = max(R, n * MIN_SEP / (2π * dilim_oranı))`) ki hepsi çapraşmadan sığsın.
- Her düğümü kendi kolunun (branch) açısal dilimine yerleştir; yaprak ağırlığına göre dilim genişliğini koru (mevcut yaklaşım).

**4. Çakışma çözücü (relaxation) — güvence katmanı**
Yerleşimden sonra, kalan çakışmaları iteratif olarak it:
```js
function resolveOverlaps(nodes, minSep, iterations = 60) {
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        let dist = Math.hypot(dx, dy) || 0.001;
        if (dist < minSep) {
          const push = (minSep - dist) / 2;
          const ux = dx / dist, uy = dy / dist;
          a.x -= ux * push; a.y -= uy * push;
          b.x += ux * push; b.y += uy * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}
```
`layoutSpiral()` sonunda `resolveOverlaps(nodes, MIN_SEP)` çağır. (244 düğüm için O(n²)×60 kabul edilebilir; yavaşsa grid/quadtree ile hızlandır.)

**5. Başlangıçta ekrana sığdır (auto-fit)**
Yerleşim bitince tüm düğümlerin bounding box'ını hesapla, `scale` ve `offset`'i öyle ayarla ki her şey ekrana **kenar boşluğuyla** sığsın:
```js
function fitToScreen(nodes, W, H, pad = 40) {
  const xs = nodes.map(n=>n.x), ys = nodes.map(n=>n.y);
  const minX=Math.min(...xs), maxX=Math.max(...xs);
  const minY=Math.min(...ys), maxY=Math.max(...ys);
  const bw = maxX-minX || 1, bh = maxY-minY || 1;
  view.scale = Math.min((W-2*pad)/bw, (H-2*pad)/bh);
  view.offsetX = (W - bw*view.scale)/2 - minX*view.scale;
  view.offsetY = (H - bh*view.scale)/2 - minY*view.scale;
}
```
Açılışta ve `resize`'da çağır. Böylece ekranın yarısına yığılma / taşma olmaz, mobilde de tam sığar.

---

## SORUN 2: Mobilde sürükleme düğüme takılıyor

### Kök neden
Dokunma başlangıcında düğüm "yakalanıyor" (drag), parmak hareketi düğümü taşıyor. İstenen: **parmakla ekranı pan et**, düğümü değil.

### Kural
- **Sürükleme (drag) = pan/zoom.** Düğümler asla parmakla taşınmaz.
- **Düğüm seçimi = TAP** (kısa dokunuş, hareketsiz). Hareket varsa tap değildir.

### Adımlar

**1. Düğüm sürüklemeyi tamamen kaldır**
Eğer kod düğümü mouse/touch ile taşıyorsa (node dragging), o mantığı sil. Kullanıcı düğüm konumunu elle değiştirmiyor.

**2. Pan/zoom ile tap'ı ayır (hareket eşiği)**
Touch/pointer olaylarında hareket mesafesini ölç. Eşik altındaysa tap (seç), üstündeyse pan:
```js
const TAP_SLOP = 10;        // px — bu kadar hareket edilirse artık tap değil
const TAP_TIME = 300;       // ms

let startX, startY, startT, isPanning = false;

function onPointerDown(e){
  const p = getPoint(e);
  startX = p.x; startY = p.y; startT = performance.now();
  isPanning = false;
  lastX = p.x; lastY = p.y;
}

function onPointerMove(e){
  const p = getPoint(e);
  const dx = p.x - startX, dy = p.y - startY;
  if (!isPanning && Math.hypot(dx, dy) > TAP_SLOP) isPanning = true;
  if (isPanning){
    view.offsetX += (p.x - lastX);
    view.offsetY += (p.y - lastY);
    lastX = p.x; lastY = p.y;
    draw();
  }
}

function onPointerUp(e){
  const p = getPoint(e);
  const dist = Math.hypot(p.x - startX, p.y - startY);
  const dt = performance.now() - startT;
  if (!isPanning && dist <= TAP_SLOP && dt <= TAP_TIME){
    const node = pickNode(p.x, p.y);   // sadece burada seçim yapılır
    if (node) selectNode(node);
  }
  isPanning = false;
}
```

**3. Pointer Events + touch-action ile birleştir**
Mouse ve touch için tek yol kullan (`pointerdown/move/up`). Canvas'a:
```css
canvas { touch-action: none; }   /* tarayıcının kendi kaydırma/zoom'unu engelle, biz yönetelim */
```
`getPoint(e)` fonksiyonu hem mouse hem touch koordinatını canvas-local'e çevirsin (rect + devicePixelRatio dikkate al).

**4. Pinch-zoom (mobil)**
İki parmak varsa zoom yap; tek parmak pan. `touchmove`'da `e.touches.length === 2` ise parmaklar arası mesafeye göre `view.scale` güncelle, merkez noktayı sabit tutarak zoom uygula. `e.preventDefault()` çağır.

**5. Koordinat dönüşümü tutarlı olsun**
`pickNode` seçimi ve çizim aynı `view.scale/offset` dönüşümünü kullanmalı, yoksa yanlış düğüm seçilir:
```js
function toWorld(px, py){
  return { x: (px - view.offsetX)/view.scale, y: (py - view.offsetY)/view.scale };
}
```
`pickNode` içinde tıklama noktasını world'e çevirip düğüm yarıçapıyla (dünya biriminde) karşılaştır.

---

## Çıktı ve doğrulama
1. Değişiklikleri `kok-spiral/kok-graf-spiral.html`'e uygula, çıktıyı `/mnt/user-data/outputs/`'a kopyala.
2. Test et:
   - Açılışta tüm düğümler ekrana sığıyor mu? (mobil dar viewport ~380px dahil)
   - Yan yana düğümler arası ≥ 1 çap boşluk var mı? İç içe geçen düğüm kaldı mı?
   - Mobilde tek parmak pan → düğüm YERİNDE KALIYOR mu?
   - Kısa dokunuş → düğüm seçiliyor mu? Sürükleme → seçmiyor, pan yapıyor mu?
   - İki parmak → zoom çalışıyor mu?
3. `kok-spiral/kok-graf-spiral.md` dosyasını güncelle:
   - Yeni yerleşim parametreleri (NODE_R, RING_GAP, MIN_SEP, auto-fit)
   - Etkileşim modeli (tap=seç, drag=pan, pinch=zoom, node-drag kaldırıldı)

## Kısıtlar
- Vanilla JS + HTML/CSS, framework yok.
- Mevcut lens/filtre, ilişki kartı, kol hiyerarşisi özelliklerini bozma.
- Dark mod korunsun.
- Her özellik eklendiğinde mobil uyumu ayrıca test et.
