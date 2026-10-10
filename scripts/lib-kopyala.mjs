// api/_lib/{agac,soy-tarihi}.js → public/lib/ (istemci aynı kodu kullansın).
// Vercel "build" adımında çalışır; --kontrol ile yalnızca eşitliği doğrular.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const DOSYALAR = ['agac.js', 'soy-tarihi.js'];
const kontrol = process.argv.includes('--kontrol');
let hata = false;
mkdirSync(new URL('../public/lib/', import.meta.url), { recursive: true });
for (const ad of DOSYALAR) {
  const kaynak = new URL(`../api/_lib/${ad}`, import.meta.url);
  const hedef = new URL(`../public/lib/${ad}`, import.meta.url);
  const icerik = `// ÜRETİLMİŞ DOSYA — düzenleme. Kaynak: api/_lib/${ad} (npm run build)\n` + readFileSync(kaynak, 'utf8');
  if (kontrol) {
    let mevcut = '';
    try { mevcut = readFileSync(hedef, 'utf8'); } catch {}
    if (mevcut !== icerik) { console.error(`public/lib/${ad} güncel değil: npm run build`); hata = true; }
    else console.log(`public/lib/${ad} güncel`);
  } else {
    writeFileSync(hedef, icerik);
    console.log(`public/lib/${ad} yazıldı`);
  }
}
if (hata) process.exit(1);
