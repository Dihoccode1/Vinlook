import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createUsageFixture, staleSummaryFixture, FIXTURE_IDS as ids, FIXTURE_EPOCH } from './fixtures/poc-usage.mjs';

function setup() {
  let time = FIXTURE_EPOCH, available = true;
  const api = createUsageFixture({ fixtureMode: true, now: () => time,
    publicPois: new Map([[ids.poiA, ['en', 'vi']], [ids.poiB, ['en']]]), available: () => available });
  return { api, advance: ms => { time += ms; }, unavailable: () => { available = false; }, summary: () => api.summary('fixture-staff') };
}

test('fixture requires explicit opt-in', () => {
  assert.throws(() => createUsageFixture(), /Explicit fixture/);
});

test('same-origin tabs sharing one browser ID count once; distinct IDs count separately without IP', () => {
  const { api, summary } = setup();
  api.presence(ids.browserA); api.presence(ids.browserA);
  assert.equal(summary().onlineVisitors, 1);
  api.presence(ids.browserB);
  assert.equal(summary().onlineVisitors, 2);
  assert.throws(() => api.presence('192.0.2.1'), { code: 'INVALID_INPUT' });
  // Storage coordination itself is Hạo's real browser test; this exercises shared identity input.
});

test('Play counts immediately, Pause/Resume keep ID via heartbeat, end removes listening only', () => {
  const { api, advance, summary } = setup();
  api.start(ids.browserA, ids.playbackA, ids.poiA, 'en');
  assert.equal(summary().currentListeners, 1);
  for (let i = 0; i < 4; i++) { advance(30000); api.heartbeat(ids.browserA, ids.playbackA); }
  assert.equal(summary().currentListeners, 1); // Paused playback uses exactly the same heartbeat.
  api.end(ids.browserA, ids.playbackA, 'completed');
  assert.equal(summary().currentListeners, 0);
  assert.equal(summary().onlineVisitors, 1);
});

test('same browser in multiple POIs: per-POI sum can exceed global; same-POI tabs do not duplicate', () => {
  const { api, summary } = setup();
  api.start(ids.browserA, ids.playbackA, ids.poiA, 'en');
  api.start(ids.browserA, ids.playbackB, ids.poiB, 'en');
  api.start(ids.browserA, ids.playbackC, ids.poiA, 'vi');
  const value = summary();
  assert.equal(value.currentListeners, 1);
  assert.deepEqual(value.byPoi, [{ poiId: ids.poiA, currentListeners: 1 }, { poiId: ids.poiB, currentListeners: 1 }]);
  assert.ok(value.byPoi.reduce((sum, row) => sum + row.currentListeners, 0) > value.currentListeners);
  api.end(ids.browserA, ids.playbackA, 'closed');
  assert.equal(summary().byPoi[0].currentListeners, 1);
});

test('90s boundary excludes stale entries even without cleanup; live heartbeat can resume an open paused playback', () => {
  const { api, advance, summary } = setup();
  api.start(ids.browserA, ids.playbackA, ids.poiA, 'en');
  advance(89999); assert.equal(summary().currentListeners, 1);
  advance(1); assert.deepEqual([summary().onlineVisitors, summary().currentListeners], [0, 0]);
  api.heartbeat(ids.browserA, ids.playbackA);
  assert.deepEqual([summary().onlineVisitors, summary().currentListeners], [1, 1]);
});

test('fresh presence alone does not refresh stale listening; duplicate start is not a heartbeat', () => {
  const { api, advance, summary } = setup();
  const start = api.start(ids.browserA, ids.playbackA, ids.poiA, 'en');
  advance(90000); api.presence(ids.browserA);
  assert.deepEqual(api.start(ids.browserA, ids.playbackA, ids.poiA, 'en'), start);
  assert.deepEqual([summary().onlineVisitors, summary().currentListeners], [1, 0]);
});

test('end-before-start stays terminal, duplicate end is stable, late heartbeat cannot revive', () => {
  const { api, advance, summary } = setup();
  const end = api.end(ids.browserA, ids.playbackA, 'page_closed');
  advance(1000);
  assert.equal(api.start(ids.browserA, ids.playbackA, ids.poiA, 'en').endedAt, end.endedAt);
  assert.deepEqual(api.end(ids.browserA, ids.playbackA, 'completed'), end);
  assert.throws(() => api.heartbeat(ids.browserA, ids.playbackA), { code: 'PLAYBACK_NOT_OPEN', status: 409 });
  assert.equal(summary().currentListeners, 0);
});

test('all arrival permutations of duplicate start/end for one playback are terminal', () => {
  for (const events of ['ssee', 'sese', 'sees', 'esse', 'eses', 'eess']) {
    const { api, summary } = setup();
    for (const event of events) {
      if (event === 's') api.start(ids.browserA, ids.playbackA, ids.poiA, 'en');
      else api.end(ids.browserA, ids.playbackA, 'replaced');
    }
    assert.equal(summary().currentListeners, 0, events);
  }
});

test('delayed end for A does not affect B, and cross-browser/payload reuse conflicts', () => {
  const { api, summary } = setup();
  api.start(ids.browserA, ids.playbackA, ids.poiA, 'en');
  api.end(ids.browserA, ids.playbackA, 'replaced');
  api.start(ids.browserA, ids.playbackB, ids.poiB, 'en');
  api.end(ids.browserA, ids.playbackA, 'page_closed');
  assert.deepEqual(summary().byPoi, [{ poiId: ids.poiB, currentListeners: 1 }]);
  assert.throws(() => api.start(ids.browserA, ids.playbackB, ids.poiA, 'en'), { code: 'PLAYBACK_CONFLICT' });
  for (const op of [() => api.start(ids.browserB, ids.playbackB, ids.poiB, 'en'),
    () => api.heartbeat(ids.browserB, ids.playbackB), () => api.end(ids.browserB, ids.playbackB, 'closed')]) {
    assert.throws(op, { code: 'PLAYBACK_CONFLICT', status: 409 });
  }
});

test('invalid IDs/locales/reasons, missing public POI and unknown heartbeat cannot create counts', () => {
  const { api, summary } = setup();
  assert.throws(() => api.start(ids.browserA, ids.playbackA, ids.poiA, 'zh-TW'), { code: 'INVALID_INPUT' });
  assert.throws(() => api.start(ids.browserA, ids.playbackA, '000000000000000000000099', 'en'), { code: 'POI_NOT_AVAILABLE' });
  assert.throws(() => api.start(ids.browserA, ids.playbackA, ids.poiB, 'vi'), { code: 'POI_NOT_AVAILABLE' });
  assert.throws(() => api.heartbeat(ids.browserA, ids.playbackA), { code: 'PLAYBACK_NOT_OPEN' });
  assert.throws(() => api.end(ids.browserA, ids.playbackA, 'paused'), { code: 'INVALID_INPUT' });
  assert.equal(summary().onlineVisitors, 0);
});

test('monitor fixture denies missing/locked authority, accepts Staff/Manager without session input', () => {
  const { api } = setup();
  assert.throws(() => api.summary(), { status: 401 });
  assert.throws(() => api.summary('fixture-locked'), { status: 403 });
  assert.deepEqual(api.summary('fixture-staff'), api.summary('fixture-manager'));
});

test('dependency failure preserves last-known counts/time in stale UI fixture instead of fresh zeros', () => {
  const { api, summary, advance, unavailable } = setup();
  api.start(ids.browserA, ids.playbackA, ids.poiA, 'en');
  const lastKnown = summary();
  advance(30000); unavailable();
  assert.throws(summary, { code: 'USAGE_UNAVAILABLE', status: 503 });
  const state = staleSummaryFixture(lastKnown, new Date(FIXTURE_EPOCH + 30000).toISOString());
  assert.equal(state.data, lastKnown);
  assert.equal(state.data.currentListeners, 1);
  assert.equal(state.data.asOf, new Date(FIXTURE_EPOCH).toISOString());
  assert.equal(state.stale, true);
});

test('all 16 exact registry locales can be represented and summary exposes only safe integer counts', () => {
  const registry = JSON.parse(readFileSync(new URL('../../content/src/adapters/hybrid-v1.json', import.meta.url), 'utf8'));
  const codes = Object.keys(registry.profiles);
  assert.equal(codes.length, 16);
  const api = createUsageFixture({ fixtureMode: true, now: () => FIXTURE_EPOCH, publicPois: new Map([[ids.poiA, codes]]) });
  codes.forEach((code, index) => api.start(ids.browserA, `00000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`, ids.poiA, code));
  const value = api.summary('fixture-staff');
  assert.equal(value.currentListeners, 1);
  assert.ok([value.onlineVisitors, value.currentListeners, ...value.byPoi.map(row => row.currentListeners)].every(n => Number.isSafeInteger(n) && n >= 0));
  assert.doesNotMatch(JSON.stringify(value), /browserId|playbackId|latitude|longitude|ipAddress|accessToken/);
});
