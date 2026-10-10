// ÖNERİ KATMANI — onay kuyruğuna (oneri tablosu) yazmanın tek yolu.
// Kural: model ve sunucu tarafı akışlar AĞACA DOĞRUDAN YAZMAZ. Değişiklik bir "yama"
// (islem listesi) olarak öneriye düşer; yönetici onaylayınca yama O ANKİ ağaca uygulanır
// (tam-ağaç anlık görüntüsü gibi araya giren onayları ezmez).
import { db, agacOku } from './db.js';
import { adiGoster, grafKur } from './agac.js';

// İki ağaç arasındaki fark (özet + detay) — /api/oneri ile ortak
export function farkCikar(eski, yeni) {
  const em = new Map((eski.nodes || []).map((n) => [n.id, n]));
  const ym = new Map((yeni.nodes || []).map((n) => [n.id, n]));
  const eklenen = [], silinen = [], degisen = [];
  for (const [id, n] of ym) if (!em.has(id)) eklenen.push(n.name || id);
  for (const [id, n] of em) if (!ym.has(id)) silinen.push(n.name || id);
  for (const [id, n] of ym) { const o = em.get(id); if (o && JSON.stringify(o) !== JSON.stringify(n)) degisen.push(n.name || id); }
  return { eklenen, silinen, degisen };
}
export function ozetle(fark) {
  const p = [];
  const k = (l) => `${l.slice(0, 3).join(', ')}${l.length > 3 ? '…' : ''}`;
  if (fark.eklenen.length) p.push(`${fark.eklenen.length} yeni kişi (${k(fark.eklenen)})`);
  if (fark.degisen.length) p.push(`${fark.degisen.length} düzenleme (${k(fark.degisen)})`);
  if (fark.silinen.length) p.push(`${fark.silinen.length} silme (${k(fark.silinen)})`);
  return p.join(' · ') || 'değişiklik';
}

const ILISKILER = ['cocugu', 'esi', 'kardesi', 'babasi', 'annesi'];
const ALANLAR = { ad: 'name', cinsiyet: 'sex', yasiyor: 'alive', meslek: 'job', egitim: 'education', medeni: 'marital' };

class YamaHatasi extends Error {}

function yeniId(byId) { let i = 1; while (byId['n' + i]) i++; return 'n' + i; }

// Yamayı ağaca uygula → YENİ ağaç (girdi değişmez). Hata → YamaHatasi.
export function yamaUygula(veri, islemler) {
  const v = structuredClone(veri);
  v.nodes ||= []; v.edges ||= []; v.motherEdges ||= []; v.marriages ||= [];
  const byId = () => Object.fromEntries(v.nodes.map((n) => [n.id, n]));
  const refler = {};
  const coz = (id) => refler[id] || id;
  const kisi = (id, ad) => {
    const n = byId()[coz(id)];
    if (!n) throw new YamaHatasi(`${ad || 'kişi'} bulunamadı (${id})`);
    return n;
  };
  const babaKenari = (id) => v.edges.find((e) => e.to === id);
  const anneKenari = (id) => v.motherEdges.find((e) => e.to === id);

  // "yeni, hedefin <iliski>'si" bağını kur
  function bagla(yeni, hedef, iliski) {
    switch (iliski) {
      case 'cocugu':
        if (hedef.sex === 'K') {
          if (anneKenari(yeni.id)) throw new YamaHatasi(`${adiGoster(yeni.name)} zaten bir anneye bağlı`);
          v.motherEdges.push({ from: hedef.id, to: yeni.id, type: 'mother' }); yeni.mother = hedef.id;
        } else {
          if (babaKenari(yeni.id)) throw new YamaHatasi(`${adiGoster(yeni.name)} zaten bir babaya bağlı`);
          v.edges.push({ from: hedef.id, to: yeni.id }); yeni.parentRole = 'baba';
        }
        break;
      case 'babasi':
        if (babaKenari(hedef.id)) throw new YamaHatasi(`${adiGoster(hedef.name)} zaten bir babaya bağlı`);
        v.edges.push({ from: yeni.id, to: hedef.id }); hedef.parentRole = 'baba'; delete hedef.fatherExt;
        break;
      case 'annesi':
        if (anneKenari(hedef.id)) throw new YamaHatasi(`${adiGoster(hedef.name)} zaten bir anneye bağlı`);
        v.motherEdges.push({ from: yeni.id, to: hedef.id, type: 'mother' }); hedef.mother = yeni.id;
        break;
      case 'kardesi': {
        const b = babaKenari(hedef.id), a = anneKenari(hedef.id);
        if (!b && !a) throw new YamaHatasi(`${adiGoster(hedef.name)} için ebeveyn kayıtlı değil — kardeş ancak ortak ebeveyne bağlanır`);
        if (b && !babaKenari(yeni.id)) { v.edges.push({ from: b.from, to: yeni.id }); yeni.parentRole = 'baba'; }
        if (a && !anneKenari(yeni.id)) { v.motherEdges.push({ from: a.from, to: yeni.id, type: 'mother' }); yeni.mother = a.from; }
        break;
      }
      case 'esi':
        if (v.marriages.some((m) => (m.from === hedef.id && m.to === yeni.id) || (m.to === hedef.id && m.from === yeni.id))) break;
        v.marriages.push({ from: hedef.id, to: yeni.id, type: 'marriage' });
        yeni.kin ||= hedef.id; hedef.kin ||= yeni.id;
        for (const [a, b] of [[hedef, yeni], [yeni, hedef]]) {
          a.spouse ||= [];
          const ad = adiGoster(b.name);
          const i = a.spouse.findIndex((s) => adiGoster(String(s).replace(' (aileden)', '')) === ad);
          if (i >= 0) a.spouse[i] = `${ad} (aileden)`; else a.spouse.push(`${ad} (aileden)`);
        }
        break;
      default: throw new YamaHatasi(`bilinmeyen ilişki: ${iliski}`);
    }
  }

  for (const op of islemler || []) {
    if (op.tur === 'kisi_ekle') {
      const ad = String(op.ad || '').trim().slice(0, 80);
      if (!ad) throw new YamaHatasi('kişi adı boş');
      if (!ILISKILER.includes(op.iliski)) throw new YamaHatasi(`ilişki şunlardan biri olmalı: ${ILISKILER.join(', ')}`);
      const hedef = kisi(op.hedef_id, 'hedef kişi');
      const n = { id: yeniId(byId()), name: ad, sex: op.cinsiyet === 'K' ? 'K' : 'E', alive: op.yasiyor !== false,
        spine: false, you: false, spouse: [], kin: null, mother: null, parentRole: 'baba', fatherExt: null };
      v.nodes.push(n);
      if (op.ref) refler[op.ref] = n.id;
      bagla(n, hedef, op.iliski);
    } else if (op.tur === 'iliski_ekle') {
      if (!ILISKILER.includes(op.iliski)) throw new YamaHatasi(`ilişki şunlardan biri olmalı: ${ILISKILER.join(', ')}`);
      const a = kisi(op.kisi_id), b = kisi(op.hedef_id, 'hedef kişi');
      if (a.id === b.id) throw new YamaHatasi('kişi kendisiyle ilişkilendirilemez');
      bagla(a, b, op.iliski);
    } else if (op.tur === 'bilgi_duzelt') {
      const n = kisi(op.kisi_id);
      const alan = ALANLAR[op.alan];
      if (!alan) throw new YamaHatasi(`düzeltilebilir alanlar: ${Object.keys(ALANLAR).join(', ')}`);
      if (alan === 'name') n.name = String(op.deger || '').trim().slice(0, 80) || n.name;
      else if (alan === 'sex') n.sex = op.deger === 'K' || /kad/i.test(op.deger) ? 'K' : 'E';
      else if (alan === 'alive') n.alive = !(op.deger === false || /vefat|ölü|hayır|false/i.test(String(op.deger)));
      else {
        n.profile ||= { contact: {}, info: {}, social: {}, photo: '', gallery: [], memories: [] };
        n.profile.info ||= {};
        n.profile.info[alan] = String(op.deger || '').slice(0, 120);
      }
    } else if (op.tur === 'ani_ekle') {
      const n = kisi(op.kisi_id);
      n.profile ||= { contact: {}, info: {}, social: {}, photo: '', gallery: [], memories: [] };
      n.profile.memories ||= [];
      n.profile.memories.unshift(op.ani);
    } else {
      throw new YamaHatasi(`bilinmeyen işlem: ${op.tur}`);
    }
  }
  return v;
}

export function yamaHatasiMi(e) { return e instanceof YamaHatasi; }

// İnsan okunur tek satır (yönetici onay kutusunda görünür)
export function yamaOzeti(veri, islemler) {
  const g = grafKur(veri);
  const ad = (id) => adiGoster(g.byId[id]?.name) || id;
  const IL = { cocugu: 'çocuğu', esi: 'eşi', kardesi: 'kardeşi', babasi: 'babası', annesi: 'annesi' };
  return (islemler || []).map((op) => {
    if (op.tur === 'kisi_ekle') return `+ ${op.ad} (${ad(op.hedef_id)}'in ${IL[op.iliski]})`;
    if (op.tur === 'iliski_ekle') return `↔ ${ad(op.kisi_id)} = ${ad(op.hedef_id)}'in ${IL[op.iliski]}`;
    if (op.tur === 'bilgi_duzelt') return `✎ ${ad(op.kisi_id)}: ${op.alan} → ${op.deger}`;
    if (op.tur === 'ani_ekle') return `❝ ${ad(op.kisi_id)} için anı${op.ani?.baslik ? `: ${op.ani.baslik}` : ''}`;
    return op.tur;
  }).join(' · ');
}

// Öneriyi kuyruğa ekle. Yama şimdiki ağaçta denenir (geçersizse burada reddedilir).
export async function oneriEkle({ kisiId, gonderenAd, islemler, kaynak }) {
  const sql = db();
  const cur = await agacOku();
  const yeni = yamaUygula(cur, islemler);
  const fark = farkCikar(cur, yeni);
  const ozet = (yamaOzeti(cur, islemler) || ozetle(fark)).slice(0, 500);
  const r = await sql`
    insert into oneri (durum, gonderen_id, gonderen_ad, telefon, ozet, veri, fark, islem, kaynak, kisi_id)
    values ('bekliyor', ${kaynak}, ${String(gonderenAd || '').slice(0, 80)}, ${null},
            ${ozet}, ${JSON.stringify(yeni)}::jsonb, ${JSON.stringify(fark)}::jsonb,
            ${JSON.stringify(islemler)}::jsonb, ${kaynak}, ${kisiId || null})
    returning id`;
  return { id: Number(r[0].id), ozet, fark };
}
