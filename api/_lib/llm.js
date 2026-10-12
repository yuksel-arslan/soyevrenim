// LLM / STT sağlayıcı istemcisi — bağımlılıksız (fetch). Sağlayıcı ayar.js'ten seçilir (varsayılan OpenAI).
// OpenAI uç biçimi: /chat/completions (araç çağırma) ve /audio/transcriptions.
// Sağlayıcıya özgü alanlar SAGLAYICI[..].ekAlan'dan gelir (OpenAI bilinmeyen alanı reddeder).
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
    ...(SAGLAYICI[LLM.saglayici].ekAlan || {}),
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

// Ses → yazı. Dönüş: { metin, saniye }
// Groq sesi imzalı URL'den kendisi indirir; OpenAI dosya ister: sunucu R2'den indirip yükler
// (dosya en çok SES.parcaMaxMb — kayıt bu boyutta parçalanıyor).
export async function yaziyaCevir({ url }) {
  const s = SAGLAYICI[STT.saglayici];
  const govde = { model: STT.model, language: SES.dil, response_format: 'verbose_json', temperature: 0 };
  if (s.sesUrl) govde.url = url;
  let j;
  if (globalThis.__SOY_TEST?.llm) j = await globalThis.__SOY_TEST.llm.yaziya({ ...govde, url });
  else {
    const fd = new FormData();
    for (const [k, v] of Object.entries(govde)) fd.append(k, String(v));
    if (!s.sesUrl) {
      const ses = await fetch(url);
      if (!ses.ok) throw new SaglayiciHatasi(`ses dosyası indirilemedi (${ses.status})`);
      const tur = (ses.headers.get('content-type') || '').split(';')[0];
      const blob = new Blob([await ses.arrayBuffer()], { type: tur || 'audio/webm' });
      fd.append('file', blob, /mp4|m4a|aac/.test(tur) ? 'ses.m4a' : 'ses.webm');
    }
    const r = await fetch(s.yaziya, { method: 'POST', headers: { Authorization: `Bearer ${anahtar(STT.saglayici)}` }, body: fd });
    j = await cevapOku(r);
  }
  return { metin: String(j.text || '').trim(), saniye: Math.max(Number(j.duration) || 0, SES.whisperMinSn) };
}
