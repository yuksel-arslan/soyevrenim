// Ortak veritabanı erişimi (Neon serverless).
// Yerel test/geliştirmede globalThis.__SOY_TEST.sql aynı arayüzü (etiketli şablon)
// sağlayan bir bağdaştırıcıyla değiştirilebilir (bkz. test/yardimci.mjs).
import { neon } from '@neondatabase/serverless';

let _sql = null;
export function db() {
  if (globalThis.__SOY_TEST?.sql) return globalThis.__SOY_TEST.sql;
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

export const sayi = (v) => (v == null ? 0 : Number(v));

export function govde(req) {
  const b = req.body;
  if (!b) return {};
  if (typeof b === 'string') { try { return JSON.parse(b || '{}'); } catch { return {}; } }
  return b;
}

export function cors(res, yontemler = 'POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', yontemler);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Gün = UTC günü (günlük kota UTC 00:00'da sıfırlanır = TR 03:00)
export function gunBasi(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}
export function ayBasi(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

// Ağacı oku (tek satır)
export async function agacOku() {
  const r = await db()`select veri from agac where id=1`;
  return r[0]?.veri || { nodes: [], edges: [], marriages: [], motherEdges: [] };
}
