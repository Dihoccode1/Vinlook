import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { create_translation_service } from '../../src/modules/translations/translation.service.js';
import type { Translation } from '../../src/modules/translations/types.js';
import { create_my_memory_provider, split_for_translation } from '../../src/providers/mymemory.js';
import { create_app } from '../../src/app.js';

function fixture() {
  const poi = { id: 'POI001', name: 'Chợ', description: 'Một địa điểm', source_language: 'vi' };
  const rows = new Map<string, Translation>(); let calls = 0; let fail = false;
  const service = create_translation_service({ get: async () => poi }, {
    find: async (id, language, hash) => { const row = rows.get(`${id}:${language}`); return row?.source_hash === hash ? row : undefined; },
    save: async row => { rows.set(`${row.poi_id}:${row.language}`, row); }, ready: async () => {},
  }, { name: 'test', translate: async text => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); if (fail) throw new Error('offline'); return `translated ${text}`; } });
  return { poi, service, rows, calls: () => calls, fail: () => { fail = true; } };
}
test('source is returned directly; cache hits skip provider; source edits invalidate cache', async () => {
  const f = fixture();
  assert.equal((await f.service.get(f.poi.id, 'vi')).original, true); assert.equal(f.calls(), 0);
  assert.equal((await f.service.get(f.poi.id, 'en')).from_cache, false); assert.equal(f.calls(), 2);
  assert.equal((await f.service.get(f.poi.id, 'en')).from_cache, true); assert.equal(f.calls(), 2);
  f.poi.description = 'Nội dung mới';
  assert.equal((await f.service.get(f.poi.id, 'en')).from_cache, false); assert.equal(f.calls(), 4);
});
test('concurrent requests share provider calls and failures are never cached', async () => {
  const f = fixture(); await Promise.all([f.service.get(f.poi.id, 'en'), f.service.get(f.poi.id, 'en')]); assert.equal(f.calls(), 2);
  f.fail(); await assert.rejects(f.service.get(f.poi.id, 'fr')); assert.equal(f.rows.size, 1);
});
test('API exposes 15 target languages and rejects arbitrary source text', async () => {
  const f = fixture(); const app = create_app(f.service);
  const catalog = await request(app).get('/languages').expect(200); assert.equal(catalog.body.data.length, 16);
  await request(app).post(`/pois/${f.poi.id}/translation`).send({ language: 'en', text: 'untrusted' }).expect(400);
  await request(app).post(`/pois/${f.poi.id}/translation`).send({ language: 'xx' }).expect(400);
  await request(app).post('/pois/invalid/translation').send({ language: 'en' }).expect(400);
  const result = await request(app).post(`/pois/${f.poi.id}/translation`).send({ language: 'en' }).expect(200);
  assert.equal(result.body.data.name, 'translated Chợ');
});
test('UTF-8 chunks honor 500-byte limit and preserve paragraph boundaries', () => {
  const chunks = split_for_translation(`${'Việt Nam 😀 '.repeat(100)}\nĐoạn sau`);
  assert.ok(chunks.every(value => Buffer.byteLength(value) <= 500)); assert.ok(chunks.includes('\n'));
  assert.ok(chunks.every(value => !value.includes('\uFFFD')));
});
test('provider sends original text and language pair and reports quota', async () => {
  const provider = create_my_memory_provider(async input => {
    const url = new URL(String(input)); assert.equal(url.searchParams.get('q'), 'Chợ'); assert.equal(url.searchParams.get('langpair'), 'vi|en');
    return Response.json({ responseStatus: 200, responseData: { translatedText: 'Market' } });
  });
  assert.equal(await provider.translate('Chợ', 'vi', 'en'), 'Market');
  const quota = create_my_memory_provider(async () => Response.json({ responseStatus: 429, quotaFinished: true }));
  await assert.rejects(quota.translate('Chợ', 'vi', 'en'), { code: 'PROVIDER_QUOTA' });
});
