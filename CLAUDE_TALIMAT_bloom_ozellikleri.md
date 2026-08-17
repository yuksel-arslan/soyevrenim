# Görev: Bloom Özelliklerini Spiral Sürüme Taşıma

## Bağlam
`kok-spiral/kok-graf-spiral.html` — "Abdurrahman Oğulları" aile ağacı (244 kişi, 9 nesil), vanilla JS + Canvas/SVG. Neo4j KULLANILMAYACAK; her şey mevcut JSON verisi üzerinde saf JS ile yapılacak. Bloom'un 4 özelliği eklenecek:

1. Yol bulma (pathfinding) — akrabalık yolu / ortak ata
2. Sahneye ekleme/çıkarma (incremental expand)
3. Odak modu (focus / neighbors-only)
4. Nesil kaydırıcısı (generation slider)

Her özellik mobil uyumlu ve dark mod uyumlu olmalı. Mevcut lens/filtre, ilişki kartı, kol hiyerarşisi bozulmayacak.

---

## Ön hazırlık: Graf yardımcı katmanı

Tüm özellikler ortak bir graf modeline dayanır. Önce şunları kur:

```js
// Kişileri id ile hızlı erişim
const byId = new Map(kisiler.map(k => [k.id, k]));

// Komşuluk listesi (yönsüz akrabalık gezme için)
// baba/anne bağlarından iki yönlü kenar üret
function buildAdjacency(kisiler) {
  const adj = new Map();
  const add = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a).add(b);
  };
  for (const k of kisiler) {
    for (const pid of [k.baba, k.anne].filter(Boolean)) {
      add(k.id, pid); add(pid, k.id);   // ebeveyn-çocuk çift yön
    }
  }
  return adj;
}
const ADJ = buildAdjacency(kisiler);

// Çocuk listesi (dallanarak açma için — yönlü)
const children = new Map();
for (const k of kisiler) {
  for (const pid of [k.baba, k.anne].filter(Boolean)) {
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid).push(k.id);
  }
}
```

---

## ÖZELLİK 1: Yol bulma (pathfinding)

### Davranış
Kullanıcı iki kişi seçer → aralarındaki en kısa akrabalık yolu vurgulanır ve bir kartta özetlenir ("X, Y'nin 3. dereceden kuzeni; ortak ata: Z").

### Adımlar
1. **UI:** "Yol bul" modu düğmesi. Modda birinci tık = A, ikinci tık = B.
2. **BFS ile en kısa yol** (yönsüz, `ADJ` üzerinde):
```js
function shortestPath(aId, bId) {
  if (aId === bId) return [aId];
  const prev = new Map([[aId, null]]);
  const q = [aId];
  while (q.length) {
    const cur = q.shift();
    for (const nb of (ADJ.get(cur) || [])) {
      if (!prev.has(nb)) {
        prev.set(nb, cur);
        if (nb === bId) {                 // yolu geri çöz
          const path = [bId]; let p = cur;
          while (p !== null) { path.push(p); p = prev.get(p); }
          return path.reverse();
        }
        q.push(nb);
      }
    }
  }
  return null; // bağlı değil
}
```
3. **Ortak ata:** Yol üzerinde nesli (generation) en küçük olan düğüm = tepe/ortak ata. Ata zincirlerini de karşılaştırarak doğrula (her iki kişinin köke giden ata seti kesişimi, en yakın olanı = LCA).
```js
function ancestors(id) {           // köke kadar tüm atalar (mesafe ile)
  const res = new Map([[id, 0]]);
  let frontier = [[id, 0]];
  while (frontier.length) {
    const [cur, d] = frontier.shift();
    const k = byId.get(cur);
    for (const pid of [k.baba, k.anne].filter(Boolean)) {
      if (!res.has(pid)) { res.set(pid, d+1); frontier.push([pid, d+1]); }
    }
  }
  return res;
}
function lca(aId, bId) {
  const A = ancestors(aId), B = ancestors(bId);
  let best = null, bestSum = Infinity;
  for (const [id, da] of A) if (B.has(id)) {
    const sum = da + B.get(id);
    if (sum < bestSum) { bestSum = sum; best = id; }
  }
  return best; // en yakın ortak ata
}
```
4. **Akrabalık derecesi:** yol uzunluğu + ortak ataya mesafelerden dereceyi hesapla (ör. iki tarafın ortak ataya mesafesi eşitse "N. dereceden kuzen", farklıysa "amca/dayı çocuğu" vb.). Basit tutmak istersen sadece yol uzunluğunu göster.
5. **Görselleştirme:** Yol üzerindeki düğüm+kenarları altın parlak, gerisini sönük. Kartta: iki isim, ortak ata, adım sayısı, akrabalık etiketi.

---

## ÖZELLİK 2: Sahneye ekleme/çıkarma (incremental expand)

### Davranış
Başlangıçta tüm 244 düğüm yerine sadece kök (Molla Memiş) + ilk nesil görünür. Bir düğüme çift tık / uzun bas → çocukları sahneye eklenir. Tekrar → daraltır (kendi alt ağacını gizler).

### Adımlar
1. **Görünürlük durumu:** her düğümde `expanded: bool`. Sahnede sadece `visible` set'indeki düğümler çizilir/yerleştirilir.
```js
const visible = new Set();
function seedVisible() {              // kök + 1. nesil
  const root = kisiler.find(k => !k.baba && !k.anne);
  visible.add(root.id);
  for (const c of (children.get(root.id) || [])) visible.add(c);
}
function expand(id) {
  for (const c of (children.get(id) || [])) visible.add(c);
  byId.get(id).expanded = true;
}
function collapse(id) {              // alt ağacı gizle (BFS ile)
  const stack = [...(children.get(id) || [])];
  while (stack.length) {
    const c = stack.pop();
    visible.delete(c);
    stack.push(...(children.get(c) || []));
  }
  byId.get(id).expanded = false;
}
```
2. **Yeniden yerleşim:** her expand/collapse sonrası `layoutSpiral(visible)` ve `resolveOverlaps` yalnızca görünür düğümlerle çalışsın; sonra `fitToScreen`. Yeni gelen düğümlere kısa bir açılış animasyonu (opacity/scale ease) verilebilir.
3. **Mobil:** çift tık yerine **uzun bas** (long-press ~450ms) ile genişlet — tek tık seçim, uzun bas expand. Sürükleme (pan) long-press'i iptal etmeli.
4. **Genişletilebilirlik göstergesi:** çocuğu olan ama daraltılmış düğümlerde küçük bir "+" halkası çiz.

---

## ÖZELLİK 3: Odak modu (focus / neighbors-only)

### Davranış
Bir düğüm seçilince: o kişi + doğrudan komşuları (ebeveyn, çocuklar, eş varsa) tam parlak, diğer her şey belirgin şekilde sönük. Boşluğa tık → normal görünüm.

### Adımlar
1. **Odak seti:**
```js
function focusSet(id) {
  const s = new Set([id]);
  for (const nb of (ADJ.get(id) || [])) s.add(nb);  // 1 derece komşu
  return s;
}
```
2. **Render:** `focusActive` ise, odak setindeki düğüm/kenarlar `alpha=1`, gerisi `alpha≈0.12` (mevcut lens sönüklük değeriyle uyumlu). Kenarlar: en az bir ucu odak setinde ise parlak.
3. **Lens ile çakışma:** Odak modu lens filtresinin ÜSTÜNE çalışsın; ikisi aktifse kesişim parlak. Tek bir `nodeAlpha(node)` fonksiyonunda tüm parlaklık kuralları (lens + focus + path) birleştirilsin ki çakışma olmasın.
```js
function nodeAlpha(node) {
  let a = 1;
  if (lensActive && !passesLens(node)) a = Math.min(a, DIM);
  if (focusActive && !focusIds.has(node.id)) a = Math.min(a, DIM);
  if (pathActive && !pathIds.has(node.id)) a = Math.min(a, DIM);
  return a;
}
```
4. **Kapatma:** ESC / boşluğa tık / kart kapatma → `focusActive=false`, odak düğüme kamera geri döner (mevcut davranış korunur).

---

## ÖZELLİK 4: Nesil kaydırıcısı (generation slider)

### Davranış
Bir aralık kaydırıcısı (range slider): "1–N nesil arası göster". Seçili aralık dışındaki nesiller gizlenir (veya sönükleşir — tercih: gizle). Tek uçlu da olabilir ("5. nesle kadar").

### Adımlar
1. **Nesil hesabı:** her kişide `gen` (kökten mesafe). Yoksa kökten BFS ile bir kez hesapla ve cache'le.
2. **UI:** çift-uçlu range slider (min–max nesil). Mobilde parmakla rahat tutulacak büyük thumb. Dark mod stili.
3. **Filtre:** `visibleByGen = k => k.gen >= lo && k.gen <= hi`. Bu filtre incremental-expand'in `visible` setiyle **AND**lenir (ikisi birden aktifse kesişim). Slider değişince yeniden layout + fit.
4. **Etiket:** slider yanında "Nesil 1–5 · 87 kişi" gibi canlı sayaç.
5. **Sıfırla:** tek dokunuşla tüm nesilleri göster.

---

## Ortak render kuralı (kritik)
Dört özellik de aynı çizim döngüsünü paylaşır. Çakışmayı önlemek için tek bir "görünürlük + parlaklık" pipeline'ı kur:
- **Görünürlük:** `visible (expand)` ∩ `gen aralığı (slider)` → çizilecek düğümler.
- **Parlaklık:** `nodeAlpha()` (lens + focus + path birleşik).
- Layout ve fitToScreen HER görünürlük değişiminde yeniden çağrılır.

---

## Çıktı ve doğrulama
1. Değişiklikleri `kok-spiral/kok-graf-spiral.html`'e uygula, çıktıyı `/mnt/user-data/outputs/`'a kopyala.
2. Test:
   - İki kişi seç → doğru en kısa yol ve ortak ata çıkıyor mu? Bağlı olmayan çift → "yol yok" mesajı.
   - Açılışta sadece kök+1. nesil mi görünüyor? Uzun bas genişletiyor, tekrar daraltıyor mu?
   - Düğüm seç → sadece komşuları parlak mı? Boşluğa tık normale dönüyor mu?
   - Nesil slider aralığı kişileri doğru gizliyor/gösteriyor mu? Sayaç doğru mu?
   - Hepsi aynı anda aktifken parlaklık/görünürlük tutarlı mı (çakışma yok)?
   - Mobil (~380px): slider, uzun bas, pan/tap ayrımı sorunsuz mu?
3. `kok-spiral/kok-graf-spiral.md` güncelle: 4 yeni özellik, graf yardımcı katmanı (byId/ADJ/children), birleşik `nodeAlpha` pipeline'ı, etkileşimler (uzun bas=expand, yol-bul modu, slider).

## Kısıtlar
- Vanilla JS + HTML/CSS, framework yok. Neo4j yok.
- Mevcut lens/filtre, ilişki kartı, kol hiyerarşisi, tap=seç / drag=pan / pinch=zoom davranışları korunur.
- Dark mod ve mobil uyum her özellikte ayrıca test edilir.
