import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoogleTranslateProvider } from '../../src/providers/google-translate.js';

test('Google provider keeps key in header and sends plain original text', async () => {
  const provider = createGoogleTranslateProvider('test-key', async (url, init) => {
    assert.equal(String(url), 'https://translation.googleapis.com/language/translate/v2');
    assert.equal(new Headers(init?.headers).get('X-Goog-Api-Key'), 'test-key');
    assert.deepEqual(JSON.parse(String(init?.body)), { q: 'Chợ', source: 'vi', target: 'en', format: 'text' });
    return Response.json({ data: { translations: [{ translatedText: 'Market' }] } });
  });
  assert.equal(await provider.translate('Chợ', 'vi', 'en'), 'Market');
});
test('missing key, quota, invalid response and timeout fail explicitly', async () => {
  await assert.rejects(createGoogleTranslateProvider('').translate('x', 'vi', 'en'), { code: 'PROVIDER_NOT_CONFIGURED' });
  await assert.rejects(createGoogleTranslateProvider('key', async () => new Response('', { status: 429 })).translate('x', 'vi', 'en'), { code: 'PROVIDER_QUOTA' });
  await assert.rejects(createGoogleTranslateProvider('key', async () => Response.json({})).translate('x', 'vi', 'en'), { code: 'PROVIDER_UNAVAILABLE' });
  await assert.rejects(createGoogleTranslateProvider('key', async () => { throw new DOMException('timeout', 'TimeoutError'); }).translate('x', 'vi', 'en'), { code: 'PROVIDER_TIMEOUT' });
});
