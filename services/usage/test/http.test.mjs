import assert from 'node:assert/strict';
import { test } from 'node:test';
import { httpFixture, ids } from './fixtures/http-runtime.mjs';
const start = (browserId = ids.browserA, playbackId = ids.playbackA, poiId = ids.poiA, languageCode = 'en') => ({ browserId, playbackId, poiId, languageCode });
const monitor = { method: 'GET', token: 'synthetic.header.signature' };
const summary = async fixture => (await fixture.request('/monitoring/summary', monitor)).body.data;

test('real HTTP lifecycle/admission and fresh Identity authorization preserve distinct browser counts', async t => {
  const f = await httpFixture(t, { fixtureMode: true });
  assert.equal((await f.request('/listening/start', { value: start() })).status, 200);
  assert.equal((await f.request('/listening/start', { value: start(ids.browserA, ids.playbackB, ids.poiB, 'zh-Hant') })).status, 200);
  assert.equal((await f.request('/listening/start', { value: start(ids.browserB, ids.playbackC) })).status, 200);
  const data = await summary(f); assert.equal(data.onlineVisitors, 2); assert.equal(data.currentListeners, 2);
  assert.deepEqual(data.byPoi, [{ poiId: ids.poiA, currentListeners: 2 }, { poiId: ids.poiB, currentListeners: 1 }]);
  assert.ok(!JSON.stringify(data).includes(ids.browserA));
  assert.ok(f.calls.content.some(call => call.path.endsWith('?language=zh-Hant')));
  assert.ok(f.calls.content.every(call => !call.headers.authorization && !call.headers['x-vinlook-service-key']));
  assert.equal(f.calls.identity[0].headers['x-vinlook-service'], 'usage');
  assert.equal(f.calls.identity[0].headers['x-vinlook-service-key'], f.config.authorization.key);
});

test('HTTP boundary: strict90s, live heartbeat, end-before-start and delayed end do not resurrect', async t => {
  const f = await httpFixture(t, { fixtureMode: true }); await f.request('/listening/start', { value: start() });
  f.advance(90000); assert.equal((await summary(f)).currentListeners, 0);
  await f.request(`/listening/${ids.playbackA}/heartbeat`, { value: { browserId: ids.browserA } });
  assert.equal((await summary(f)).currentListeners, 1);
  await f.request(`/listening/${ids.playbackB}/end`, { value: { browserId: ids.browserA, reason: 'closed' } });
  const late = await f.request('/listening/start', { value: start(ids.browserA, ids.playbackB) });
  assert.notEqual(late.body.data.endedAt, null);
  assert.equal((await f.request(`/listening/${ids.playbackB}/heartbeat`, { value: { browserId: ids.browserA } })).status, 409);
  assert.equal((await f.request('/listening/start', { value: start(ids.browserB) })).body.error.code, 'PLAYBACK_CONFLICT');
  assert.equal((await f.request(`/listening/${ids.playbackC}/heartbeat`, { value: { browserId: ids.browserA } })).body.error.code, 'PLAYBACK_NOT_OPEN');
});

test('monitor denies missing/locked identity, accepts Staff/Manager with no work session, fails closed on Identity down', async t => {
  const f = await httpFixture(t, { fixtureMode: true });
  assert.equal((await f.request('/monitoring/summary', { method: 'GET' })).status, 401); assert.equal(f.calls.identity.length, 0);
  for (const role of ['Staff', 'Manager']) { f.modes.authority = role; assert.equal((await f.request('/monitoring/summary', monitor)).status, 200); }
  f.modes.authority = 'locked'; assert.equal((await f.request('/monitoring/summary', monitor)).status, 403);
  f.modes.authority = 'down'; const down = await f.request('/monitoring/summary', monitor);
  assert.equal(down.status, 503); assert.equal(down.body.error.code, 'AUTHORIZATION_UNAVAILABLE');
  assert.ok(!JSON.stringify(down.body).includes('synthetic-private')); assert.equal(f.calls.identity.length, 4);
});

test('strict bodies, byte/encoding limits, queries, methods and unknown routes return safe JSON', async t => {
  const f = await httpFixture(t, { fixtureMode: true });
  for (const extra of [{ ip: '127.0.0.1' }, { gps: [0, 0] }, { timestamp: 1 }, { role: 'Manager' }])
    assert.equal((await f.request('/listening/start', { value: { ...start(), ...extra } })).status, 422);
  assert.equal((await f.request('/listening/start', { raw: '{' })).body.error.code, 'MALFORMED_JSON');
  assert.equal((await f.request('/listening/start', { raw: JSON.stringify({ data: 'x'.repeat(1100) }) })).status, 413);
  assert.equal((await f.request('/listening/start', { value: start(), headers: { 'Content-Encoding': 'gzip' } })).status, 415);
  assert.equal((await f.request('/listening/start', { raw: '{}', headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await f.request('/listening/start', { value: { ...start(), languageCode: 'zh' } })).status, 422);
  assert.equal((await f.request('/presence/heartbeat?time=1', { value: { browserId: ids.browserA } })).status, 422);
  const method = await f.request('/listening/start', { method: 'GET' }); assert.equal(method.status, 405); assert.equal(method.headers.get('allow'), 'POST, OPTIONS');
  assert.equal((await f.request('/no-such-route', { method: 'GET' })).body.error.code, 'ROUTE_NOT_FOUND');
  assert.equal(f.calls.content.length, 0); assert.equal(f.store.inspect().playbacks.length, 0);
});

test('CORS uses exact origins, denies null/unknown, preflight performs no authorization or DB mutation', async t => {
  const f = await httpFixture(t, { fixtureMode: true });
  for (const origin of ['null', 'https://tourist.example.invalid.evil', 'http://tourist.example.invalid']) {
    const result = await f.request('/presence/heartbeat', { origin, value: { browserId: ids.browserA } });
    assert.equal(result.status, 403); assert.equal(result.headers.get('access-control-allow-origin'), null);
  }
  const preflight = await f.request('/monitoring/summary', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization,content-type' } });
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-credentials'), null);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://tourist.example.invalid');
  assert.equal(f.calls.identity.length, 0); assert.equal(f.store.calls.length, 0);
  const direct = await f.request('/presence/heartbeat', { origin: false, value: { browserId: ids.browserA } });
  assert.equal(direct.status, 200); assert.equal(direct.headers.get('cache-control'), 'no-store'); assert.ok(direct.headers.get('vary').includes('Origin'));
});

test('public Content missing, mismatched, malformed, redirected and oversize responses never create telemetry', async t => {
  for (const [mode, status] of [['missing', 404], ['wrong-id', 503], ['wrong-locale', 503], ['invalid', 503], ['redirect', 503], ['oversize', 503]]) {
    const f = await httpFixture(t, { fixtureMode: true }); f.modes.content = mode;
    const result = await f.request('/listening/start', { value: start() }); assert.equal(result.status, status);
    assert.equal(f.store.inspect().playbacks.length, 0); assert.equal(f.calls.content.length, 1);
    assert.equal(f.calls.identity.length, 0); assert.ok(!JSON.stringify(result.body).includes('synthetic-private'));
  }
});

test('browser/global/account rate windows count duplicates and invalid attempts before DB', async t => {
  const f = await httpFixture(t, { fixtureMode: true });
  for (let index = 0; index < 60; index++) assert.equal((await f.request('/presence/heartbeat', { value: { browserId: ids.browserA } })).status, 200);
  const browser = await f.request('/presence/heartbeat', { value: { browserId: ids.browserA } }); assert.equal(browser.status, 429); assert.match(browser.headers.get('retry-after'), /^\d+$/);
  f.advance(60000); assert.equal((await f.request('/presence/heartbeat', { value: { browserId: ids.browserA } })).status, 200);
  for (let index = 0; index < 12; index++) assert.equal((await f.request('/monitoring/jobs', monitor)).status, 200);
  assert.equal((await f.request('/monitoring/summary', monitor)).status, 429);
  const g = await httpFixture(t, { fixtureMode: true });
  for (let index = 0; index < 600; index++) assert.equal((await g.request('/presence/heartbeat', { value: { browserId: 'invalid' } })).status, 422);
  assert.equal((await g.request('/presence/heartbeat', { value: { browserId: 'invalid' } })).status, 429);
  assert.equal(g.store.calls.length, 0);
});

test('more than ten in-flight requests are refused with no queued work', async t => {
  const f = await httpFixture(t, { fixtureMode: true }); f.modes.content = 'delay';
  const pending = Array.from({ length: 10 }, () => f.request('/listening/start', { value: start() }));
  await f.waitForAdmission(10);
  assert.equal((await f.request('/presence/heartbeat', { value: { browserId: ids.browserB } })).status, 429);
  f.release(); assert.ok((await Promise.all(pending)).every(result => result.status === 200));
});

test('DB down never becomes summary zero; health and absent jobs bridge preserve explicit uncertainty', async t => {
  const f = await httpFixture(t, { fixtureMode: true }); await f.request('/listening/start', { value: start() });
  f.modes.down = true;
  const result = await f.request('/monitoring/summary', monitor); assert.equal(result.status, 503); assert.equal(result.body.data, undefined);
  const health = (await f.request('/monitoring/health', monitor)).body.data;
  assert.equal(health.components.find(row => row.name === 'usage').status, 'unavailable');
  assert.equal(health.components.find(row => row.name === 'worker').status, 'unknown');
  const jobs = (await f.request('/monitoring/jobs', monitor)).body.data; assert.equal(jobs.status, 'unknown'); assert.equal(jobs.counts, null);
});
