// Ağaca saf (DB'siz) yazma işlemleri — api/agac.js bunları sunucuda uygular.
//  · kayitEkle: ağaçta olmayan aile üyesi kendini MEVCUT bir kişiye bağlayarak ekler
//    (çocuğu / eşi / kardeşi). Bağsız kayıt yok: "alakasız biri kayıt yaptıramamalı".
//  · medyaEkle: aile üyesinin yüklediği profil fotoğrafı / galeri öğesi onaysız işlenir.
// Girdi veri DEĞİŞMEZ; kopya döner. Hata: {kod, hata, var?} fırlatılır.
// Ayrıntı: docs/giris.md → "Kayıt", docs/medya.md → "Onaysız kayıt".
import { KAYIT } from './ayar.js';
import { medyaAnahtariGecerli } from '../medya.js';

const hata = (kod, mesaj, ek = {}) => Object.assign(new Error(mesaj), { kod, hata: mesaj, ...ek });
const kopya = (v) => JSON.parse(JSON.stringify(v));
const katla = (s) => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ı/g, 'i').replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
const ilkAd = (s) => katla(s).split(' ')[0] || '';

function yeniId(veri) {
  const var_ = new Set((veri.nodes || []).map((n) => n.id));
  let i = 1; while (var_.has('n' + i)) i++;
  return 'n' + i;
}
// Kişinin anne-babası: baba = edges (from → to), anne = motherEdges (from = anne)
function ebeveynler(veri, id) {
  return {
    baba: (veri.edges || []).find((e) => e.to === id)?.from || null,
    anne: (veri.motherEdges || []).find((e) => e.to === id)?.from || null,
  };
}
const esleri = (veri, id) => (veri.marriages || []).flatMap((m) => m.from === id ? [m.to] : m.to === id ? [m.from] : []);

export function kayitDogrula(g) {
  const ad = String(g.ad || '').replace(/\s+/g, ' ').trim();
  const soyad = String(g.soyad || '').replace(/\s+/g, ' ').trim();
  const tam = soyad ? `${ad} ${soyad}` : ad;
  if (ad.length < KAYIT.adMin || tam.length > KAYIT.adMax || !/^[\p{L}][\p{L} .'-]*$/u.test(tam))
    throw hata(400, 'Adını harflerle yaz');
  if (!['E', 'K'].includes(g.cinsiyet)) throw hata(400, 'Cinsiyet seç');
  if (!KAYIT.iliskiler.includes(g.iliski)) throw hata(400, 'Ağaçtaki kişiyle bağını seç');
  if (!g.bag) throw hata(400, 'Ağaçtan bağlı olduğun kişiyi seç');
  let dogum = null;
  if (g.dogum) {
    dogum = Number(g.dogum);
    if (!Number.isInteger(dogum) || dogum < KAYIT.dogumMin || dogum > new Date().getFullYear()) throw hata(400, 'Doğum yılı geçersiz');
  }
  return { ad: tam, cinsiyet: g.cinsiyet, iliski: g.iliski, bag: String(g.bag), dogum };
}

// Aynı bağla aynı adda biri zaten varsa yeni kişi açma: "zaten ağaçtasın" (çift kayıt olmasın)
function mevcutAyni(veri, adayIdler, ad) {
  const a = ilkAd(ad);
  return (veri.nodes || []).find((n) => adayIdler.includes(n.id) && ilkAd(n.name) === a) || null;
}

export function kayitEkle(veri0, girdi, zaman = new Date().toISOString()) {
  const k = kayitDogrula(girdi);
  const veri = kopya(veri0);
  for (const a of ['nodes', 'edges', 'marriages', 'motherEdges']) veri[a] = veri[a] || [];
  const byId = Object.fromEntries(veri.nodes.map((n) => [n.id, n]));
  const bag = byId[k.bag];
  if (!bag) throw hata(404, 'Seçtiğin kişi ağaçta bulunamadı');

  const id = yeniId(veri);
  const nn = { id, name: k.ad, sex: k.cinsiyet, alive: true, spine: false, you: false, spouse: [],
    kayit: { zaman, bag: bag.id, iliski: k.iliski } };
  if (k.dogum) nn.profile = { info: { dogum: String(k.dogum) } };

  if (k.iliski === 'cocuk') {
    // Baba ağaç bağıdır (edges), anne anne-bağıdır (motherEdges). Bağlanan kadınsa ve ağaçta
    // tek bir eşi varsa çocuk o eşin de çocuğu olur (soy hattı kopmasın).
    const cocuklar = [...veri.edges.filter((e) => e.from === bag.id), ...veri.motherEdges.filter((e) => e.from === bag.id)].map((e) => e.to);
    const v = mevcutAyni(veri, cocuklar, k.ad);
    if (v) throw hata(409, `${v.name} zaten ${bag.name} kişisinin çocuğu olarak ağaçta — listeden kendini seç`, { var: v.id });
    if (bag.sex === 'K') {
      veri.motherEdges.push({ from: bag.id, to: id, type: 'mother' });
      const es = esleri(veri, bag.id).map((x) => byId[x]).filter((x) => x && x.sex !== 'K');
      if (es.length === 1) veri.edges.push({ from: es[0].id, to: id });
    } else {
      veri.edges.push({ from: bag.id, to: id });
      const es = esleri(veri, bag.id).map((x) => byId[x]).filter((x) => x && x.sex === 'K');
      if (es.length === 1) veri.motherEdges.push({ from: es[0].id, to: id, type: 'mother' });
    }
  } else if (k.iliski === 'kardes') {
    const { baba, anne } = ebeveynler(veri, bag.id);
    if (!baba && !anne) throw hata(400, `${bag.name} kişisinin anne-babası ağaçta yok — çocuğu ya da eşi olarak bağlan`);
    const kardesler = [...veri.edges.filter((e) => baba && e.from === baba), ...veri.motherEdges.filter((e) => anne && e.from === anne)].map((e) => e.to);
    const v = mevcutAyni(veri, kardesler, k.ad);
    if (v) throw hata(409, `${v.name} zaten ${bag.name} kişisinin kardeşi olarak ağaçta — listeden kendini seç`, { var: v.id });
    if (baba) veri.edges.push({ from: baba, to: id });
    if (anne) veri.motherEdges.push({ from: anne, to: id, type: 'mother' });
  } else {
    const v = mevcutAyni(veri, esleri(veri, bag.id), k.ad);
    if (v) throw hata(409, `${v.name} zaten ${bag.name} kişisinin eşi olarak ağaçta — listeden kendini seç`, { var: v.id });
    // Aynı TAM adla (ad + soyad) ağaçta biri zaten varsa — ör. "Nevin Kaya" babasının kızı olarak
    // ekli, "Nevin Arslan (Kaya)" da yazılabilir — ikinci kayıt AÇILMAZ: evlilik o kişiye bağlanır.
    // (Aynı kişinin iki kaydı böyle oluşuyordu.) O kişi başka biriyle evliyse karar kullanıcıda: 409.
    const sozcuk = katla(k.ad).replace(/[()]/g, ' ').split(' ').filter(Boolean);
    const ayni = sozcuk.length > 1 && veri.nodes.find((n) => n.id !== bag.id && n.sex === k.cinsiyet &&
      sozcuk.every((w) => katla(n.name).replace(/[()]/g, ' ').split(' ').includes(w)));
    if (ayni) {
      if (esleri(veri, ayni.id).length) throw hata(409, `Ağaçta ${ayni.name} zaten var (başka bir eşle) — bu sen misin?`, { var: ayni.id });
      veri.marriages.push({ from: bag.id, to: ayni.id, type: 'marriage' });
      ayni.kin = ayni.kin || bag.id;
      ayni.spouse = [...(ayni.spouse || []).filter((x) => ilkAd(x) !== ilkAd(bag.name)), `${bag.name} (aileden)`];
      bag.spouse = bag.spouse || [];
      const j = bag.spouse.findIndex((x) => ilkAd(String(x).replace(' (aileden)', '')) === ilkAd(k.ad));
      if (j >= 0) bag.spouse[j] = `${ayni.name} (aileden)`; else bag.spouse.push(`${ayni.name} (aileden)`);
      if (!bag.kin) bag.kin = ayni.id;
      return { veri, id: ayni.id, kisi: ayni, baglandi: true };
    }
    veri.marriages.push({ from: bag.id, to: id, type: 'marriage' });
    nn.kin = bag.id; nn.spouse = [`${bag.name} (aileden)`];
    // Eş daha önce yalnız ad olarak yazılmışsa ("Nevin Kaya") o kayıt artık bu kişidir
    bag.spouse = bag.spouse || [];
    const i = bag.spouse.findIndex((s) => ilkAd(String(s).replace(' (aileden)', '')) === ilkAd(k.ad));
    if (i >= 0) bag.spouse[i] = `${k.ad} (aileden)`; else bag.spouse.push(`${k.ad} (aileden)`);
    if (!bag.kin) bag.kin = id;
  }
  veri.nodes.push(nn);
  return { veri, id, kisi: nn };
}

// Yalnız kendi deposundaki medya bağlantısı kabul edilir: /api/medya?adim=oku&anahtar=…
export function medyaUrlGecerli(url) {
  const m = /^\/api\/medya\?adim=oku&anahtar=([^&]+)$/.exec(String(url || ''));
  return !!m && medyaAnahtariGecerli(decodeURIComponent(m[1]));
}

export function medyaEkle(veri0, kisiId, alan, url, video = false) {
  if (!['photo', 'gallery'].includes(alan)) throw hata(400, 'Geçersiz alan');
  if (!medyaUrlGecerli(url)) throw hata(400, 'Geçersiz medya bağlantısı');
  const veri = kopya(veri0);
  const n = (veri.nodes || []).find((x) => x.id === kisiId);
  if (!n) throw hata(404, 'Kişi ağaçta bulunamadı');
  n.profile = n.profile || {};
  if (alan === 'photo') n.profile.photo = url;
  else {
    n.profile.gallery = n.profile.gallery || [];
    if (!n.profile.gallery.some((g) => (g && g.url ? g.url : g) === url)) n.profile.gallery.push(video ? { url, video: true } : url);
  }
  return { veri, profil: n.profile };
}
