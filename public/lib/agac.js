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

// Nesil = ana köke uzaklık; eşler aynı nesil, ebeveyn bir üst, çocuk bir alt (nesilHaritasi).
// Eskiden yalnız baba hattı sayılıyordu: eşin kardeşleri "1. nesil" çıkıyordu.
export function nesil(g, id) {
  if (!g._nesil) g._nesil = nesilHaritasi(g);
  return g._nesil.get(id) ?? 0;
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

// Nesil haritası (kök = 0). Eşler aynı nesle, anne bağları ebeveyn-çocuk olarak yayılır —
// istemcideki reindex() ile aynı kural (ağaca evlilikle katılanlar da nesil alır).
export function nesilHaritasi(g) {
  const d = new Map();
  const kokler = (g.veri.nodes || []).filter((n) => !(g.veri.edges || []).some((e) => e.to === n.id && g.byId[e.from]));
  // alt ağacı en büyük kök (dünür ailesinin atası da köksüz görünür)
  const altSay = (id, gor = new Set()) => { if (gor.has(id)) return 0; gor.add(id);
    return 1 + (g.veri.edges || []).filter((e) => e.from === id).reduce((t, e) => t + altSay(e.to, gor), 0); };
  const kok = kokler.map((n) => [n, altSay(n.id)]).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (kok) {
    const yigin = [[kok.id, 0]];
    while (yigin.length) {
      const [id, k] = yigin.pop();
      if (d.has(id)) continue;
      d.set(id, k);
      (g.veri.edges || []).forEach((e) => { if (e.from === id && !d.has(e.to)) yigin.push([e.to, k + 1]); });
    }
  }
  for (let tur = 0; tur < 12; tur++) {
    let degisti = false;
    for (const m of g.veri.marriages || []) {
      if (d.has(m.from) && !d.has(m.to)) { d.set(m.to, d.get(m.from)); degisti = true; }
      if (d.has(m.to) && !d.has(m.from)) { d.set(m.from, d.get(m.to)); degisti = true; }
    }
    for (const e of [...(g.veri.edges || []), ...(g.veri.motherEdges || [])]) {
      if (d.has(e.from) && !d.has(e.to)) { d.set(e.to, d.get(e.from) + 1); degisti = true; }
      if (d.has(e.to) && !d.has(e.from)) { d.set(e.from, d.get(e.to) - 1); degisti = true; }
    }
    if (!degisti) break;
  }
  return d;
}

// Doğum yılı: profil bilgisinde "dogum" (örn. "1938" ya da "12.03.1938")
export function dogumYili(n) {
  const m = /(\d{4})/.exec(String(n?.profile?.info?.dogum || ''));
  return m ? Number(m[1]) : null;
}

// ============================ SICAK ANLATIM ============================
// Akrabalık yolunu "A → B → C" listesi yerine aile büyüğünün anlatacağı gibi anlatır.
// Yol kartı, yerel yanıt ve asistan aynı metni kullanır.

// ---- Türkçe ekler (kesme işaretiyle): Emine'nin, Hamit'in, Aslan'ın, Fahri'ye, Hamit'ten ----
const UNLU = 'aeıioöuü';
const kucuk = (s) => String(s || '').toLocaleLowerCase('tr');
function sonUnlu(ad) { const k = kucuk(ad); for (let i = k.length - 1; i >= 0; i--) if (UNLU.includes(k[i])) return k[i]; return 'e'; }
const unluyleBiter = (ad) => UNLU.includes(kucuk(ad).slice(-1));
const DORTLU = { a: 'ı', ı: 'ı', e: 'i', i: 'i', o: 'u', u: 'u', ö: 'ü', ü: 'ü' };
const kalin = (ad) => 'aıou'.includes(sonUnlu(ad));
export const ilgiEki = (ad) => `${ad}'${unluyleBiter(ad) ? 'n' : ''}${DORTLU[sonUnlu(ad)]}n`;
export const yonelmeEki = (ad) => `${ad}'${unluyleBiter(ad) ? 'y' : ''}${kalin(ad) ? 'a' : 'e'}`;
export const ayrilmaEki = (ad) => `${ad}'${'fstkçşhp'.includes(kucuk(ad).slice(-1)) ? 't' : 'd'}${kalin(ad) ? 'a' : 'e'}n`;
// "Ali, Osman ve Asım"
const de = (ad) => (kalin(ad) ? 'da' : 'de');   // "Fahri Kaan da", "Emine de"
const liste = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} ve ${a[a.length - 1]}`);

// Kişiden yukarı, verilen ataya giden ebeveyn zinciri: [kisi, ebeveyn, ..., ata]
function ataZinciri(g, kisi, ata) {
  const onceki = new Map([[kisi, null]]); const q = [kisi];
  while (q.length) {
    const c = q.shift();
    if (c === ata) { const z = []; let p = c; while (p !== null) { z.push(p); p = onceki.get(p); } return z.reverse(); }
    for (const p of (g.PARENTS.get(c) || [])) if (!onceki.has(p)) { onceki.set(p, c); q.push(p); }
  }
  return null;
}

// k kuşak yukarıdaki ata için akrabalık sözcüğü (torunun gözünden)
export function ataTerimi(kadin, k) {
  if (k === 1) return kadin ? 'annesi' : 'babası';
  if (k === 2) return kadin ? 'ninesi' : 'dedesi';
  if (k === 3) return kadin ? 'büyük ninesi' : 'büyük dedesi';
  return `${k} kuşak yukarıdaki ${kadin ? 'ninesi' : 'dedesi'}`;
}
const torunTerimi = (kadin, k) => (k === 1 ? (kadin ? 'kızı' : 'oğlu') : k === 2 ? 'torunu' : `${k} kuşak sonraki torunu`);

export function akrabalikAnlatisi(g, aId, bId) {
  const yalin = (id) => adiGoster(g.byId[id]?.name) || '?';
  const kadin = (id) => g.byId[id]?.sex === 'K';
  // Adaşlar ("Yüksel ile Yüksel") karışmasın: ikisini de baba/anne adıyla niteler
  const nitelik = new Map();
  if (aId !== bId && yalin(aId) === yalin(bId)) {
    for (const id of [aId, bId]) {
      const P = [...(g.PARENTS.get(id) || [])].map((p) => g.byId[p]).filter(Boolean);
      const e = P.find((p) => p.sex !== 'K') || P[0];
      if (e) nitelik.set(id, `${adiGoster(e.name)} ${kadin(id) ? 'kızı' : 'oğlu'} ${yalin(id)}`);
    }
  }
  const ad = (id) => nitelik.get(id) || yalin(id);
  const A = ad(aId), B = ad(bId);
  if (aId === bId) return { baslik: 'Aynı kişi', ozet: `${A} kendisi.`, cumleler: [] };
  const y = yolBul(g, aId, bId);
  if (!y) return { baslik: 'Kayıtlı bağ yok', ozet: `${A} ile ${B} arasında ağaçta kayıtlı bir bağ bulamadım. Belki bir halka eksik — bilen bir büyüğümüze sormaya değer.`, cumleler: [] };
  const o = y.ata;
  const cumleler = [];
  let baslik, ozet;

  if (!o && y.adimlar.length === 1) {
    return { baslik: 'Eşler', ozet: `${B}, ${ilgiEki(A)} eşi.`, cumleler: [], yol: y.yol, ata: null, etiket: y.etiket };
  }
  if (!o) {
    // Kan bağı yok: evlilik üzerinden bağlılar. Adımları akan bir cümleye çevir.
    const parca = y.adimlar.map((s, i) => (i === 0 ? `${ilgiEki(ad(s.kimden))} ${s.iliski} ${ad(s.kime)}` : `onun ${s.iliski} ${ad(s.kime)}`));
    baslik = 'Evlilikle akraba';
    ozet = `Ağaçta ${A} ile ${B} arasında kayıtlı bir kan bağı yok; bağ evlilik üzerinden kuruluyor.`;
    cumleler.push(`${parca.join(', ')}.`);
    return { baslik, ozet, cumleler, yol: y.yol, ata: null, etiket: y.etiket };
  }

  const ataAd = ad(o.id);
  const zA = ataZinciri(g, aId, o.id) || [aId, o.id];
  const zB = ataZinciri(g, bId, o.id) || [bId, o.id];
  // atadan kişiye inen ara kuşaklar (ata ve kişi hariç)
  const ara = (z) => z.slice(1, -1).reverse().map(ad);
  // en az `min` ara kuşak varsa "Soy, X'ten A, B ve C üzerinden Y'ye iniyor." (tek ara kişi
  // zaten özette adıyla geçiyor; tekrar etmesin)
  const soyCumlesi = (z, kisi, min = 2) => {
    const a = ara(z);
    return a.length >= min ? `Soy, ${ayrilmaEki(ataAd)} ${liste(a)} üzerinden ${yonelmeEki(kisi)} iniyor.` : null;
  };

  if (o.da === 0 || o.db === 0) {
    // Doğrudan ata–torun hattı
    const [ata, torun, k, z] = o.da === 0 ? [aId, bId, o.db, zB] : [bId, aId, o.da, zA];
    baslik = k === 1 ? (kadin(ata) ? 'Anne ile evladı' : 'Baba ile evladı')
      : k === 2 ? (kadin(ata) ? 'Nine ile torunu' : 'Dede ile torunu') : 'Aynı soy hattı';
    ozet = `${ad(ata)}, ${ilgiEki(ad(torun))} ${ataTerimi(kadin(ata), k)}; ${ad(torun)} ${de(ad(torun))} onun ${torunTerimi(kadin(torun), k)}.`;
    const s = soyCumlesi(z, ad(torun), 1); if (s) cumleler.push(s);
  } else if (o.da === 1 && o.db === 1) {
    const ortak = [...(g.PARENTS.get(aId) || [])].filter((p) => (g.PARENTS.get(bId) || new Set()).has(p)).map(ad);
    baslik = 'Kardeş';
    ozet = `${A} ile ${B} kardeş — ikisi de ${ilgiEki(liste(ortak.length ? ortak : [ataAd]))} çocukları.`;
  } else if (o.da === 1 || o.db === 1) {
    // Amca/dayı/hala/teyze — yeğen (ya da daha uzak kuşaktan)
    const [buyuk, yegen, k, z] = o.da === 1 ? [aId, bId, o.db, zB] : [bId, aId, o.da, zA];
    const kardesi = z[z.length - 2];               // yeğenin, büyükle kardeş olan atası
    if (k === 2) {
      const yoldan = kadin(kardesi) ? 'annesi' : 'babası';
      const [terim, unvan] = kadin(kardesi) ? (kadin(buyuk) ? ['teyzesi', 'Teyze'] : ['dayısı', 'Dayı'])
        : (kadin(buyuk) ? ['halası', 'Hala'] : ['amcası', 'Amca']);
      baslik = `${unvan} ile yeğeni`;
      ozet = `${ad(buyuk)}, ${ilgiEki(ad(yegen))} ${terim}: ${ilgiEki(ad(yegen))} ${yoldan} ${ad(kardesi)} ile ${ad(buyuk)} kardeş, ikisi de ${ilgiEki(ataAd)} çocukları.`;
    } else {
      baslik = 'Büyük kuşaktan akraba';
      ozet = `${ad(buyuk)}, ${ilgiEki(ad(yegen))} ${ataTerimi(kadin(kardesi), k - 1)} ${ilgiEki(ad(kardesi))} kardeşi; ikisi de ${ilgiEki(ataAd)} çocukları.`;
    }
    const s = soyCumlesi(z, ad(yegen)); if (s) cumleler.push(s);
  } else {
    // Kuzenler: atanın iki çocuğundan inen iki dal
    const derece = Math.min(o.da, o.db) - 1, fark = Math.abs(o.da - o.db);
    const dalA = zA[zA.length - 2], dalB = zB[zB.length - 2];
    baslik = derece === 1 && !fark ? 'Kuzen' : 'Aynı kökün iki dalı';
    const terimA = o.da - 1 === 0 ? '' : `${ilgiEki(A)} ${ataTerimi(kadin(dalA), o.da - 1)} `;
    const terimB = o.db - 1 === 0 ? '' : `${ilgiEki(B)} ${ataTerimi(kadin(dalB), o.db - 1)} `;
    ozet = derece === 1 && !fark
      ? `${A} ile ${B} kuzen: ${terimA}${ad(dalA)} ile ${terimB}${ad(dalB)} kardeş, ikisi de ${ilgiEki(ataAd)} çocukları.`
      : `${A} ile ${B} aynı kökün iki dalı: ortak ataları ${ataAd}. ${terimA}${ad(dalA)} ile ${terimB}${ad(dalB)} kardeşmiş; dallar oradan ayrılıp bugüne uzanmış.`;
    const sA = soyCumlesi(zA, A), sB = soyCumlesi(zB, B);
    if (sA) cumleler.push(sA);
    if (sB) cumleler.push(sB);
    const genc = o.da > o.db ? A : B;
    if (derece > 1 || fark) cumleler.push(`Ölçüyle söylersek: ${derece}. dereceden kuzenler${fark ? `; ${genc} ${fark === 1 ? 'bir' : fark} kuşak daha genç` : ''}.`);
  }
  return { baslik, ozet, cumleler, yol: y.yol, ata: o, etiket: y.etiket };
}

// ============================ ÜÇ YÖNLÜ BİRLEŞTİRME ============================
// İki cihaz aynı anda düzenleyince (biri mobilde fotoğraf, öbürü bilgisayarda bilgi) ağaç bütün
// olarak kaydedildiği için son kaydeden öbürünün değişikliğini siliyordu. Kaydı sunucu reddedince
// (409) istemci şunu yapar: taban = son eşitlenen sunucu sürümü, yerel = kendi ekranı,
// sunucu = güncel sürüm. Yalnızca YEREL'de tabana göre DEĞİŞEN alanlar sunucunun üstüne işlenir;
// kişi alanları ve profil alanları (foto, bilgi, anılar…) ayrı ayrı birleşir.
// Boş değerler ("", {}, [], null) "yok" sayılır: bir cihazda varsayılan boş profil oluşması
// (photo:"") başka cihazdaki gerçek fotoğrafı silmesin.
const _bos = (x) => x === undefined || x === null || x === '' ||
  (Array.isArray(x) ? x.length === 0 : (typeof x === 'object' && Object.keys(x).every((k) => _bos(x[k]))));
const _j = (x) => JSON.stringify(_bos(x) ? null : x);
const _nesne = (x) => x && typeof x === 'object' && !Array.isArray(x);
// Değer düzeyinde üç yönlü birleştirme (her derinlikte)
function birlestirDeger(t, y, s) {
  if (_j(t) === _j(y)) return s;                 // yerelde değişmemiş → sunucununki
  if (_j(t) === _j(s)) return y;                 // sunucuda değişmemiş → yereldeki
  if (_nesne(y) && (_nesne(s) || s === undefined || s === null)) {
    const sonuc = { ...(s || {}) };
    for (const a of new Set([...Object.keys(y), ...Object.keys(_nesne(t) ? t : {})])) {
      const v = birlestirDeger(_nesne(t) ? t[a] : undefined, y[a], (s || {})[a]);
      if (v === undefined) delete sonuc[a]; else sonuc[a] = v;
    }
    return sonuc;
  }
  if (Array.isArray(y) && (Array.isArray(s) || _bos(s))) {
    // liste (anılar, galeri…): sunucudakiler + yerelde eklenenler − yerelde silinenler
    const tk = new Set((Array.isArray(t) ? t : []).map((e) => JSON.stringify(e)));
    const yk = new Set(y.map((e) => JSON.stringify(e)));
    const out = (Array.isArray(s) ? s : []).filter((e) => !(tk.has(JSON.stringify(e)) && !yk.has(JSON.stringify(e))));
    const ok = new Set(out.map((e) => JSON.stringify(e)));
    for (const e of y) { const k = JSON.stringify(e); if (!tk.has(k) && !ok.has(k)) out.push(e); }
    return out;
  }
  return _bos(y) && !_bos(s) ? s : y;            // iki tarafta da değişen tek değer: yerel kazanır (boşsa sunucu)
}
export function agacBirlestir(taban, yerel, sunucu) {
  taban = taban || {}; yerel = yerel || {}; sunucu = sunucu || {};
  const harita = (a) => new Map((a || []).map((n) => [n.id, n]));
  const T = harita(taban.nodes), Y = harita(yerel.nodes), S = harita(sunucu.nodes);
  const sonuc = new Map(S);
  for (const [id, n] of Y) {
    const t = T.get(id), sv = S.get(id);
    if (!sv) { if (!t || _j(t) !== _j(n)) sonuc.set(id, n); }   // sunucuda yok: yeni ya da yerelde düzenlenmiş
    else sonuc.set(id, birlestirDeger(t, n, sv));
  }
  for (const id of T.keys()) if (!Y.has(id)) sonuc.delete(id);   // yerelde silinen
  const nodes = [...S.keys()].filter((id) => sonuc.has(id)).map((id) => sonuc.get(id))
    .concat([...sonuc.keys()].filter((id) => !S.has(id)).map((id) => sonuc.get(id)));
  const bag = (ad) => {
    const k = (e) => `${e.from}|${e.to}`;
    const t = new Set((taban[ad] || []).map(k)), y = new Map((yerel[ad] || []).map((e) => [k(e), e]));
    const out = new Map((sunucu[ad] || []).map((e) => [k(e), e]));
    for (const [key, e] of y) if (!t.has(key)) out.set(key, e);
    for (const key of t) if (!y.has(key)) out.delete(key);
    return [...out.values()].filter((e) => sonuc.has(e.from) && sonuc.has(e.to));
  };
  const birlesik = { ...sunucu };
  for (const a of Object.keys(yerel)) {
    if (['nodes', 'edges', 'motherEdges', 'marriages'].includes(a)) continue;
    if (_j(yerel[a]) !== _j(taban[a])) birlesik[a] = yerel[a];
  }
  birlesik.nodes = nodes;
  for (const ad of ['edges', 'motherEdges', 'marriages']) if (yerel[ad] || sunucu[ad]) birlesik[ad] = bag(ad);
  return birlesik;
}

// Ad karşılaştırma anahtarı: harf/aksan duyarsız, SIRA NUMARASI KORUNUR. Ağaçta aynı adlı kardeşler
// sonlarına sayı alarak ayrılır ("Hasan1", "Hasan2"; ekranda ikisi de "Hasan") — eskiden küçük yaşta
// ölen çocuğun adının sonraki kardeşe verilmesi yaygındı. Sayıyla ayrılmış adlar FARKLI sayılır.
const adAnahtari = (s) => String(s || '').replace('★', '').toLocaleLowerCase('tr').replace(/[’'`]/g, ' ')
  .replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');

// ---- AYNI KİŞİNİN İKİ KAYDINI BİRLEŞTİR (yönetici) ----
// Örn. "Nevin Kaya" (Celal Kaya kızı) ve "Nevin Arslan (Kaya)" (Fahri Kaan'ın annesi) aynı kişi.
// `silId`'nin bütün bağları (baba/anne/evlilik) `tutId`'ye taşınır, profil birleşir
// (tutulanın dolu alanı kalır, boşsa silinenin değeri gelir; galeri/anılar toplanır),
// başkalarının eş yazıları ve kin bağları güncellenir, silinen kayıt kalkar.
// Tekrarlanan bağ ve kişinin kendisine bağı oluşmaz. Girdi değişmez.
export function kisiBirlestir(veri0, tutId, silId) {
  if (!tutId || !silId || tutId === silId) throw new Error('İki farklı kişi seç');
  const veri = JSON.parse(JSON.stringify(veri0));
  const tut = (veri.nodes || []).find((n) => n.id === tutId), sil = (veri.nodes || []).find((n) => n.id === silId);
  if (!tut || !sil) throw new Error('Kişi bulunamadı');
  if ((tut.sex || '') !== (sil.sex || '')) throw new Error('Farklı cinsiyetteki iki kayıt aynı kişi olamaz');
  const ad = (s) => String(s || '').replace(' (aileden)', '').trim();
  const tasi = (liste, tur) => {
    const gor = new Set(), out = [];
    for (const e of liste || []) {
      const x = { ...e, from: e.from === silId ? tutId : e.from, to: e.to === silId ? tutId : e.to };
      if (x.from === x.to) continue;
      // evlilik yönsüz; ağaç/anne bağında çocuğun tek babası/annesi olur
      const k = tur === 'es' ? [x.from, x.to].sort().join('|') : `${x.from}>${x.to}`;
      if (gor.has(k)) continue; gor.add(k); out.push(x);
    }
    if (tur !== 'es') {   // aynı çocuğa iki farklı baba/anne düşerse: tutulanın bağı kalır
      const cocuk = new Map();
      for (const e of out) { const v = cocuk.get(e.to); if (!v || e.from === tutId) cocuk.set(e.to, e); }
      return out.filter((e) => cocuk.get(e.to) === e);
    }
    return out;
  };
  veri.edges = tasi(veri.edges, 'baba');
  veri.motherEdges = tasi(veri.motherEdges, 'anne');
  veri.marriages = tasi(veri.marriages, 'es');
  // profil: tutulan esas, boş alanlar silinenden; liste alanları birleşir
  const pt = tut.profile || {}, ps = sil.profile || {};
  const liste = (a, b) => { const out = [...(a || [])]; const k = new Set(out.map((x) => JSON.stringify(x)));
    for (const x of b || []) if (!k.has(JSON.stringify(x))) out.push(x); return out; };
  const p = { ...ps, ...Object.fromEntries(Object.entries(pt).filter(([, v]) => v !== '' && v != null)) };
  p.info = { ...(ps.info || {}), ...Object.fromEntries(Object.entries(pt.info || {}).filter(([, v]) => v !== '' && v != null)) };
  for (const a of ['gallery', 'memories']) if (pt[a] || ps[a]) p[a] = liste(pt[a], ps[a]);
  if (Object.keys(p).length) tut.profile = p;
  for (const a of ['fatherExt', 'tel', 'mother']) if (!tut[a] && sil[a]) tut[a] = sil[a] === tutId ? null : sil[a];
  if (sil.alive === false) tut.alive = false;
  // eş yazıları: tek bir listede, adı tekrarsız
  const esler = []; for (const s of [...(tut.spouse || []), ...(sil.spouse || [])]) if (!esler.some((x) => ad(x) === ad(s))) esler.push(s);
  tut.spouse = esler;
  if (!tut.kin && sil.kin && sil.kin !== tutId) tut.kin = sil.kin;
  veri.nodes = veri.nodes.filter((n) => n.id !== silId);
  for (const n of veri.nodes) {
    if (n.kin === silId) n.kin = tutId;
    if (n.mother === silId) n.mother = tutId;
    if (Array.isArray(n.spouse)) {
      const yeni = [];
      for (const s of n.spouse) {
        const x = ad(s) === ad(sil.name) ? s.replace(ad(sil.name), ad(tut.name)) : s;
        if (!yeni.some((y) => ad(y) === ad(x))) yeni.push(x);
      }
      n.spouse = yeni;
    }
  }
  return { veri, tut: tutId, silinen: silId };
}

// Aynı kişi olabilecek kayıtlar: adı (soyad/parantez hariç ilk ad) aynı, farklı id.
// Yöneticiye "birleştir" önerisi için; karar her zaman yöneticinin.
// Babaları farklı olan adaşlar (ağaçta çok sayıda Mehmet, Fahri…) önerilmez: en az birinin babası
// bilinmiyorsa (eşle ya da ayrı eklenmiş) ya da babaları aynıysa önerilir.
export function olasiKopyalar(veri, id) {
  const ilk = (s) => adAnahtari(s).split(' ')[0];
  const baba = new Map((veri.edges || []).map((e) => [e.to, e.from]));
  const n = (veri.nodes || []).find((x) => x.id === id); if (!n) return [];
  return (veri.nodes || []).filter((x) => x.id !== id && x.sex === n.sex && ilk(x.name) === ilk(n.name)
    && (!baba.get(x.id) || !baba.get(n.id) || baba.get(x.id) === baba.get(n.id))
    && baba.get(x.id) !== n.id && baba.get(n.id) !== x.id);
}

// ---- KURAL: anne-babası aynı iki kişi aynı adı taşıyamaz ----
// Aynı baba (edges) ve aynı anne (motherEdges) altında aynı adlı, aynı cinsiyette iki kardeş = aynı
// kişinin iki kaydı. Anahtar: baba|anne|cinsiyet|ad (ad: soyad ve sıra numarası dahil, harf/aksan duyarsız).
// Anne-babası hiç bilinmeyenler ve "Yeni kişi" taslağı kural dışı. Ad anahtarı: adAnahtari (sıra no korunur).
const TASLAK_AD = 'yeni kisi';
export function ayniAdliKardesler(veri) {
  const baba = new Map((veri.edges || []).map((e) => [e.to, e.from]));
  const anne = new Map((veri.motherEdges || []).map((e) => [e.to, e.from]));
  const gruplar = new Map();
  for (const n of veri.nodes || []) {
    const b = baba.get(n.id) || '', a = anne.get(n.id) || '', ad = adAnahtari(n.name);
    if ((!b && !a) || !ad || ad === TASLAK_AD) continue;
    const k = `${b}|${a}|${n.sex || ''}|${ad}`;   // kız ve oğlan aynı adı taşısa da ayrı kişidir
    if (!gruplar.has(k)) gruplar.set(k, []);
    gruplar.get(k).push(n);
  }
  return [...gruplar.entries()].filter(([, l]) => l.length > 1)
    .map(([anahtar, l]) => ({ anahtar, ad: adiGoster(l[0].name), ids: l.map((n) => n.id) }));
}
// Yeni veride, eskisinde OLMAYAN kural ihlalleri (eski verideki mevcut kopyalar kaydı engellemez;
// yönetici onları "Birleştir" ile temizler).
export function yeniKardesIhlali(eski, yeni) {
  const once = new Set(ayniAdliKardesler(eski || { nodes: [] }).map((x) => x.anahtar + '#' + x.ids.length));
  return ayniAdliKardesler(yeni).filter((x) => !once.has(x.anahtar + '#' + x.ids.length));
}
export const kardesIhlaliMetni = (l) =>
  `Anne-babası aynı iki kişi aynı adı taşıyamaz: ${l.map((x) => `“${x.ad}”`).join(', ')}. Aynı kişiyse kayıtları birleştir; farklı kişilerse adın sonuna sıra numarası ekle (ör. ${l[0].ad}2 — ekranda yine “${l[0].ad}” görünür).`;

// ---- ÇİFT KAYIT TARAMASI (yönetici "Çift kayıtlar" ekranı) ----
// Aynı kişinin iki kaydı olabilecek çiftler, güçlüden zayıfa:
//   kural   → anne-babası aynı, adı aynı (ayniAdliKardesler) — ya birleştirilmeli ya sıra no almalı
//   tam-ad  → ad + soyad sözcükleri biri ötekinde tümüyle geçiyor ("Nevin Kaya" ⊂ "Nevin Arslan (Kaya)"),
//             aynı cinsiyet, babaları çelişmiyor (biri bilinmiyor ya da aynı)
// Tek sözcüklü adaşlar (çok sayıda Mehmet, Ali) önerilmez; karar her zaman yöneticinin.
export function ciftKayitlar(veri) {
  const by = Object.fromEntries((veri.nodes || []).map((n) => [n.id, n]));
  const baba = new Map((veri.edges || []).map((e) => [e.to, e.from]));
  const gor = new Set(), out = [];
  const ekle = (a, b, neden) => { const k = [a, b].sort().join('|'); if (gor.has(k) || a === b) return; gor.add(k); out.push({ ids: [a, b], neden }); };
  for (const g of ayniAdliKardesler(veri)) for (let i = 1; i < g.ids.length; i++) ekle(g.ids[0], g.ids[i], 'kural');
  const sozcuk = (n) => adAnahtari(n.name).replace(/\d+/g, '').split(' ').filter(Boolean);
  const l = (veri.nodes || []).filter((n) => sozcuk(n).length >= 2);
  for (const a of l) for (const b of veri.nodes || []) {
    if (a.id === b.id || a.sex !== b.sex) continue;
    const sa = sozcuk(a), sb = sozcuk(b);
    if (sa[0] !== sb[0] || !sa.every((w) => sb.includes(w))) continue;
    const ba = baba.get(a.id), bb = baba.get(b.id);
    if (ba && bb && ba !== bb) continue;
    if (ba === b.id || bb === a.id) continue;
    ekle(a.id, b.id, 'tam-ad');
  }
  return out.map((c) => ({ ...c, adlar: c.ids.map((i) => by[i] && by[i].name) }));
}
