import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { randomBytes, randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createIdentityModels } from '../src/models/index.js';
import { createAuthRuntime } from '../src/auth/runtime.js';
import { loadAuthConfig } from '../src/auth/config.js';
import { issueToken } from '../src/auth/token.js';
import { loadServiceCredentials } from '../src/authorization.js';
import { createApp } from '../src/app.js';
import { encodeHistoryCursor, decodeHistoryCursor, ingestAudit } from '../src/audit-history.js';

const key = () => randomBytes(32).toString('base64url');
const credentials = { IDENTITY_CONTENT_SERVICE_KEY_B64URL: key(), IDENTITY_USAGE_SERVICE_KEY_B64URL: key() };
let clock = Date.parse('2026-10-23T12:00:00.000Z');
let connection, models, config, runtime, server, base, staff, other, manager, token, otherToken, managerToken, session, event, receivedAt;
async function account(email, role = 'Staff') {
  return models.StaffAccount.create({ fullName: 'Audit Fixture', email, role, status: 'active', authVersion: 0, passwordHash: `$2b$12$${'A'.repeat(53)}` });
}
async function get(path, accessToken = token, extra = {}) {
  const r = await fetch(`${base}/api/v1/${path}`, { headers: { Authorization: `Bearer ${accessToken}`, ...extra } });
  const body = await r.json(); assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(body.requestId ?? body.error.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(JSON.stringify(body).includes('passwordHash'), false);
  return { status: r.status, body };
}
async function post(payload = event, service = 'content', serviceKey = credentials.IDENTITY_CONTENT_SERVICE_KEY_B64URL, extra = {}) {
  const r = await fetch(`${base}/api/v1/internal/audit-events`, { method: 'POST', headers: {
    'Content-Type': 'application/json', 'X-Vinlook-Service': service, 'X-Vinlook-Service-Key': serviceKey, ...extra },
  body: typeof payload === 'string' ? payload : JSON.stringify(payload) });
  const body = await r.json(); assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(body.requestId ?? body.error.requestId, /^[0-9a-f-]{36}$/);
  return { status: r.status, body };
}
before(async () => {
  const name = process.env.VINLOOK_TEST_MONGO_CONTAINER;
  assert.match(name ?? '', /^vinlook-task008-mongo-[A-Za-z0-9_-]+$/);
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }));
  assert.equal(container.Config.Labels['vinlook.task'], 'TASK-008');
  assert.equal(container.Config.Image, 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');
  const [binding] = container.NetworkSettings.Ports['27017/tcp'];
  assert.equal(binding.HostIp, '127.0.0.1'); assert.match(binding.HostPort, /^[0-9]+$/);
  const uri = `mongodb://127.0.0.1:${binding.HostPort}/vinlook_identity_task008?replicaSet=vinlook_task008&directConnection=true`;
  config = loadAuthConfig('test', { IDENTITY_MONGODB_URI: uri, IDENTITY_JWT_KEY_B64URL: key(), IDENTITY_RATE_HMAC_KEY_B64URL: key(), IDENTITY_ALLOWED_ORIGINS: 'https://test.example.invalid' });
  connection = await mongoose.createConnection(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 3000 }).asPromise();
  assert.equal((await connection.db.listCollections().toArray()).length, 0);
  assert.equal((await connection.db.admin().command({ hello: 1 })).setName, 'vinlook_task008');
  models = createIdentityModels(connection);
  for (const model of Object.values(models)) { await model.createCollection(); await model.createIndexes(); }
  runtime = { ...await createAuthRuntime(models, config, () => clock), callers: loadServiceCredentials(config, credentials, clock) };
  server = createApp(runtime).listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}`;
  staff = await account('staff@example.invalid'); other = await account('other@example.invalid'); manager = await account('manager@example.invalid', 'Manager');
  [token, otherToken, managerToken] = await Promise.all([staff, other, manager].map(value => issueToken(value, config, clock)));
  session = await models.WorkSession.create({ staffId: staff._id, workDateVN: '2026-10-22', status: 'closed', openedAt: new Date('2026-10-22T03:00:00Z'), closedAt: new Date('2026-10-22T04:00:00Z') });
  event = { eventId: randomUUID(), actorId: String(staff._id), workSessionId: String(session._id), poiId: String(new mongoose.Types.ObjectId()),
    action: 'job.complete', occurredAt: '2026-10-22T05:00:00.000Z', result: { status: 'succeeded', errorCode: null } };
});
after(async () => { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } if (connection) await connection.close(); });

test('only authenticated Content can ingest; strict payload/action/result/ref/timestamp and bounded body', async () => {
  for (const [caller, credential] of [['usage', credentials.IDENTITY_USAGE_SERVICE_KEY_B64URL], ['worker', key()], ['content', key()]]) {
    assert.equal((await post(event, caller, credential)).status, 401);
  }
  assert.equal((await post(event, 'content', credentials.IDENTITY_CONTENT_SERVICE_KEY_B64URL, { Origin: 'https://test.example.invalid' })).status, 401);
  for (const patch of [{ actorType: 'operator' }, { receivedAt: new Date(clock).toISOString() }, { action: 'work_session.close' },
    { actorId: String(other._id) }, { workSessionId: String(new mongoose.Types.ObjectId()) },
    { occurredAt: '2026-10-22T02:00:00.000Z' }, { occurredAt: '2026-10-24T00:00:00.000Z' },
    { result: { status: 'failed', errorCode: 'raw-provider-secret' } }, { result: { status: 'succeeded', errorCode: 'CONFLICT' } }]) {
    assert.equal((await post({ ...event, ...patch })).status, 422);
  }
  assert.equal((await post('{')).status, 400);
  assert.equal((await post({ x: 'x'.repeat(17000) })).status, 413);
  assert.equal(await models.AuditLog.countDocuments({}), 0);
});

test('delayed event after closed session/actor lock is retained; exact replay keeps receipt; conflict never overwrites', async () => {
  await models.StaffAccount.updateOne({ _id: staff._id }, { $set: { status: 'locked' } });
  const first = await post(); assert.equal(first.status, 201); receivedAt = first.body.data.receivedAt;
  clock += 1000;
  const replay = await post({ ...event, actorId: event.actorId.toUpperCase(), reason: null });
  assert.equal(replay.status, 200); assert.equal(replay.body.data.receivedAt, receivedAt);
  const changed = await post({ ...event, reason: 'Different semantic content' }); assert.equal(changed.status, 409);
  const stored = await models.AuditLog.findOne({ eventId: event.eventId });
  assert.equal(String(stored.workSessionId), String(session._id)); assert.equal(stored.occurredAt.toISOString(), event.occurredAt);
  assert.equal(stored.reason, null); assert.equal(await models.AuditLog.countDocuments({ eventId: event.eventId }), 1);
  await models.StaffAccount.updateOne({ _id: staff._id }, { $set: { status: 'active' } });
});

test('concurrent identical delivery inserts once and conflicting payload is rejected', async () => {
  const payload = { ...event, eventId: randomUUID(), action: 'poi.update' };
  const results = await Promise.all(Array.from({ length: 8 }, () => post(payload)));
  assert.equal(results.filter(x => x.status === 201).length, 1); assert.equal(results.filter(x => x.status === 200).length, 7);
  assert.equal(await models.AuditLog.countDocuments({ eventId: payload.eventId }), 1);
  assert.equal((await post({ ...payload, action: 'poi.delete' })).status, 409);
});

test('history enforces Staff own scope; Manager sees account/operator; filter and session ownership cannot bypass', async () => {
  const foreignSession = await models.WorkSession.create({ staffId: other._id, workDateVN: '2026-10-23', status: 'open', openedAt: new Date(clock) });
  await models.AuditLog.create({ eventId: randomUUID(), actorType: 'account', actorId: other._id, workSessionId: foreignSession._id,
    action: 'work_session.close', reason: 'Fixture', occurredAt: new Date(clock), receivedAt: new Date(clock), result: { status: 'succeeded', errorCode: null } });
  await models.AuditLog.create({ eventId: randomUUID(), actorType: 'operator', operatorId: 'synthetic-operator-alias', targetAccountId: manager._id,
    reason: 'Synthetic setup', action: 'manager.setup', occurredAt: new Date(clock), receivedAt: new Date(clock), result: { status: 'succeeded', errorCode: null } });
  const own = await get('audit-logs'); assert.equal(own.status, 200); assert.ok(own.body.data.items.every(x => x.actorId === String(staff._id) && x.actorType === 'account'));
  assert.equal((await get(`audit-logs?staffId=${other._id}`)).status, 403);
  assert.equal((await get('audit-logs?actorType=operator')).status, 403);
  assert.equal((await get(`audit-logs?workSessionId=${foreignSession._id}`)).status, 404);
  assert.equal((await get(`audit-logs?workSessionId=${new mongoose.Types.ObjectId()}`)).status, 404);
  assert.equal((await get('audit-logs?actorType=operator', managerToken)).body.data.items.length, 1);
  assert.ok((await get('audit-logs', managerToken)).body.data.items.some(x => x.actorId === String(other._id)));
  assert.ok((await get('work-sessions')).body.data.items.every(x => x.staffId === String(staff._id)));
  assert.equal((await get(`work-sessions?staffId=${other._id}`)).status, 403);
});

test('keyset pagination handles ties; signed cursors bind endpoint, filters, requester and current role', async () => {
  for (let i = 0; i < 4; i++) assert.equal((await post({ ...event, eventId: randomUUID(), action: 'poi.create' })).status, 201);
  const first = await get('audit-logs?action=poi.create&limit=2'); const cursor = first.body.data.nextCursor; assert.ok(cursor);
  const second = await get(`audit-logs?action=poi.create&limit=2&cursor=${cursor}`); assert.equal(second.status, 200); assert.equal(second.body.data.nextCursor, null);
  const ids = [...first.body.data.items, ...second.body.data.items].map(x => x.id); assert.equal(new Set(ids).size, 4);
  assert.deepEqual(ids, [...ids].sort().reverse());
  assert.equal((await get(`audit-logs?action=poi.update&cursor=${cursor}`)).status, 422);
  assert.equal((await get(`audit-logs?action=poi.create&cursor=${cursor}`, otherToken)).status, 422);
  assert.equal((await get(`work-sessions?cursor=${cursor}`)).status, 422);
  const tampered = JSON.parse(Buffer.from(cursor, 'base64url').toString()); tampered.p.requester = String(other._id);
  assert.equal((await get(`audit-logs?action=poi.create&cursor=${Buffer.from(JSON.stringify(tampered)).toString('base64url')}`)).status, 422);
  await models.StaffAccount.updateOne({ _id: staff._id }, { $set: { role: 'Manager' } });
  assert.equal((await get(`audit-logs?action=poi.create&cursor=${cursor}`)).status, 422);
  await models.StaffAccount.updateOne({ _id: staff._id }, { $set: { role: 'Staff' } });
  const ctx = { endpoint: 'audit', requester: String(staff._id), role: 'Staff', filters: {} };
  assert.throws(() => decodeHistoryCursor(config.rateKey, `${cursor}=`, ctx));
  assert.throws(() => decodeHistoryCursor(config.rateKey, 'x'.repeat(2049), ctx));
  const forgedShape = encodeHistoryCursor(config.rateKey, ctx, { value: 'not a date', id: String(staff._id) });
  assert.throws(() => decodeHistoryCursor(config.rateKey, forgedShape, ctx));
});

test('Vietnam date filtering uses occurredAt; query validation and Manager scoped reconciliation', async () => {
  const early = { ...event, eventId: randomUUID(), occurredAt: '2026-10-22T16:59:59.999Z', action: 'content.review' };
  const late = { ...early, eventId: randomUUID(), occurredAt: '2026-10-22T17:00:00.000Z' };
  await post(early); await post(late);
  const filtered = await get('audit-logs?action=content.review&dateFrom=2026-10-23&dateTo=2026-10-23');
  assert.equal(filtered.body.data.items.length, 1); assert.equal(filtered.body.data.items[0].eventId, late.eventId);
  for (const query of ['limit=0', 'limit=101', 'limit=2&limit=3', 'unknown=x', 'dateFrom=2026-02-30', 'dateFrom=2026-10-24&dateTo=2026-10-22', 'staffId[$ne]=x']) {
    assert.equal((await get(`audit-logs?${query}`)).status, 422);
  }
  await models.WorkSession.create({ staffId: other._id, workDateVN: '2026-10-21', status: 'open', openedAt: new Date('2026-10-21T03:00:00Z') });
  const historical = await get('work-sessions?dateTo=2026-10-22&status=closed', managerToken);
  assert.equal(historical.status, 200); assert.ok(historical.body.data.items.some(x => x.staffId === String(other._id) && x.closedAt === '2026-10-21T17:00:00.000Z'));
  const first = await get('work-sessions?limit=1', managerToken); assert.ok(first.body.data.nextCursor);
  assert.equal((await get(`work-sessions?limit=1&cursor=${first.body.data.nextCursor}`, managerToken)).status, 200);
  assert.equal((await get('audit-logs', token, { Origin: 'https://evil.example.invalid' })).status, 403);
});

test('bounded insert conflicts stop after three attempts', async () => {
  let inserts = 0;
  const fake = { ...runtime, models: { StaffAccount: { exists: async () => true }, WorkSession: { findOne: async () => session },
    AuditLog: { findOne: async () => null, create: async () => { inserts++; throw Object.assign(new Error('duplicate'), { code: 11000 }); } } } };
  await assert.rejects(ingestAudit(fake, event)); assert.equal(inserts, 3);
});

test('receipt survives new server process and lost-response replay; readiness remains503', async () => {
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); server = null;
  const child = spawn(process.execPath, [fileURLToPath(new URL('../src/server.js', import.meta.url))], { env: { ...process.env,
    NODE_ENV: 'test', HOST: '127.0.0.1', PORT: String(port), IDENTITY_MONGODB_URI: config.uri,
    IDENTITY_JWT_KEY_B64URL: config.jwtKey.toString('base64url'), IDENTITY_RATE_HMAC_KEY_B64URL: config.rateKey.toString('base64url'),
    IDENTITY_ALLOWED_ORIGINS: config.origins.join(','), IDENTITY_TRUST_PROXY_CIDRS: '', ...credentials }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Child startup timeout')), 10000);
      child.stdout.on('data', data => { if (data.toString().includes('identity process listening')) { clearTimeout(timer); resolve(); } });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Child exited early')); });
    });
    const replay = await post(); assert.equal(replay.status, 200); assert.equal(replay.body.data.receivedAt, receivedAt);
    assert.equal((await fetch(`${base}/health/ready`)).status, 503);
  } finally { const exited = once(child, 'exit'); child.kill(); await exited; }
  server = createApp(runtime).listen(port, '127.0.0.1'); await once(server, 'listening');
});

test('DB loss fails ingest and scoped reads closed503 without leaking errors', async () => {
  await connection.close();
  for (const response of [await post(), await get('audit-logs')]) {
    assert.equal(response.status, 503); assert.equal(JSON.stringify(response.body).includes('mongodb'), false);
  }
});
