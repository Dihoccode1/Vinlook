import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import sql from 'mssql';
import { translationRepository } from '../../src/modules/translations/translation.repository.js';
import { getPool, closePool } from '../../src/config/database.js';
import { narrationRepository } from '../../src/modules/translations/narration.repository.js';
import { createNarrationService } from '../../src/modules/translations/narration.service.js';
test('SQL cache stores Unicode, replaces translations and filters stale hashes', async () => {
  const poiId = randomUUID();
  try {
    await translationRepository.ready();
    const row = { poiId, language: 'ja', sourceLanguage: 'vi', sourceHash: 'a'.repeat(64), name: '市場', description: 'Địa điểm 日本語', provider: 'test', translatedAt: new Date().toISOString() };
    await translationRepository.save(row);
    assert.equal((await translationRepository.find(poiId, 'ja', row.sourceHash))?.description, row.description);
    assert.equal(await translationRepository.find(poiId, 'ja', 'b'.repeat(64)), undefined);
    await translationRepository.save({ ...row, sourceHash: 'b'.repeat(64), name: '更新' });
    assert.equal((await translationRepository.find(poiId, 'ja', 'b'.repeat(64)))?.name, '更新');
    const wav = Buffer.alloc(48); wav.write('RIFF'); wav.write('WAVE', 8);
    let generations = 0;
    const content = { name: 'Địa điểm', description: 'Câu chuyện' };
    const provider = { identity: 'test-voice', generate: async () => { generations++; return wav; } };
    const make = () => createNarrationService({ get: async () => ({ data: content }) }, provider, narrationRepository);
    assert.deepEqual(await make().get(poiId, 'vi'), wav);
    const metadata = await narrationRepository.metadata(poiId);
    assert.equal(metadata[0]?.bytes, wav.length); assert.equal(metadata[0]?.language, 'vi');
    await closePool();
    assert.deepEqual(await make().get(poiId, 'vi'), wav); assert.equal(generations, 1);
    content.description = 'Câu chuyện mới'; await make().get(poiId, 'vi'); assert.equal(generations, 2);
    const pool = await getPool();
    const count = await pool.request().input('id', sql.UniqueIdentifier, poiId).query('SELECT COUNT(*) AS total FROM dbo.PoiNarrations WHERE PoiId = @id');
    assert.equal(count.recordset[0].total, 1);
  } finally {
    const pool = await getPool(); await pool.request().input('id', sql.UniqueIdentifier, poiId).query('DELETE FROM dbo.PoiNarrations WHERE PoiId = @id; DELETE FROM dbo.PoiTranslations WHERE PoiId = @id'); await closePool();
  }
});
