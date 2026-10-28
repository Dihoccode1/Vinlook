import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiTranslateProvider } from '../../src/providers/gemini-translate.js';
test('Gemini translates source text with isolated instructions and rejects truncated output', async () => {
  const provider = createGeminiTranslateProvider('key', async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.contents[0].parts[0].text, 'Chợ');
    assert.match(body.systemInstruction.parts[0].text, /vi to en/);
    return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Market' }] } }] });
  });
  assert.equal(await provider.translate('Chợ', 'vi', 'en'), 'Market');
  const truncated = createGeminiTranslateProvider('key', async () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'partial' }] } }] }));
  await assert.rejects(truncated.translate('x', 'vi', 'en'), { code: 'PROVIDER_UNAVAILABLE' });
});
