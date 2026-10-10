// LLM / STT sağlayıcı istemcisi — bağımlılıksız (fetch). Sağlayıcı ayar.js'ten seçilir.
// Groq OpenAI uyumlu uç kullanır: /chat/completions (araç çağırma) ve /audio/transcriptions.
// Test: globalThis.__SOY_TEST.llm = { sohbet(govde), yaziya(govde) } ile taklit edilebilir.
import { LLM, STT, SAGLAYICI, ASISTAN, SES } from './ayar.js';

export class SaglayiciKotaHatasi extends Error {}   // 429 → yedeğe düş, hata gösterme
export class SaglayiciHatasi extends Error {}

function anahtar(saglayici) {
  const env = SAGLAYICI[saglayici].anahtarEnv;
  const k = process.env[env];
  if (!k) throw new SaglayiciHatasi(`${env} tanımlı değil`);
  return k;
}

async function cevapOku(r) {
  if (r.status === 429) throw new SaglayiciKotaHatasi('sağlayıcı kotası');
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new SaglayiciHatasi(j?.error?.message || `sağlayıcı hatası ${r.status}`);
  return j;
}

// Tek sohbet isteği. Dönüş: { mesaj, usage:{girdi,cikti} }
export async function sohbet({ messages, tools, maxToken = ASISTAN.ciktiMaxToken, json = false }) {
  const govde = {
    model: LLM.model,
    messages,
    max_completion_tokens: maxToken,
    reasoning_effort: ASISTAN.gerekce,
    include_reasoning: false,
  };
  if (tools?.length) { govde.tools = tools; govde.tool_choice = 'auto'; }
  if (json) govde.response_format = { type: 'json_object' };
  let j;
  if (globalThis.__SOY_TEST?.llm) j = await globalThis.__SOY_TEST.llm.sohbet(govde);
  else {
    const r = await fetch(SAGLAYICI[LLM.saglayici].sohbet, {
      method: 'POST',
      headers: { Authorization: `Bearer ${anahtar(LLM.saglayici)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(govde),
    });
    j = await cevapOku(r);
  }
  const u = j.usage || {};
  return { mesaj: j.choices?.[0]?.message || { role: 'assistant', content: '' },
    usage: { girdi: u.prompt_tokens || 0, cikti: u.completion_tokens || 0 } };
}

// Ses → yazı. Sağlayıcı sesi imzalı URL'den kendisi indirir (Vercel'den geçmez).
// Dönüş: { metin, saniye }
export async function yaziyaCevir({ url }) {
  const govde = { model: STT.model, url, language: SES.dil, response_format: 'verbose_json', temperature: 0 };
  let j;
  if (globalThis.__SOY_TEST?.llm) j = await globalThis.__SOY_TEST.llm.yaziya(govde);
  else {
    const fd = new FormData();
    for (const [k, v] of Object.entries(govde)) fd.append(k, String(v));
    const r = await fetch(SAGLAYICI[STT.saglayici].yaziya, {
      method: 'POST', headers: { Authorization: `Bearer ${anahtar(STT.saglayici)}` }, body: fd,
    });
    j = await cevapOku(r);
  }
  return { metin: String(j.text || '').trim(), saniye: Math.max(Number(j.duration) || 0, SES.whisperMinSn) };
}
