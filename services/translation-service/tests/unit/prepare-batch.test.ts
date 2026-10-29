import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare_batch } from '../../src/modules/translations/prepare-batch.js';
import { TranslationError } from '../../src/modules/translations/types.js';

test('missing translation does not prevent audio generation for prepared languages', async () => {
  const audio: string[] = [];
  const result = await prepare_batch(['poi'], ['vi', 'en', 'fr'], {
    translate: async (_id, language) => { if (language === 'en') throw new TranslationError('PROVIDER_QUOTA'); },
    narrate: async (_id, language) => { audio.push(language); }, report: () => {},
  });
  assert.deepEqual(audio, ['vi', 'fr']); assert.equal(result.text_ready, 2); assert.equal(result.audio_ready, 2); assert.equal(result.failures.length, 1);
});
test('TTS quota stops remaining audio calls without claiming they are complete', async () => {
  let calls = 0;
  const result = await prepare_batch(['poi'], ['vi', 'en'], { translate: async () => {}, narrate: async () => { calls++; throw new TranslationError('PROVIDER_QUOTA'); }, report: () => {} });
  assert.equal(calls, 1); assert.equal(result.audio_ready, 0); assert.equal(result.total, 2);
});
