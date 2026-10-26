import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createUsageService, countUsage, UsageDomainFailure } from '../src/domain.js';
import { createTransactionFixture } from './fixtures/transaction-store.mjs';
import { createUsageFixture, FIXTURE_IDS as id, FIXTURE_EPOCH as epoch } from './fixtures/poc-usage.mjs';

const locales = Object.keys(JSON.parse(readFileSync(new URL('../../content/src/adapters/hybrid-v1.json', import.meta.url), 'utf8')).profiles);
const start = (browserId = id.browserA, playbackId = id.playbackA, poiId = id.poiA, languageCode = 'en') => ({ browserId, playbackId, poiId, languageCode });
function setup({ admission = async () => true, ...storeOptions } = {}) {
  let time = epoch; const admissions = [];
  const store = createTransactionFixture({ fixtureMode: true, ...storeOptions });
  const service = createUsageService({ store, languageCodes: locales, now: () => time,
    verifyPublicPoi: async selection => { admissions.push(selection); return admission(selection); } });
  return { service, store, admissions, setTime(value) { time = value; }, advance(delta) { time += delta; }, now: () => time };
}
const rejects = (promise, code) => assert.rejects(promise, error => {
  assert.ok(error instanceof UsageDomainFailure); assert.equal(error.code, code); assert.equal(error.message, code);
  assert.equal(error.cause, undefined); assert.ok(!JSON.stringify(error).includes('synthetic-private'));
  return true;
});
const totals = value => ({ online: value.onlineVisitors, listeners: value.currentListeners, byPoi: value.byPoi });

test('same browser across tabs counts once; separate browser IDs count separately without IP', async () => {
  const { service, store } = setup();
  await service.start(start()); await service.start(start(id.browserA, id.playbackB));
  assert.deepEqual(totals(await service.summary()), { online: 1, listeners: 1, byPoi: [{ poiId: id.poiA, currentListeners: 1 }] });
  await service.start(start(id.browserB, id.playbackC));
  assert.deepEqual(totals(await service.summary()), { online: 2, listeners: 2, byPoi: [{ poiId: id.poiA, currentListeners: 2 }] });
  assert.ok(!JSON.stringify(store.inspect()).includes('ip'));
});

test('one browser at two POIs: per-POI sum exceeds global, with stable sorted IDs', async () => {
  const { service } = setup(); await service.start(start(id.browserA, id.playbackA, id.poiB));
  await service.start(start(id.browserA, id.playbackB, id.poiA));
  assert.deepEqual(totals(await service.summary()), { online: 1, listeners: 1,
    byPoi: [{ poiId: id.poiA, currentListeners: 1 }, { poiId: id.poiB, currentListeners: 1 }] });
});

test('Play counts immediately; paused/resumed playback keeps the ID using a live heartbeat', async () => {
  const { service, store, advance } = setup(); await service.start(start()); advance(89999);
  assert.equal((await service.summary()).currentListeners, 1);
  await service.heartbeat({ browserId: id.browserA, playbackId: id.playbackA }); advance(30000);
  assert.equal((await service.summary()).currentListeners, 1); assert.equal(store.inspect().playbacks.length, 1);
  assert.equal(store.inspect().playbacks[0].startedAt, epoch);
});

test('exactly 90s expires both presence and listening; fresh presence alone does not revive audio', async () => {
  const { service, advance } = setup(); await service.start(start()); advance(90000);
  assert.deepEqual(totals(await service.summary()), { online: 0, listeners: 0, byPoi: [] });
  await service.presence({ browserId: id.browserA });
  assert.deepEqual(totals(await service.summary()), { online: 1, listeners: 0, byPoi: [] });
  await service.heartbeat({ browserId: id.browserA, playbackId: id.playbackA });
  assert.equal((await service.summary()).currentListeners, 1);
});

test('duplicate start preserves timestamps/freshness and avoids repeated Content admission', async () => {
  const { service, store, admissions, advance } = setup(); const first = await service.start(start()); advance(90000);
  assert.deepEqual(await service.start(start()), first); assert.equal(admissions.length, 1);
  assert.equal(store.inspect().presences[0].lastSeenAt, epoch);
  assert.equal((await service.summary()).currentListeners, 0);
});

test('end-before-start remains terminal in the transaction model even when Content is down', async () => {
  const { service, store, admissions, advance } = setup({ admission: async () => { throw Error('synthetic-private-provider-error'); } });
  const end = await service.end({ browserId: id.browserA, playbackId: id.playbackA, reason: 'page_closed' }); advance(30000);
  assert.deepEqual(await service.start(start()), { playbackId: id.playbackA, acceptedAt: end.endedAt, endedAt: end.endedAt });
  await rejects(service.heartbeat({ browserId: id.browserA, playbackId: id.playbackA }), 'PLAYBACK_NOT_OPEN');
  assert.equal(admissions.length, 0); assert.equal(store.inspect().playbacks[0].poiId, null);
  assert.equal(store.inspect().presences.length, 0); assert.equal((await service.summary()).currentListeners, 0);
});

test('repeated end preserves the first reason/time; delayed end(A) leaves replacement(B) alive', async () => {
  const { service, store, advance } = setup(); await service.start(start());
  await service.start(start(id.browserA, id.playbackB));
  const first = await service.end({ browserId: id.browserA, playbackId: id.playbackA, reason: 'replaced' }); advance(30000);
  assert.deepEqual(await service.end({ browserId: id.browserA, playbackId: id.playbackA, reason: 'completed' }), first);
  assert.equal(store.inspect().playbacks.find(row => row.playbackId === id.playbackA).endReason, 'replaced');
  assert.equal((await service.summary()).currentListeners, 1);
  for (const reason of ['completed', 'closed', 'page_closed', 'replaced']) {
    const item = setup(); await item.service.start(start()); await item.service.end({ browserId: id.browserA, playbackId: id.playbackA, reason });
    assert.equal((await item.service.summary()).currentListeners, 0);
  }
});

test('identity/POI/locale reuse conflicts and unknown heartbeats never create or refresh a record', async () => {
  const { service, store, advance } = setup(); await service.start(start()); advance(1000);
  for (const other of [start(id.browserB), start(id.browserA, id.playbackA, id.poiB), start(id.browserA, id.playbackA, id.poiA, 'vi')]) await rejects(service.start(other), 'PLAYBACK_CONFLICT');
  await rejects(service.heartbeat({ browserId: id.browserB, playbackId: id.playbackA }), 'PLAYBACK_CONFLICT');
  await rejects(service.end({ browserId: id.browserB, playbackId: id.playbackA, reason: 'closed' }), 'PLAYBACK_CONFLICT');
  await rejects(service.heartbeat({ browserId: id.browserA, playbackId: id.playbackB }), 'PLAYBACK_NOT_OPEN');
  assert.equal(store.inspect().playbacks.length, 1); assert.equal(store.inspect().presences[0].lastSeenAt, epoch);
});

test('public admission fails closed; selection is captured before await; all exact locales work', async () => {
  for (const [admission, code] of [[async () => false, 'POI_NOT_AVAILABLE'], [async () => undefined, 'PUBLIC_CONTENT_UNAVAILABLE'],
    [async () => { throw Error('synthetic-private-content-error'); }, 'PUBLIC_CONTENT_UNAVAILABLE']]) {
    const { service, store } = setup({ admission }); await rejects(service.start(start()), code); assert.equal(store.inspect().playbacks.length, 0);
  }
  let release, entered; const waiting = new Promise(resolve => { entered = resolve; });
  const { service, admissions } = setup({ admission: async () => { entered(); await new Promise(resolve => { release = resolve; }); return true; } });
  const input = start(id.browserA, id.playbackA, id.poiA, 'zh-Hant'), pending = service.start(input);
  await waiting; input.languageCode = 'vi'; release(); await pending;
  assert.equal(admissions[0].languageCode, 'zh-Hant'); assert.equal(Object.isFrozen(admissions[0]), true);
  for (const locale of locales) { const item = setup(); await item.service.start(start(id.browserA, id.playbackA, id.poiA, locale)); assert.equal((await item.service.summary()).currentListeners, 1); }
});

test('concurrent duplicate starts commit one playback; conflicting owners get one winner', async () => {
  const { service, store } = setup(); const results = await Promise.all(Array.from({ length: 40 }, () => service.start(start())));
  assert.ok(results.every(result => result.acceptedAt === epoch)); assert.equal(store.inspect().playbacks.length, 1);
  const item = setup(); const race = await Promise.allSettled([item.service.start(start()), item.service.start(start(id.browserB))]);
  assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(race.find(result => result.status === 'rejected').reason.code, 'PLAYBACK_CONFLICT');
  assert.equal(item.store.inspect().playbacks.length, 1);
});

test('end wins while start waits for admission; later work cannot replace its tombstone', async () => {
  let release, entered; const waiting = new Promise(resolve => { entered = resolve; });
  const item = setup({ admission: async () => { entered(); await new Promise(resolve => { release = resolve; }); return true; } });
  const pending = item.service.start(start()); await waiting;
  const ended = await item.service.end({ browserId: id.browserA, playbackId: id.playbackA, reason: 'closed' });
  item.advance(1000); release(); const result = await pending;
  assert.equal(result.endedAt, ended.endedAt); assert.equal(item.store.inspect().presences.length, 0);
  assert.equal(item.store.inspect().playbacks[0].startedAt, null);
});

test('transaction failure rolls back playback and presence together and never returns a fresh zero', async () => {
  for (const operation of ['begin', 'getPlayback', 'insertPlayback', 'touchPresence', 'commit']) {
    const { service, store } = setup({ failAt: name => name === operation });
    await rejects(service.start(start()), 'USAGE_UNAVAILABLE');
    assert.deepEqual(store.inspect(), { presences: [], playbacks: [] });
  }
  const item = setup({ failAt: name => name === 'snapshot' }); await item.service.start(start());
  await rejects(item.service.summary(), 'USAGE_UNAVAILABLE'); assert.equal(item.store.inspect().playbacks.length, 1);
});

test('recreating the service over the same store preserves terminal identity; no cleanup or TTL operation exists', async () => {
  const { service, store, now } = setup(); await service.end({ browserId: id.browserA, playbackId: id.playbackA, reason: 'closed' });
  const restarted = createUsageService({ store, languageCodes: locales, now, verifyPublicPoi: async () => { throw Error('must not run'); } });
  assert.notEqual((await restarted.start(start())).endedAt, null);
  assert.ok(store.calls.every(operation => !/delete|purge|ttl/i.test(operation)));
});

test('lost commit acknowledgement returns an error; an explicit duplicate start preserves committed timestamps', async () => {
  let commits = 0;
  const { service, store, advance, admissions } = setup({ failAt: operation => operation === 'afterCommit' && ++commits === 2 });
  await rejects(service.start(start()), 'USAGE_UNAVAILABLE');
  assert.equal(store.inspect().playbacks.length, 1); advance(90000);
  assert.equal((await service.start(start())).acceptedAt, epoch); assert.equal(admissions.length, 1);
  assert.equal(store.inspect().playbacks[0].lastSeenAt, epoch);
  assert.equal((await service.summary()).currentListeners, 0);
});

test('malformed snapshot/duplicate IDs/future clocks fail rather than returning partial counts', async () => {
  const item = setup(); await item.service.start(start()); const snapshot = item.store.inspect();
  for (const change of [value => { value.presences.push(value.presences[0]); }, value => { value.playbacks.push(value.playbacks[0]); },
    value => { value.playbacks[0].endedAt = epoch; }, value => { value.playbacks[0].lastSeenAt = epoch + 1; },
    value => { value.playbacks[0].languageCode = 'zh'; }, value => { value.presences[0].ip = 'synthetic-private'; }]) {
    const changed = structuredClone(snapshot); change(changed);
    assert.throws(() => countUsage(changed, epoch, locales), { code: 'USAGE_UNAVAILABLE' });
  }
  item.setTime(epoch - 1); await rejects(item.service.summary(), 'USAGE_UNAVAILABLE');
  await rejects(item.service.heartbeat({ browserId: id.browserA, playbackId: id.playbackA }), 'USAGE_UNAVAILABLE');
});

test('unknown input fields, client clocks, IP/GPS, locale aliases and malformed IDs never reach storage', async () => {
  const { service, store } = setup();
  for (const change of [{ languageCode: 'zh' }, { browserId: 'bad' }, { playbackId: id.playbackA.toUpperCase() + 'x' },
    { poiId: '../pois' }, { timestamp: epoch }, { ip: '127.0.0.1' }, { gps: [0, 0] }]) await rejects(service.start({ ...start(), ...change }), 'INVALID_INPUT');
  await rejects(service.presence({ browserId: id.browserA, role: 'Manager' }), 'INVALID_INPUT');
  await rejects(service.end({ browserId: id.browserA, playbackId: id.playbackA, reason: 'pause' }), 'INVALID_INPUT');
  assert.deepEqual(store.calls, []);
});

test('deterministic lifecycle histories match the independent existing semantic oracle', async () => {
  const item = setup(), oracle = createUsageFixture({ fixtureMode: true, now: item.now,
    publicPois: new Map([[id.poiA, locales], [id.poiB, locales]]) });
  const browsers = [id.browserA, id.browserB], playbacks = [id.playbackA, id.playbackB, id.playbackC], pois = [id.poiA, id.poiB];
  let state = 371;
  const random = max => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % max; };
  for (let index = 0; index < 600; index++) {
    const browserId = browsers[random(2)], playbackId = playbacks[random(3)], poiId = pois[random(2)], languageCode = locales[random(16)], operation = random(5);
    item.advance(random(100001));
    let actual, expected;
    try {
      if (operation === 0) expected = oracle.presence(browserId);
      else if (operation === 1) expected = oracle.start(browserId, playbackId, poiId, languageCode);
      else if (operation === 2) expected = oracle.heartbeat(browserId, playbackId);
      else if (operation === 3) expected = oracle.end(browserId, playbackId, 'closed');
    } catch (error) { expected = { code: error.code }; }
    try {
      if (operation === 0) actual = await item.service.presence({ browserId });
      else if (operation === 1) actual = await item.service.start({ browserId, playbackId, poiId, languageCode });
      else if (operation === 2) actual = await item.service.heartbeat({ browserId, playbackId });
      else if (operation === 3) actual = await item.service.end({ browserId, playbackId, reason: 'closed' });
    } catch (error) { actual = { code: error.code }; }
    assert.equal(actual?.code, expected?.code);
    assert.deepEqual(totals(await item.service.summary()), totals(oracle.summary('fixture-staff')));
  }
});
