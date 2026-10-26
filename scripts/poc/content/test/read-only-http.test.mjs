import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { gzipSync } from 'node:zlib';
import { createReadOnlyContentAdapter, ContentReadFailure } from '../read-only-http.mjs';
import { ids, fixtureOrigin, envelope, makeSnapshot } from './fixtures.mjs';

// Synthetic token and loopback-only transport. The production adapter still requires HTTPS.
const token = 'synthetic.header.signature';
const job = () => ({ id: ids.job, poiId: ids.poi, revisionId: ids.revision, languageCode: 'zh-Hant',
  taskType: 'audio', status: 'queued', inputVersion: { sourceVersion: 1, textVersion: 1,
    targetTextVersion: 1, targetSourceVersion: 1 }, retryCount: 0, reclaimCount: 0,
  createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z', leaseExpiresAt: null, error: null });
const json = (res, body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
async function fixture(t, handler, config = {}) {
  const calls = [], server = createServer((req, res) => {
    calls.push({ method: req.method, path: req.url, headers: req.headers });
    handler(req, res);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  // This trusted injection maps the fixed synthetic HTTPS origin to our own fixture only.
  const fetchImpl = (url, init) => {
    const parsed = new URL(url); assert.equal(parsed.origin, fixtureOrigin);
    assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'manual');
    assert.equal(init.credentials, 'omit'); assert.equal(init.referrerPolicy, 'no-referrer');
    assert.equal(init.cache, 'no-store'); assert.equal(init.body, undefined);
    return fetch(`${origin}${parsed.pathname}${parsed.search}`, init);
  };
  const adapter = createReadOnlyContentAdapter({ origin: fixtureOrigin, accessToken: token, ...config }, { fetchImpl });
  t.after(async () => { adapter.close(); const closed = new Promise(resolve => server.close(resolve)); server.closeAllConnections(); await closed; });
  return { adapter, calls, origin };
}
const rejects = (promise, code, extras = {}) => assert.rejects(promise, error => {
  assert.ok(error instanceof ContentReadFailure); assert.equal(error.code, code);
  assert.equal(error.message, code); assert.equal(error.cause, undefined);
  for (const [key, value] of Object.entries(extras)) assert.equal(error[key], value);
  assert.ok(!JSON.stringify(error).includes('private-error-body'));
  return true;
});

test('only three fixed GET reads; exact IDs, query and safe job DTO remain bound', async t => {
  const snapshot = makeSnapshot({ approved: ['en', 'vi', 'zh-Hant'] });
  // Read-only inspection also accepts non-editable/deleted POIs without mutation authority.
  snapshot.data.workingRevision.status = 'in_review'; snapshot.data.poi.deletedAt = '2026-10-26T00:00:00.000Z';
  const { adapter, calls } = await fixture(t, (req, res) => json(res,
    req.url.includes('/pois/') ? snapshot : req.url.includes('?') ? envelope({ items: [job()] }) : envelope(job())));
  assert.deepEqual(Object.keys(adapter).sort(), ['close', 'listJobs', 'origin', 'readJob', 'readPoi']);
  assert.equal(calls.length, 0); assert.equal(JSON.stringify(adapter), JSON.stringify({ origin: fixtureOrigin }));
  assert.deepEqual(await adapter.readPoi(ids.poi), { status: 200, body: snapshot });
  assert.deepEqual((await adapter.readJob(ids.job)).body, envelope(job()));
  assert.deepEqual((await adapter.listJobs(ids.revision)).body, envelope({ items: [job()] }));
  assert.deepEqual(calls.map(call => call.path), [`/api/v1/admin/pois/${ids.poi}`, `/api/v1/admin/jobs/${ids.job}`, `/api/v1/admin/jobs?revisionId=${ids.revision}`]);
  for (const call of calls) {
    assert.equal(call.headers.authorization, `Bearer ${token}`); assert.equal(call.headers.accept, 'application/json');
    assert.equal(call.headers.cookie, undefined); assert.equal(call.headers.referer, undefined);
    assert.equal(call.headers['content-length'], undefined);
  }
  snapshot.data.publishedRevision = { ...snapshot.data.workingRevision, status: 'published' };
  snapshot.data.workingRevision = null;
  assert.equal((await adapter.readPoi(ids.poi)).body.data.publishedRevision.status, 'published');
  snapshot.data.publishedRevision = null; snapshot.data.localizedContents = [];
  assert.equal((await adapter.readPoi(ids.poi)).body.data.workingRevision, null);
});

test('invalid origins, credential/config/options and path IDs never invoke transport', async () => {
  let calls = 0;
  const injection = { fetchImpl: () => { calls++; throw Error('not reached'); } };
  const base = { origin: fixtureOrigin, accessToken: token };
  for (const change of [{ origin: 'http://content.example.invalid' }, { origin: fixtureOrigin + '/' },
    { origin: fixtureOrigin + '/api' }, { origin: 'https://u:p@content.example.invalid' }, { origin: fixtureOrigin + '?x=1' },
    { accessToken: token + '\r\nX: secret' }, { timeoutMs: 0 }, { timeoutMs: 15001 }, { maxJsonBytes: 0 }, { retry: 2 }]) {
    assert.throws(() => createReadOnlyContentAdapter({ ...base, ...change }, injection), { code: 'READ_CONFIG_INVALID' });
  }
  const adapter = createReadOnlyContentAdapter(base, injection);
  for (const value of ['../jobs', ids.poi + '?x=1', ids.poi + '/process', 'not-an-id', null]) await rejects(adapter.readPoi(value), 'READ_ID_INVALID');
  await rejects(adapter.readJob(ids.job, { method: 'POST' }), 'READ_OPTIONS_INVALID');
  await rejects(adapter.readJob(ids.job, { signal: {} }), 'READ_OPTIONS_INVALID');
  await rejects(adapter.readJob(ids.job, { signal: { aborted: false, addEventListener() {} } }), 'READ_OPTIONS_INVALID');
  await rejects(adapter.readJob(ids.job, { signal: AbortSignal.abort() }), 'READ_ABORTED');
  adapter.close(); await rejects(adapter.readJob(ids.job), 'READ_CLOSED'); assert.equal(calls, 0);
});

test('redirect never follows or forwards credentials to a second server', async t => {
  const target = await fixture(t, (_req, res) => json(res, envelope(job())));
  const source = await fixture(t, (_req, res) => { res.writeHead(302, { Location: target.origin + '/steal' }); res.end('private-error-body'); });
  await rejects(source.adapter.readJob(ids.job), 'READ_REDIRECT_BLOCKED');
  assert.equal(source.calls.length, 1); assert.equal(target.calls.length, 0);
});

test('HTTP failures are redacted, bounded Retry-After is metadata and no request retries', async t => {
  for (const [status, code] of [[401, 'READ_UNAUTHENTICATED'], [403, 'READ_DENIED'], [404, 'READ_NOT_FOUND'], [429, 'READ_RATE_LIMITED'], [503, 'READ_UNAVAILABLE'], [500, 'READ_UNAVAILABLE']]) {
    const { adapter, calls } = await fixture(t, (_req, res) => { res.writeHead(status, { 'Retry-After': '30' }); res.end('private-error-body ' + token); });
    await rejects(adapter.readJob(ids.job), code, { status: status === 500 ? null : status, retryAfterSeconds: status === 429 ? 30 : null });
    assert.equal(calls.length, 1);
  }
  for (const retry of ['3601', '2026-10-26', '-1', '1.5', '9999999999999999']) {
    const { adapter, calls } = await fixture(t, (_req, res) => { res.writeHead(429, { 'Retry-After': retry }); res.end(); });
    await rejects(adapter.readJob(ids.job), 'READ_RATE_LIMITED', { retryAfterSeconds: null }); assert.equal(calls.length, 1);
  }
});

test('whole-request deadline covers delayed headers and stalled streams; client stays reusable', async t => {
  for (const stream of [false, true]) {
    let started; const ready = new Promise(resolve => { started = resolve; });
    const { adapter, calls } = await fixture(t, (_req, res) => {
      if (calls.length > 1) return json(res, envelope(job()));
      if (stream) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.write('{'); }
      started();
    }, { timeoutMs: 250 });
    const pending = adapter.readJob(ids.job); await ready;
    await rejects(pending, 'READ_TIMEOUT'); assert.equal(calls.length, 1);
    assert.equal((await adapter.readJob(ids.job)).status, 200); assert.equal(calls.length, 2);
  }
});

test('caller cancellation, close and single-flight block terminate without retry', async t => {
  for (const close of [false, true]) {
    let started; const ready = new Promise(resolve => { started = resolve; });
    const { adapter, calls } = await fixture(t, (_req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.write('{'); started(); });
    const abort = new AbortController(), pending = adapter.readJob(ids.job, { signal: abort.signal }); await ready;
    await rejects(adapter.readPoi(ids.poi), 'READ_BUSY');
    if (close) adapter.close(); else abort.abort();
    await rejects(pending, 'READ_ABORTED'); assert.equal(calls.length, 1);
    if (close) await rejects(adapter.readJob(ids.job), 'READ_CLOSED');
  }
});

test('byte bounds cover declared, chunked and decompressed bodies; reject invalid JSON/UTF-8', async t => {
  const cases = [
    [res => { res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': '513' }); res.flushHeaders(); }, 'READ_RESPONSE_TOO_LARGE'],
    [res => { res.setHeader('Content-Type', 'application/json'); res.write('x'.repeat(300)); res.end('x'.repeat(300)); }, 'READ_RESPONSE_TOO_LARGE'],
    [res => { const compressed = gzipSync('x'.repeat(600)); res.writeHead(200, { 'Content-Type': 'application/json',
      'Content-Encoding': 'gzip', 'Content-Length': String(compressed.length) }); res.end(compressed); }, 'READ_RESPONSE_TOO_LARGE'],
    [res => { res.setHeader('Content-Type', 'text/html'); res.end('private-error-body'); }, 'READ_RESPONSE_INVALID'],
    [res => { res.setHeader('Content-Type', 'application/json'); res.end('{'); }, 'READ_RESPONSE_INVALID'],
    [res => { res.setHeader('Content-Type', 'application/json'); res.end(Buffer.from([0xff])); }, 'READ_RESPONSE_INVALID'],
  ];
  for (const [handler, code] of cases) {
    const { adapter, calls } = await fixture(t, (_req, res) => handler(res), { maxJsonBytes: 512 });
    await rejects(adapter.readJob(ids.job), code); assert.equal(calls.length, 1);
  }
});

test('malformed, mismatched or internal job fields fail before data is returned', async t => {
  for (const [change, code] of [
    [body => { body.requestId = 'bad'; }, 'READ_RESPONSE_INVALID'],
    [body => { body.data.id = ids.otherJob; }, 'READ_IDENTITY_MISMATCH'],
    [body => { body.data.languageCode = 'zh'; }, 'READ_RESPONSE_INVALID'],
    [body => { body.data.inputVersion.sourceVersion = 0; }, 'READ_RESPONSE_INVALID'],
    [body => { body.data.inputSnapshot = { text: 'private-error-body' }; }, 'READ_RESPONSE_INVALID'],
    [body => { body.data.error = 'private-error-body'; }, 'READ_RESPONSE_INVALID'],
  ]) {
    const body = envelope(job()); change(body);
    const { adapter } = await fixture(t, (_req, res) => json(res, body)); await rejects(adapter.readJob(ids.job), code);
  }
});

test('POI revision/locale identity and complete sorted job list are enforced', async t => {
  for (const [change, code] of [
    [body => { body.data.poi.id = ids.otherJob; }, 'READ_IDENTITY_MISMATCH'],
    [body => { body.data.workingRevision.poiId = ids.otherJob; }, 'READ_IDENTITY_MISMATCH'],
    [body => { body.data.localizedContents[0].revisionId = ids.otherJob; }, 'READ_IDENTITY_MISMATCH'],
    [body => { body.data.localizedContents.push(body.data.localizedContents[0]); }, 'READ_RESPONSE_INVALID'],
  ]) {
    const body = makeSnapshot(); change(body);
    const { adapter } = await fixture(t, (_req, res) => json(res, body)); await rejects(adapter.readPoi(ids.poi), code);
  }
  for (const [items, code] of [
    [[{ ...job(), revisionId: ids.otherJob }], 'READ_IDENTITY_MISMATCH'],
    [[job(), job()], 'READ_RESPONSE_INVALID'],
    [[{ ...job(), id: ids.otherJob }, job()], 'READ_RESPONSE_INVALID'],
    [Array.from({ length: 1001 }, job), 'READ_RESPONSE_INVALID'],
  ]) {
    const { adapter } = await fixture(t, (_req, res) => json(res, envelope({ items }))); await rejects(adapter.listJobs(ids.revision), code);
  }
  const { adapter } = await fixture(t, (_req, res) => json(res, envelope({ items: [] })));
  assert.deepEqual((await adapter.listJobs(ids.revision)).body.data.items, []);
});

test('raw transport errors never escape and ignored abort cannot extend deadline', async () => {
  const base = { origin: fixtureOrigin, accessToken: token, timeoutMs: 20 };
  const adapter = createReadOnlyContentAdapter(base, { fetchImpl: () => { throw Error('private-error-body ' + token); } });
  await rejects(adapter.readJob(ids.job), 'READ_UNAVAILABLE'); adapter.close();
  const uncooperative = createReadOnlyContentAdapter(base, { fetchImpl: () => new Promise(() => {}) });
  await rejects(uncooperative.readJob(ids.job), 'READ_TIMEOUT'); uncooperative.close();
});
