import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render_environment } from '../render-environment.mjs';

test('existing Render configuration only updates explicitly supplied values', () => {
  assert.deepEqual(render_environment({ DATABASE_URL: 'test-url', GEMINI_API_KEY: '' }), [
    { key: 'DATABASE_URL', value: 'test-url' },
  ]);
});

test('TTS credentials can be provisioned without replacing unrelated environment entries', () => {
  const existing = new Map([
    ['GEMINI_API_KEY', 'existing-test-key'],
    ['OTHER_KEY', 'keep'],
  ]);
  for (const { key, value } of render_environment({ TTS_PROVIDERS: 'gemini' }))
    existing.set(key, value);
  assert.equal(existing.get('GEMINI_API_KEY'), 'existing-test-key');
  assert.equal(existing.get('OTHER_KEY'), 'keep');
  assert.equal(existing.get('TTS_PROVIDERS'), 'gemini');
  assert.deepEqual(render_environment({ GEMINI_API_KEY: 'new-test-key' }), [
    { key: 'GEMINI_API_KEY', value: 'new-test-key' },
  ]);
});

test('only newly created services receive defaults', () => {
  assert.deepEqual(render_environment({}, true), [
    { key: 'SUPABASE_STORAGE_BUCKET', value: 'vinlook-media' },
    { key: 'TRANSLATION_PROVIDERS', value: 'mymemory' },
  ]);
  assert.deepEqual(render_environment({}), []);
});
