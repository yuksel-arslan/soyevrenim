// ÜRETİLMİŞ DOSYA — düzenleme. Kaynak: api/_lib/adlar.js (npm run build)
// TÜRKÇE AD → CİNSİYET sözlüğü (veri denetimi: "cinsiyeti yanlış girilmiş olabilir").
// Yalnız İPUCU verir; karar her zaman insanda. Hem kadın hem erkek adı olarak yaygın olanlar
// (UNISEX) hiç işaretlenmez. Ağaçta geçen adlar ve yaygın adlar; eksik ad sorun değil (sessiz kalır).
// public/lib/adlar.js bu dosyanın kopyasıdır (npm run build).

const liste = (s) => new Set(s.trim().split(/\s+/).map((a) => a.toLocaleLowerCase('tr')));

export const KADIN = liste(`
  adviye asiye ayla aynur aysel aysen aysun ayşe ayten bahriye bedriye birsen burcu büşra canan cansu cemile cennet
  damla derya didem dilek döndü duygu dürdane ebru ece eda ela elif emel emine esin esma esra fadime fatma feride ferdane
  figen fikriye filiz firdevs furuzan gamze gizem gönül gülay gülen gülizar gülsüm gülşen gülten günsel hacer hale hamide
  hande hanife hatice hayriye hilal huriye hülya ilkay ilknur ipek kadriye kübra lale leman leyla lütfiye makbule melek
  meliha melike meryem merve muazzez müge müzeyyen naciye nalan nazire naziye nazlı necla necmiye nefise nehare neriman
  nermin nesibe nevin nevrestan nihal nilgün nimet nuray nursen nurten oya özge öznur pakize pınar rabia rahime raziye
  remziye reyhan rukiye saadet sabiha sabriye safiye sakine saniye sebiye seher selda selen selin selma semra serpil sevde
  sevgi sevim sibel sinem songül sonnur sulbiye suzan şaziye şehriban şerife şükriye şule tevhide tuba tuğba tülay tülin
  türkan ülkü ümran vesile yasemin yeliz zehra zekiye zeliha zeynep zübeyde zühre`);

export const ERKEK = liste(`
  abdurrahman adnan ahmet alaattin ali arif asım aslan aziz bahattin barat bekir behçet bilal burak can celal cem cemal
  cengiz cevdet çetin davut doğan ekrem emre enver erdal erol ertan fahrettin fahri faik fehmi fikret gökhan hakan halil
  haluk hamit hasan hayri hikmet hilmi hulusi hurşit hüseyin hüsnü ibrahim ihsan ilhan ilyas isa ismail ismet kaan kadir
  kamil kâzım kazım kemal kemalettin kenan kerim kudret levent lütfü mahmut mehmet memiş mesut metin muammer muhammet
  murat musa mustafa muzaffer nazım nazmi necati necmi nevzat niyazi nurettin nuri oktay orhan osman ömer rahmi rasim
  raşit ravi recai recep refik remzi rıfat rıza ruknettin rüknü sabri sadık salih sami selçuk selim serkan sezai sinan
  süleyman şaban şakir şemsettin şeref şerif şevket şükrü tahsin talat tamer taner tarık tayfun tekin tevfik tuncay
  tuncer turgut tümer ufuk uğur vahit vedat veli yakup yaşar yavuz yılmaz yunus yusuf zafer zekeriya zeki ziver ziya`);

// Her iki cinsiyette yaygın — işaretlenmez
export const UNISEX = liste(`aytaç cihan deniz derin evren gün kader merih mükerrem nur özgür şükran ümit yücel yüksel`);

// Sözlükte yoksa kaba ek kuralı: "-iye/-ıye", "-nur", "Gül-" kadın adıdır (Bahriye, Öznur, Gülsüm).
export function adCinsiyeti(ad) {
  const a = String(ad || '').replace('★', '').replace(/\s*\d+$/, '').trim().split(/\s+/)[0].toLocaleLowerCase('tr');
  if (!a || a.length < 2 || UNISEX.has(a)) return null;
  if (KADIN.has(a)) return 'K';
  if (ERKEK.has(a)) return 'E';
  if (/(iye|ıye)$/.test(a) || /nur$/.test(a) || /^gül/.test(a)) return 'K';
  return null;
}
