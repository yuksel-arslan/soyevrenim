// Test yardımcıları: gerçek PostgreSQL (TEST_DATABASE_URL) + neon-benzeri etiketli şablon
// bağdaştırıcısı + taklit LLM/R2. Gereken: `npm i --no-save pg`, TEST_DATABASE_URL.
// Sağlayıcıya (Groq) ve R2'ye gerçek istek ATILMAZ.
import { readFileSync } from 'node:fs';

export const DB_URL = process.env.TEST_DATABASE_URL;

export async function dbKur() {
  const { default: pg } = await import('pg');
  const havuz = new pg.Pool({ connectionString: DB_URL, max: 4 });
  const sql = (parcalar, ...degerler) => {
    let text = parcalar[0];
    degerler.forEach((_, i) => { text += `$${i + 1}` + parcalar[i + 1]; });
    return havuz.query(text, degerler).then((r) => r.rows);
  };
  const ham = (t) => havuz.query(t);
  await ham('drop schema if exists public cascade; create schema public;');
  await ham(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const agac = JSON.parse(readFileSync(new URL('../yedek-cinsiyet-oncesi.json', import.meta.url), 'utf8'));
  await havuz.query('update agac set veri=$1::jsonb where id=1', [JSON.stringify(agac)]);
  const r2 = new Map();
  globalThis.__SOY_TEST = {
    sql,
    llm: null,
    r2: {
      url: (method, anahtar, ek) => `https://r2.test/${anahtar}?m=${method}${ek ? '&' + new URLSearchParams(ek) : ''}`,
      boyut: (anahtar) => (r2.has(anahtar) ? r2.get(anahtar) : null),
      koy: (anahtar, bayt) => r2.set(anahtar, bayt),
    },
  };
  return { sql, ham, kapat: () => havuz.end(), agac };
}

// Vercel req/res taklidi
export async function cagir(handler, { method = 'POST', query = {}, body = {}, headers = {} } = {}) {
  const res = {
    statusCode: 200, basliklar: {}, govde: null,
    setHeader(k, v) { this.basliklar[k.toLowerCase()] = v; },
    status(c) { this.statusCode = c; return this; },
    json(o) { this.govde = o; return this; },
    end() { return this; },
  };
  await handler({ method, query, body, headers }, res);
  return res;
}

// Senaryolu LLM: her çağrıda sıradaki yanıtı verir, gelen istekleri kaydeder.
export function senaryoLlm(adimlar) {
  const istekler = [];
  let i = 0;
  return {
    istekler,
    sohbet: async (govde) => {
      istekler.push(structuredClone(govde));
      const a = adimlar[i++];
      if (!a) throw new Error('senaryo bitti');
      if (a instanceof Error) throw a;
      const mesaj = typeof a === 'function' ? a(govde) : a;
      return { choices: [{ message: { role: 'assistant', ...mesaj } }], usage: { prompt_tokens: 900, completion_tokens: 120 } };
    },
    yaziya: async () => ({ text: 'dedem hamit bir gün tarlaya gitti ayşe fahrinin kız kardeşiydi', duration: 95 }),
  };
}

export const arac = (ad, args, id = ad) => ({ id: `c_${id}`, type: 'function', function: { name: ad, arguments: JSON.stringify(args) } });
