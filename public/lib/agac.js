// ÜRETİLMİŞ DOSYA — düzenleme. Kaynak: api/_lib/agac.js (npm run build)
// AĞAÇ KÜTÜPHANESİ — saf fonksiyonlar, hem sunucu hem istemci kullanır.
// Kaynak burası. public/lib/agac.js bu dosyanın kopyasıdır (npm run build ile üretilir:
// scripts/lib-kopyala.mjs). İstemci yol bulma / ortak ata / akrabalık etiketini buradan alır.
//
// Veri modeli: {nodes, edges(ebeveyn→çocuk), motherEdges(anne→çocuk), marriages}
// Graf: ADJ (yönsüz komşuluk), PARENTS (çocuk→ebeveynler), CHILDREN (ebeveyn→çocuklar)

export function adiGoster(s) {
  return String(s || '').replace('★', '').replace(/\s*\d+$/, '').trim();
}

export function normalize(s) {
  return adiGoster(s).toLocaleLowerCase('tr')
    .replace(/[’'`]/g, ' ').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export function grafKur(veri) {
  const byId = {};
  (veri.nodes || []).forEach((n) => { byId[n.id] = n; });
  const ADJ = new Map(), CHILDREN = new Map(), PARENTS = new Map(), SPOUSE = new Map();
  const ekle = (m, a, b) => { if (!m.has(a)) m.set(a, new Set()); m.get(a).add(b); };
  const ebeveyn = (p, c) => { ekle(ADJ, p, c); ekle(ADJ, c, p); ekle(CHILDREN, p, c); ekle(PARENTS, c, p); };
  (veri.edges || []).forEach((e) => { if (byId[e.from] && byId[e.to]) ebeveyn(e.from, e.to); });
  (veri.motherEdges || []).forEach((m) => { if (byId[m.from] && byId[m.to]) ebeveyn(m.from, m.to); });
  (veri.marriages || []).forEach((m) => {
    if (byId[m.from] && byId[m.to]) { ekle(ADJ, m.from, m.to); ekle(ADJ, m.to, m.from); ekle(SPOUSE, m.from, m.to); ekle(SPOUSE, m.to, m.from); }
  });
  return { byId, ADJ, CHILDREN, PARENTS, SPOUSE, veri };
}

// En kısa yol (BFS, yönsüz)
export function enKisaYol(g, aId, bId) {
  if (aId === bId) return [aId];
  const prev = new Map([[aId, null]]); const q = [aId];
  while (q.length) {
    const cur = q.shift();
    for (const nb of (g.ADJ.get(cur) || [])) {
      if (prev.has(nb)) continue;
      prev.set(nb, cur);
      if (nb === bId) {
        const yol = [bId]; let p = cur;
        while (p !== null) { yol.push(p); p = prev.get(p); }
        return yol.reverse();
      }
      q.push(nb);
    }
  }
  return null;
}

// Köke kadar atalar (mesafeyle)
export function atalar(g, id) {
  const res = new Map([[id, 0]]); const k = [[id, 0]];
  while (k.length) {
    const [cur, d] = k.shift();
    for (const pid of (g.PARENTS.get(cur) || [])) {
      if (!res.has(pid)) { res.set(pid, d + 1); k.push([pid, d + 1]); }
    }
  }
  return res;
}

// En yakın ortak ata
export function ortakAta(g, aId, bId) {
  const A = atalar(g, aId), B = atalar(g, bId);
  let best = null, bestSum = Infinity, da = 0, db = 0;
  for (const [id, x] of A) {
    if (!B.has(id)) continue;
    const y = B.get(id);
    if (x + y < bestSum) { bestSum = x + y; best = id; da = x; db = y; }
  }
  return best ? { id: best, da, db } : null;
}

export function akrabalikEtiketi(o) {
  if (!o) return 'ortak ata bulunamadı';
  const { da, db } = o;
  if (da === 0 || db === 0) return 'doğrudan ata–torun hattı';
  if (da === 1 && db === 1) return 'kardeş';
  if (da === 1 || db === 1) {
    const k = Math.max(da, db) - 1;
    return k === 1 ? 'amca/dayı/hala/teyze – yeğen' : `${k}. dereceden amca/dayı – yeğen`;
  }
  const derece = Math.min(da, db) - 1, fark = Math.abs(da - db);
  return fark === 0 ? `${derece}. dereceden kuzen` : `${derece}. dereceden kuzen (${fark} kuşak uzaklıkla)`;
}

// u'dan v'ye tek adımın ilişkisi: "v, u'nun ___"
export function adimIliskisi(g, u, v) {
  const n = g.byId[v] || {};
  const kadin = n.sex === 'K';
  if ((g.PARENTS.get(v) || new Set()).has(u)) return kadin ? 'kızı' : 'oğlu';
  if ((g.PARENTS.get(u) || new Set()).has(v)) return kadin ? 'annesi' : 'babası';
  if ((g.SPOUSE.get(u) || new Set()).has(v)) return 'eşi';
  return 'bağlı';
}

// Tam yol bilgisi (asistan + istemci kartı)
export function yolBul(g, aId, bId) {
  const yol = enKisaYol(g, aId, bId);
  if (!yol) return null;
  const adimlar = [];
  for (let i = 0; i < yol.length - 1; i++) {
    adimlar.push({ kimden: yol[i], kime: yol[i + 1], iliski: adimIliskisi(g, yol[i], yol[i + 1]) });
  }
  const ata = ortakAta(g, aId, bId);
  return { yol, adimlar, ata, etiket: akrabalikEtiketi(ata) };
}

export function yakinlar(g, id) {
  const P = [...(g.PARENTS.get(id) || [])];
  const kardes = new Set();
  P.forEach((p) => (g.CHILDREN.get(p) || new Set()).forEach((c) => { if (c !== id) kardes.add(c); }));
  return {
    ebeveynler: P,
    cocuklar: [...(g.CHILDREN.get(id) || [])],
    esler: [...(g.SPOUSE.get(id) || [])],
    kardesler: [...kardes],
  };
}

export function nesil(g, id) {
  let d = 0, cur = id; const gor = new Set();
  // baba hattı (edges) üzerinden köke uzaklık
  while (cur && !gor.has(cur)) {
    gor.add(cur);
    const e = (g.veri.edges || []).find((x) => x.to === cur);
    if (!e) break;
    cur = e.from; d++;
  }
  return d;
}

// Kısa kimlik satırı: "Hamit (Mehmet oğlu, 4. nesil, vefat)"
export function kisiKisa(g, id) {
  const n = g.byId[id]; if (!n) return null;
  const P = [...(g.PARENTS.get(id) || [])].map((p) => g.byId[p]).filter(Boolean);
  const baba = P.find((p) => p.sex !== 'K'), anne = P.find((p) => p.sex === 'K');
  return {
    id, ad: adiGoster(n.name), cinsiyet: n.sex === 'K' ? 'kadın' : 'erkek',
    yasiyor: n.alive !== false, nesil: nesil(g, id),
    baba: baba ? adiGoster(baba.name) : (n.fatherExt || null),
    anne: anne ? adiGoster(anne.name) : null,
    esler: [...(g.SPOUSE.get(id) || [])].map((s) => adiGoster(g.byId[s]?.name)).concat(
      (n.spouse || []).filter((s) => !String(s).includes('(aileden)')).map(adiGoster)),
  };
}

// İsimle arama: tüm sözcükler adda geçmeli. Tam eşleşmeler önce.
export function kisiAra(g, sorgu, limit = 10) {
  const q = normalize(sorgu);
  if (!q) return [];
  const parca = q.split(' ');
  const sonuc = [];
  for (const n of (g.veri.nodes || [])) {
    const ad = normalize(n.name);
    if (!parca.every((p) => ad.split(' ').some((w) => w.startsWith(p)) || ad.includes(p))) continue;
    const puan = ad === q ? 0 : ad.startsWith(q) ? 1 : 2;
    sonuc.push({ puan, id: n.id });
  }
  sonuc.sort((a, b) => a.puan - b.puan);
  return sonuc.slice(0, limit).map((s) => kisiKisa(g, s.id));
}
