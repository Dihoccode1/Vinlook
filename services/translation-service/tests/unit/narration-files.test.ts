import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { create_narration_file_store } from '../../src/modules/translations/narration-files.js';
import { create_narration_service } from '../../src/modules/translations/narration.service.js';
import { narration_key } from '../../src/modules/translations/narration-key.js';

test('WAV files survive service restart and restore SQL without generating again', async () => {
  const root = await mkdtemp(join(tmpdir(), 'vinlook-narration-'));
  const id = 'POI001';
  const text = { name: 'Chợ', description: 'Câu chuyện' };
  const key = narration_key(id, 'vi', text.name, text.description, 'voice');
  const wav = Buffer.alloc(48); wav.write('RIFF'); wav.write('WAVE', 8);
  let generated = 0; let restored = 0;
  try {
    const files = create_narration_file_store(root);
    const source = { get: async () => ({ data: text }) };
    await create_narration_service(source, { identity: 'voice', generate: async () => { generated++; return wav; } }, undefined, files).get(id, 'vi');
    assert.deepEqual(await files.find(id, 'vi', key), wav);
    const next_service = create_narration_service(source, { identity: 'voice', generate: async () => { assert.fail('Must reuse the WAV file'); } }, {
      find: async () => undefined, save: async () => { restored++; },
    }, create_narration_file_store(root));
    assert.deepEqual(await next_service.get(id, 'vi'), wav);
    assert.equal(generated, 1); assert.equal(restored, 1);
    await assert.rejects(files.find('../escape', 'vi', key), /Invalid narration file key/);
    await assert.rejects(files.save(id, 'vi', key, Buffer.from('invalid')), /Invalid WAV/);
  } finally {
    await unlink(join(root, id, `vi-${key}.wav`)); await rmdir(join(root, id)); await rmdir(root);
  }
});
