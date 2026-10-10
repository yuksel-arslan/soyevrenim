// api/_lib/agac.js → public/lib/agac.js (istemci aynı kodu kullansın).
// Vercel "build" adımında çalışır; --kontrol ile yalnızca eşitliği doğrular.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const kaynak = new URL('../api/_lib/agac.js', import.meta.url);
const hedef = new URL('../public/lib/agac.js', import.meta.url);
const baslik = '// ÜRETİLMİŞ DOSYA — düzenleme. Kaynak: api/_lib/agac.js (npm run build)\n';
const icerik = baslik + readFileSync(kaynak, 'utf8');
if (process.argv.includes('--kontrol')) {
  let mevcut = '';
  try { mevcut = readFileSync(hedef, 'utf8'); } catch {}
  if (mevcut !== icerik) { console.error('public/lib/agac.js güncel değil: npm run build'); process.exit(1); }
  console.log('public/lib/agac.js güncel');
} else {
  mkdirSync(new URL('../public/lib/', import.meta.url), { recursive: true });
  writeFileSync(hedef, icerik);
  console.log('public/lib/agac.js yazıldı');
}
