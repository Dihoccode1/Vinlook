import test from 'node:test';
import assert from 'node:assert/strict';
import {
  provider_snapshot,
  track_translation,
  track_tts,
} from '../../src/providers/provider-status.js';
import { TranslationError } from '../../src/modules/translations/types.js';

test('provider status observes real requests, distinguishes quota and expires stale evidence', async () => {
  let calls = 0;
  let limited = true;
  const provider = track_translation('test-translation', true, {
    name: 'test',
    async translate() {
      calls++;
      if (limited) throw new TranslationError('PROVIDER_QUOTA');
      return 'translated';
    },
  });
  const status = () => provider_snapshot().find((p) => p.name === 'test-translation')!;
  assert.equal(status().status, 'unknown');
  assert.equal(calls, 0);
  await assert.rejects(provider.translate('text', 'vi', 'en'), TranslationError);
  assert.equal(status().status, 'limited');
  assert.equal(calls, 1);
  assert.equal(
    provider_snapshot(Date.now() + 600001).find((p) => p.name === 'test-translation')!.status,
    'unknown',
  );
  limited = false;
  await provider.translate('text', 'vi', 'en');
  assert.equal(status().status, 'available');
  assert.equal(status().remaining, null);
  track_tts('test-unconfigured', false, {
    identity: 'test',
    async generate() {
      throw new TranslationError('PROVIDER_NOT_CONFIGURED');
    },
  });
  assert.equal(
    provider_snapshot().some((p) => p.name === 'test-unconfigured'),
    false,
  );
  assert.equal(calls, 2); // Snapshot refreshes must never call the paid provider.
});
