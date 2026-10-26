import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createUsageModels } from '../src/models.js';
import { applyUsageTestCatalog, verifyUsageCatalog, catalogFingerprint } from '../src/catalog.js';
import { createMongoUsageStore } from '../src/mongo-store.js';
import { createUsageService } from '../src/domain.js';
import { languageCodes } from '../src/policy.js';
import { httpFixture, ids } from './fixtures/http-runtime.mjs';
import { FIXTURE_EPOCH } from './fixtures/poc-usage.mjs';

test('Usage real disposable Mongo replica-set and HTTP acceptance', { timeout: 170000 }, async t => {
  const name = process.env.VINLOOK_TEST_MONGO_CONTAINER;
  assert.match(name ?? '', /^vinlook-poc-usage-mongo-[a-f0-9-]{36}$/);
  const info = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8', windowsHide: true }))[0];
  assert.equal(info.Config.Image, 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');
  assert.equal(info.Config.Labels['vinlook.poc'], 'usage-test'); assert.equal(info.State.Running, true);
  const binding = info.NetworkSettings.Ports['27017/tcp']; assert.equal(binding.length, 1); assert.equal(binding[0].HostIp, '127.0.0.1');
  const port = Number(binding[0].HostPort); assert.ok(Number.isInteger(port) && port > 0 && port <= 65535);
  const connection = mongoose.createConnection(`mongodb://127.0.0.1:${port}/vinlook_usage_poc_test?replicaSet=vinlook_usage_poc&directConnection=true`,
    { autoCreate: false, autoIndex: false, bufferCommands: false, serverSelectionTimeoutMS: 3000 });
  await connection.asPromise(); t.after(() => connection.close());
  assert.equal((await connection.db.listCollections().toArray()).length, 0); // Abort if this is not a fresh fixture DB.
  await applyUsageTestCatalog(connection, catalogFingerprint);
  const models = createUsageModels(connection);
  const reset = async () => { assert.equal(connection.name, 'vinlook_usage_poc_test'); await models.Presence.deleteMany({}); await models.Listening.deleteMany({}); };
  const makeService = (selectedModels = models, admit = async () => true) => createUsageService({
    store: createMongoUsageStore({ connection, models: selectedModels, now: () => FIXTURE_EPOCH }), verifyPublicPoi: admit, languageCodes, now: () => FIXTURE_EPOCH });
  const input = { browserId: ids.browserA, playbackId: ids.playbackA, poiId: ids.poiA, languageCode: 'en' };

  await t.test('catalog is exact, Mongo validators reject unknown/invalid fields and indexes enforce uniqueness', async () => {
    await verifyUsageCatalog(connection);
    await assert.rejects(models.Presence.collection.insertOne({ browserId: ids.browserA, lastSeenAt: new Date(), ip: 'synthetic' }), error => error.code === 121);
    await models.Presence.create({ browserId: ids.browserA, lastSeenAt: new Date(FIXTURE_EPOCH) });
    await assert.rejects(models.Presence.create({ browserId: ids.browserA, lastSeenAt: new Date(FIXTURE_EPOCH) }), error => error.code === 11000);
    for (const model of Object.values(models)) assert.ok((await model.collection.indexes()).every(index => index.expireAfterSeconds === undefined));
    await reset();
  });
  await t.test('separate store instances and concurrent same-ID starts retain one durable playback', async () => {
    const a = makeService(), b = makeService();
    const result = await Promise.allSettled(Array.from({ length: 10 }, (_, index) => (index % 2 ? a : b).start(input)));
    assert.ok(result.some(row => row.status === 'fulfilled')); assert.equal(await models.Listening.countDocuments({}), 1);
    const first = await models.Listening.findOne().lean();
    assert.equal((await a.start(input)).acceptedAt, +first.startedAt); assert.equal(await models.Presence.countDocuments({}), 1);
    await reset();
  });
  await t.test('real transaction recheck retains end-before-start during public admission', async () => {
    let entered, release; const pendingAdmission = new Promise(resolve => { entered = resolve; });
    const a = makeService(models, async () => { entered(); await new Promise(resolve => { release = resolve; }); return true; });
    const pending = a.start(input); await pendingAdmission;
    await makeService().end({ browserId: ids.browserA, playbackId: ids.playbackA, reason: 'closed' }); release();
    assert.notEqual((await pending).endedAt, null);
    const row = await models.Listening.findOne().lean(); assert.equal(row.startedAt, null); assert.equal(row.poiId, null);
    assert.equal(await models.Presence.countDocuments({}), 0); await reset();
  });
  await t.test('presence write failure rolls back an inserted playback in the real Mongo transaction', async () => {
    const failing = { ...models, Presence: { find: models.Presence.find.bind(models.Presence), updateOne: async () => { throw Error('synthetic-private-db-failure'); } } };
    await assert.rejects(makeService(failing).start(input), { code: 'USAGE_UNAVAILABLE' });
    assert.equal(await models.Listening.countDocuments({}), 0); assert.equal(await models.Presence.countDocuments({}), 0);
  });
  await t.test('bounded active snapshot overflow fails rather than returning truncated zero/counts', async () => {
    await models.Presence.insertMany(Array.from({ length: 1001 }, (_, index) => ({ browserId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, lastSeenAt: new Date(FIXTURE_EPOCH) })));
    await assert.rejects(makeService().summary(), { code: 'USAGE_UNAVAILABLE' }); await reset();
  });
  await t.test('Usage HTTP runs against Mongo: pause heartbeat, stale90s, role gate and terminal playback', async child => {
    const f = await httpFixture(child, { fixtureMode: true, connection });
    assert.equal((await f.request('/listening/start', { value: input })).status, 200);
    const monitor = { method: 'GET', token: 'synthetic.header.signature' };
    assert.equal((await f.request('/monitoring/summary', monitor)).body.data.currentListeners, 1);
    await f.request('/listening/start', { value: { ...input, playbackId: ids.playbackB, poiId: ids.poiB } });
    assert.equal((await f.request('/monitoring/summary', monitor)).body.data.currentListeners, 1);
    await f.request('/listening/start', { value: { ...input, browserId: ids.browserB, playbackId: ids.playbackC } });
    const distinct = (await f.request('/monitoring/summary', monitor)).body.data;
    assert.equal(distinct.currentListeners, 2); assert.equal(distinct.byPoi.reduce((sum, row) => sum + row.currentListeners, 0), 3);
    f.advance(90000); assert.equal((await f.request('/monitoring/summary', monitor)).body.data.currentListeners, 0);
    assert.equal((await f.request(`/listening/${ids.playbackA}/heartbeat`, { value: { browserId: ids.browserA } })).status, 200);
    assert.equal((await f.request('/monitoring/summary', monitor)).body.data.currentListeners, 1);
    await f.request(`/listening/${ids.playbackA}/end`, { value: { browserId: ids.browserA, reason: 'replaced' } });
    assert.notEqual((await f.request('/listening/start', { value: input })).body.data.endedAt, null);
    f.modes.authority = 'locked'; assert.equal((await f.request('/monitoring/summary', monitor)).status, 403);
    await reset();
  });
  await t.test('missing index rejects catalog readiness and never auto-repairs', async () => {
    await models.Presence.collection.dropIndex('browserId_1');
    await assert.rejects(verifyUsageCatalog(connection), /USAGE_CATALOG_UNAVAILABLE/);
    assert.ok(!(await models.Presence.collection.indexes()).some(index => index.name === 'browserId_1'));
    await models.Presence.collection.createIndex({ browserId: 1 }, { unique: true, name: 'browserId_1' }); await verifyUsageCatalog(connection);
  });
  await t.test('actual configured business entrypoint connects, serves HTTP and shuts down cleanly', async childTest => {
    const f = await httpFixture(childTest, { fixtureMode: true, connection });
    const reservation = createServer(); reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
    const httpPort = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
    const inherited = Object.fromEntries(['PATH', 'SystemRoot', 'TEMP', 'TMP'].filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
    const child = spawn(process.execPath, ['services/usage/src/server.js'], { cwd: fileURLToPath(new URL('../../../', import.meta.url)), windowsHide: true,
      env: { ...inherited, NODE_ENV: 'test', HOST: '127.0.0.1', PORT: String(httpPort),
        USAGE_MONGODB_URI: `mongodb://127.0.0.1:${port}/vinlook_usage_poc_test?replicaSet=vinlook_usage_poc&directConnection=true`,
        IDENTITY_BASE_URL: f.config.authorization.baseUrl, USAGE_IDENTITY_SERVICE_KEY_B64URL: f.config.authorization.key,
        CONTENT_BASE_URL: f.config.contentOrigin, USAGE_ALLOWED_ORIGINS: f.config.origins.join(',') }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', errors = ''; child.stdout.on('data', chunk => { output = (output + chunk).slice(0, 4096); }); child.stderr.on('data', chunk => { errors = (errors + chunk).slice(0, 4096); });
    const exited = once(child, 'exit');
    childTest.after(async () => { if (child.exitCode === null && child.signalCode === null) { child.kill('SIGTERM'); await Promise.race([exited, delay(5000)]); if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); } });
    let live = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      try { const ready = await fetch(`http://127.0.0.1:${httpPort}/health/ready`, { signal: AbortSignal.timeout(500) }); live = ready.status === 200; await ready.arrayBuffer(); if (live) break; } catch { /* Only this test's child can be starting. */ }
      if (child.exitCode !== null) break; await delay(100);
    }
    assert.equal(live, true, 'Configured Usage entrypoint did not reach readiness');
    const response = await fetch(`http://127.0.0.1:${httpPort}/api/v1/listening/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    assert.equal(response.status, 200); await response.json(); assert.equal(await models.Listening.countDocuments({}), 1);
    child.kill('SIGTERM'); const [code, signal] = await exited; assert.equal(code, 0); assert.equal(signal, null);
    assert.equal(output.trim(), 'usage process listening'); assert.equal(errors, ''); await reset();
  });
  await t.test('real disconnected DB gives 503 and readiness false, never fabricated fresh summary', async child => {
    const f = await httpFixture(child, { fixtureMode: true, connection }); await connection.close();
    assert.equal(await f.runtime.ready(), false);
    const result = await f.request('/monitoring/summary', { method: 'GET', token: 'synthetic.header.signature' });
    assert.equal(result.status, 503); assert.equal(result.body.data, undefined);
  });
});
