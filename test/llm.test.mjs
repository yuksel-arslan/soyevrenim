// Sağlayıcı istemcisi (OpenAI): istek biçimi doğru mu? Gerçek istek atılmaz (fetch taklit).
import test from 'node:test';
import assert from 'node:assert/strict';
import { sohbet, yaziyaCevir, SaglayiciKotaHatasi } from '../api/_lib/llm.js';
import { LLM, STT, SAGLAYICI } from '../api/_lib/ayar.js';

function taklit(yanitlar) {
  const gelen = [], asil = globalThis.fetch;
  globalThis.fetch = async (url, istek = {}) => { gelen.push({ url: String(url), istek }); return yanitlar.shift()(url, istek); };
  return { gelen, geri: () => { globalThis.fetch = asil; } };
}
const json = (o, status = 200) => () => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

test('LLM: OpenAI uç + anahtar; Groq\'a özgü alan gönderilmez', async () => {
  assert.equal(LLM.saglayici, 'openai');
  process.env.OPENAI_API_KEY = 'test-anahtar';
  const t = taklit([json({ choices: [{ message: { role: 'assistant', content: 'Merhaba' } }], usage: { prompt_tokens: 10, completion_tokens: 3 } })]);
  try {
    const r = await sohbet({ messages: [{ role: 'user', content: 'selam' }], tools: [{ type: 'function', function: { name: 'x', parameters: { type: 'object' } } }] });
    assert.equal(r.mesaj.content, 'Merhaba');
    assert.deepEqual(r.usage, { girdi: 10, cikti: 3 });
    const { url, istek } = t.gelen[0];
    assert.equal(url, SAGLAYICI.openai.sohbet);
    assert.equal(istek.headers.Authorization, 'Bearer test-anahtar');
    const g = JSON.parse(istek.body);
    assert.equal(g.model, LLM.model);
    assert.ok(!('include_reasoning' in g), 'OpenAI bilinmeyen alanı reddeder');
    assert.equal(g.tool_choice, 'auto');
  } finally { t.geri(); }
});

test('LLM: 429 → SaglayiciKotaHatasi (kullanıcıya hata değil, yedek yanıt)', async () => {
  const t = taklit([json({ error: { message: 'rate' } }, 429)]);
  try { await assert.rejects(sohbet({ messages: [] }), SaglayiciKotaHatasi); } finally { t.geri(); }
});

test('STT: OpenAI sesi URL ile almaz — sunucu indirir, dosya olarak yükler', async () => {
  process.env.OPENAI_API_KEY = 'test-anahtar';
  const t = taklit([
    () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'audio/mp4' } }),
    json({ text: ' Merhaba dede ', duration: 42.5 }),
  ]);
  try {
    const r = await yaziyaCevir({ url: 'https://r2.test/ses/a.m4a?imza=1' });
    assert.deepEqual(r, { metin: 'Merhaba dede', saniye: 42.5 });
    assert.equal(t.gelen[0].url, 'https://r2.test/ses/a.m4a?imza=1');
    assert.equal(t.gelen[1].url, SAGLAYICI[STT.saglayici].yaziya);
    const fd = t.gelen[1].istek.body;
    assert.equal(fd.get('model'), STT.model);
    assert.equal(fd.get('url'), null, 'url alanı gönderilmez');
    assert.equal(fd.get('file').name, 'ses.m4a');
    assert.equal(fd.get('response_format'), 'verbose_json');
  } finally { t.geri(); }
});
