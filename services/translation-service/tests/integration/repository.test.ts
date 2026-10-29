import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sql from 'mssql';
import { translation_repository } from '../../src/modules/translations/translation.repository.js';
import { get_pool, close_pool } from '../../src/config/database.js';
import { narration_repository } from '../../src/modules/translations/narration.repository.js';
import { create_narration_service } from '../../src/modules/translations/narration.service.js';
test('SQL cache stores Unicode, replaces translations and filters stale hashes', async () => {
  const poi_id = randomUUID();
  try {
    await translation_repository.ready();
    const row = { poi_id: poi_id, language: 'ja', source_language: 'vi', source_hash: 'a'.repeat(64), name: '市場', description: 'Địa điểm 日本語', provider: 'test', translated_at: new Date().toISOString() };
    await translation_repository.save(row);
    assert.equal((await translation_repository.find(poi_id, 'ja', row.source_hash))?.description, row.description);
    assert.equal(await translation_repository.find(poi_id, 'ja', 'b'.repeat(64)), undefined);
    await translation_repository.save({ ...row, source_hash: 'b'.repeat(64), name: '更新' });
    assert.equal((await translation_repository.find(poi_id, 'ja', 'b'.repeat(64)))?.name, '更新');
    const wav = Buffer.alloc(48); wav.write('RIFF'); wav.write('WAVE', 8);
    let generations = 0;
    const content = { name: 'Địa điểm', description: 'Câu chuyện' };
    const provider = { identity: 'test-voice', generate: async () => { generations++; return wav; } };
    const make = () => create_narration_service({ get: async () => ({ data: content }) }, provider, narration_repository);
    assert.deepEqual(await make().get(poi_id, 'vi'), wav);
    const metadata = await narration_repository.metadata(poi_id);
    assert.equal(metadata[0]?.bytes, wav.length); assert.equal(metadata[0]?.language, 'vi');
    await close_pool();
    assert.deepEqual(await make().get(poi_id, 'vi'), wav); assert.equal(generations, 1);
    content.description = 'Câu chuyện mới'; await make().get(poi_id, 'vi'); assert.equal(generations, 2);
    const pool = await get_pool();
    const count = await pool.request().input('id', sql.UniqueIdentifier, poi_id).query('SELECT COUNT(*) AS total FROM dbo.poi_narrations WHERE poi_id = @id');
    assert.equal(count.recordset[0].total, 1);
  } finally {
    const pool = await get_pool(); await pool.request().input('id', sql.UniqueIdentifier, poi_id).query('DELETE FROM dbo.poi_narrations WHERE poi_id = @id; DELETE FROM dbo.poi_translations WHERE poi_id = @id'); await close_pool();
  }
});
