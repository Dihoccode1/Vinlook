import test from 'node:test';
import assert from 'node:assert/strict';
import { create_translation_pool } from '../../src/providers/translation-pool.js';
import { TranslationError } from '../../src/modules/translations/types.js';
test('independent fields use both providers concurrently and reuse compatible cache', async () => {
  let running = 0; let peak = 0;
  const provider = (name: string) => ({ name, translate: async () => { running++; peak = Math.max(peak, running); await new Promise(resolve => setTimeout(resolve, 5)); running--; return name; } });
  const pool = create_translation_pool([provider('Gemini'), provider('MyMemory')]);
  assert.deepEqual(await Promise.all([pool.translate('name', 'vi', 'en'), pool.translate('description', 'vi', 'en')]), ['Gemini', 'MyMemory']);
  assert.equal(peak, 2); assert.equal(pool.accepts_cached_provider?.('Gemini'), true);
});
test('quota falls back, cools down and never stores a fake translation', async () => {
  let clock = 0; let failed_calls = 0;
  const bad = { name: 'Gemini', translate: async () => { failed_calls++; throw new TranslationError('PROVIDER_QUOTA'); } };
  const good = { name: 'MyMemory', translate: async () => 'Market' };
  const pool = create_translation_pool([bad, good], () => clock);
  assert.equal(await pool.translate('x', 'vi', 'en'), 'Market');
  await pool.translate('x', 'vi', 'en'); await pool.translate('x', 'vi', 'en'); assert.equal(failed_calls, 1);
  clock = 61000; await pool.translate('x', 'vi', 'en'); await pool.translate('x', 'vi', 'en'); assert.equal(failed_calls, 2);
  await assert.rejects(create_translation_pool([bad]).translate('x', 'vi', 'en'), { code: 'PROVIDER_QUOTA' });
});
