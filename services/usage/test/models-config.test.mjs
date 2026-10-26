import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';
import { createUsageModels, catalog } from '../src/models.js';
import { loadUsageBusinessConfig } from '../src/business-config.js';
import { planUsageCatalog, catalogFingerprint } from '../src/catalog.js';
import { languageCodes } from '../src/policy.js';
import { createPublicContentVerifier } from '../src/public-content.js';
import { FIXTURE_IDS as ids, FIXTURE_EPOCH } from './fixtures/poc-usage.mjs';
const time = new Date(FIXTURE_EPOCH);

test('Usage schema is disconnected, strict, no TTL/auto-provision and exactly matches locale registry', async () => {
  const connection = mongoose.createConnection(), models = createUsageModels(connection);
  assert.equal(createUsageModels(connection).Presence, models.Presence);
  assert.equal(connection.readyState, 0);
  for (const model of Object.values(models)) { assert.equal(model.schema.options.autoCreate, false); assert.equal(model.schema.options.autoIndex, false); assert.equal(model.schema.options.strict, 'throw'); assert.ok(model.schema.indexes().every(([, options]) => options.expireAfterSeconds === undefined)); }
  assert.deepEqual(languageCodes, Object.keys(JSON.parse(readFileSync(new URL('../../content/src/adapters/hybrid-v1.json', import.meta.url), 'utf8')).profiles).sort());
  await new models.Presence({ browserId: ids.browserA, lastSeenAt: time }).validate();
  assert.throws(() => new models.Presence({ browserId: ids.browserA, lastSeenAt: time, ip: 'synthetic' }));
  const row = { browserId: ids.browserA, playbackId: ids.playbackA, poiId: ids.poiA, languageCode: 'en', startedAt: time, lastSeenAt: time, endedAt: null, endReason: null };
  await new models.Listening(row).validate();
  await new models.Listening({ ...row, poiId: null, languageCode: null, startedAt: null, endedAt: time, endReason: 'closed' }).validate();
  for (const changes of [{ startedAt: null }, { endedAt: time }, { endedAt: null, endReason: 'closed' }, { languageCode: 'zh' }, { lastSeenAt: new Date(+time - 1) }]) await assert.rejects(new models.Listening({ ...row, ...changes }).validate());
  await connection.close();
});

test('business config stays opt-in; rejects cross-DB/unsafe origins/TLS or secrets in errors', () => {
  assert.equal(loadUsageBusinessConfig('production', {}), null);
  const valid = { USAGE_MONGODB_URI: 'mongodb://127.0.0.1:27017/vinlook_usage_poc_test?replicaSet=vinlook_usage_poc&directConnection=true',
    IDENTITY_BASE_URL: 'http://127.0.0.1:3001', USAGE_IDENTITY_SERVICE_KEY_B64URL: Buffer.alloc(32, 9).toString('base64url'),
    CONTENT_BASE_URL: 'http://127.0.0.1:3002', USAGE_ALLOWED_ORIGINS: 'https://tourist.example.invalid' };
  assert.equal(loadUsageBusinessConfig('test', valid).origins[0], valid.USAGE_ALLOWED_ORIGINS);
  for (const change of [{ USAGE_MONGODB_URI: 'mongodb://127.0.0.1/vinlook_content' }, { CONTENT_BASE_URL: 'https://user:synthetic-private@content.example.invalid' },
    { CONTENT_BASE_URL: 'https://content.example.invalid/api' }, { USAGE_ALLOWED_ORIGINS: '*' }, { USAGE_ALLOWED_ORIGINS: 'null' },
    { USAGE_MONGODB_URI: 'synthetic-private-uri' }]) {
    assert.throws(() => loadUsageBusinessConfig('test', { ...valid, ...change }), error => !error.message.includes('synthetic-private'));
  }
  assert.throws(() => loadUsageBusinessConfig('production', { ...valid, USAGE_MONGODB_URI: 'mongodb+srv://cluster.example.invalid/vinlook_usage?tls=false' }));
});

test('catalog planning is read-only, rejects unexpected/TTL indexes, and refuses other service databases', async () => {
  let changed = false;
  const connection = { name: 'vinlook_usage', db: {
    listCollections: () => ({ toArray: async () => catalog.map(row => ({ name: row.name, type: 'collection', options: { validator: row.validator, validationLevel: 'strict', validationAction: 'error' } })) }),
    collection: name => ({ indexes: async () => [{ key: { _id: 1 } }, ...catalog.find(row => row.name === name).indexes.map(row => ({ ...row, ...(changed ? { expireAfterSeconds: 90 } : {}) }))] }),
  } };
  assert.match(catalogFingerprint, /^[0-9a-f]{64}$/); assert.equal((await planUsageCatalog(connection)).matches, true);
  changed = true; assert.equal((await planUsageCatalog(connection)).matches, false);
  await assert.rejects(planUsageCatalog({ name: 'vinlook_content', db: { listCollections() { throw Error('must not read'); } } }), /USAGE_CATALOG_UNAVAILABLE/);
});

test('Content transport aborts stalled fetch at3s and bounds streamed bytes without raw error reflection', async () => {
  let signal;
  const selection = { poiId: ids.poiA, languageCode: 'zh-Hant' };
  const stalled = createPublicContentVerifier('https://content.example.invalid', { fetchImpl: (_url, options) => { signal = options.signal; return new Promise(() => {}); } });
  await assert.rejects(stalled(selection), { message: 'PUBLIC_CONTENT_UNAVAILABLE' }); assert.equal(signal.aborted, true);
  let canceled = false;
  const large = createPublicContentVerifier('https://content.example.invalid', { fetchImpl: async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1)); }, cancel() { canceled = true; },
  }), { headers: { 'Content-Type': 'application/json' } }) });
  await assert.rejects(large(selection), { message: 'PUBLIC_CONTENT_UNAVAILABLE' }); assert.equal(canceled, true);
  const failed = createPublicContentVerifier('https://content.example.invalid', { fetchImpl: () => { throw Error('synthetic-private-upstream-error'); } });
  await assert.rejects(failed(selection), error => error.message === 'PUBLIC_CONTENT_UNAVAILABLE' && error.cause === undefined);
});
