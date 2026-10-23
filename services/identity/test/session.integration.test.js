import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { createIdentityModels } from '../src/models/index.js';
import { createAuthRuntime } from '../src/auth/runtime.js';
import { loadAuthConfig } from '../src/auth/config.js';
import { issueToken } from '../src/auth/token.js';
import { loadServiceCredentials } from '../src/authorization.js';
import { createApp } from '../src/app.js';
import { openSession, sessionTransaction } from '../src/session-state.js';

const key = () => randomBytes(32).toString('base64url');
const credentials = { IDENTITY_CONTENT_SERVICE_KEY_B64URL: key(), IDENTITY_USAGE_SERVICE_KEY_B64URL: key() };
let clock = Date.parse('2026-10-23T03:00:00.000Z');
let connection, models, config, runtime, server, base, owner, other, token, otherToken, opened;
async function account(email, role = 'Staff') {
  return models.StaffAccount.create({ fullName: 'Session Fixture', email, role, status: 'active', authVersion: 0, passwordHash: `$2b$12$${'A'.repeat(53)}` });
}
async function post(path, body, accessToken = token, headers = {}) {
  const r = await fetch(`${base}/api/v1/work-sessions/${path}`, { method: 'POST', headers: {
    'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...headers },
  ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
  const result = await r.json();
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(result.requestId ?? result.error.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(JSON.stringify(result).includes('passwordHash'), false);
  return { status: r.status, body: result };
}
before(async () => {
  const name = process.env.VINLOOK_TEST_MONGO_CONTAINER;
  assert.match(name ?? '', /^vinlook-task007-mongo-[A-Za-z0-9_-]+$/);
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }));
  assert.equal(container.Config.Labels['vinlook.task'], 'TASK-007');
  assert.equal(container.Config.Image, 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');
  const [binding] = container.NetworkSettings.Ports['27017/tcp'];
  assert.equal(binding.HostIp, '127.0.0.1'); assert.match(binding.HostPort, /^[0-9]+$/);
  const uri = `mongodb://127.0.0.1:${binding.HostPort}/vinlook_identity_task007?replicaSet=vinlook_task007&directConnection=true`;
  config = loadAuthConfig('test', { IDENTITY_MONGODB_URI: uri, IDENTITY_JWT_KEY_B64URL: key(), IDENTITY_RATE_HMAC_KEY_B64URL: key(), IDENTITY_ALLOWED_ORIGINS: 'https://test.example.invalid' });
  connection = await mongoose.createConnection(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 3000 }).asPromise();
  assert.equal((await connection.db.listCollections().toArray()).length, 0);
  assert.equal((await connection.db.admin().command({ hello: 1 })).setName, 'vinlook_task007');
  models = createIdentityModels(connection);
  for (const model of Object.values(models)) { await model.createCollection(); await model.createIndexes(); }
  runtime = { ...await createAuthRuntime(models, config, () => clock), callers: loadServiceCredentials(config, credentials, clock) };
  server = createApp(runtime).listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}`;
  owner = await account('owner@example.invalid'); other = await account('manager@example.invalid', 'Manager');
  token = await issueToken(owner, config, clock); otherToken = await issueToken(other, config, clock);
});
after(async () => { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } if (connection) await connection.close(); });

test('open creates once; close stores atomic reason; reopen preserves ID and original openedAt', async () => {
  const first = await post('open'); assert.equal(first.status, 201); opened = first.body.data.session;
  assert.equal(opened.workDateVN, '2026-10-23'); assert.equal(opened.openedAt, new Date(clock).toISOString());
  const repeated = await post('open', {}); assert.equal(repeated.status, 200); assert.deepEqual(repeated.body.data.session, opened);
  clock += 60000;
  const closed = await post(`${opened.id}/close`, { reason: '  Finished shift  ' }); assert.equal(closed.status, 200);
  assert.equal(closed.body.data.session.closedAt, new Date(clock).toISOString());
  const audit = await models.AuditLog.findOne({ workSessionId: opened.id });
  assert.equal(audit.reason, 'Finished shift'); assert.equal(audit.action, 'work_session.close'); assert.equal(String(audit.actorId), String(owner._id));
  assert.equal((await post(`${opened.id}/close`, { reason: 'retry cannot replace' })).status, 200);
  assert.equal(await models.AuditLog.countDocuments({ workSessionId: opened.id }), 1);
  clock += 60000;
  const reopened = await post('open', {}); assert.equal(reopened.status, 200);
  assert.deepEqual(reopened.body.data.session, opened);
});

test('concurrent first opens return one ID and concurrent closes create one event', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => post('open', {}, otherToken)));
  assert.equal(results.filter(x => x.status === 201).length, 1);
  assert.ok(results.every(x => [200, 201].includes(x.status)));
  assert.equal(new Set(results.map(x => x.body.data.session.id)).size, 1);
  const id = results[0].body.data.session.id;
  const closed = await Promise.all(Array.from({ length: 8 }, () => post(`${id}/close`, { reason: 'Concurrent close' }, otherToken)));
  assert.ok(closed.every(x => x.status === 200));
  assert.equal(await models.AuditLog.countDocuments({ workSessionId: id }), 1);
  assert.equal(await models.WorkSession.countDocuments({ staffId: other._id, workDateVN: '2026-10-23' }), 1);
});

test('ownership, current account authority, strict bodies and CORS prevent unauthorized mutations', async () => {
  assert.equal((await post(`${opened.id}/close`, { reason: 'Manager cannot close another session' }, otherToken)).status, 404);
  assert.equal((await post(`${new mongoose.Types.ObjectId()}/close`, { reason: 'missing' })).status, 404);
  assert.equal((await post('not-an-id/close', { reason: 'invalid' })).status, 422);
  assert.equal((await post('open', { staffId: String(other._id) })).status, 422);
  assert.equal((await post('open', 'not json', token, { 'Content-Type': 'text/plain' })).status, 422);
  assert.equal((await post('open', '{')).status, 400);
  assert.equal((await post('open', { x: 'x'.repeat(17000) })).status, 413);
  assert.equal((await post(`${opened.id}/close`, { reason: ' ' })).status, 422);
  assert.equal((await post(`${opened.id}/close`, { reason: 'x'.repeat(501) })).status, 422);
  assert.equal((await post('open', {}, null)).status, 401);
  assert.equal((await post('open', {}, token, { Origin: 'https://evil.example.invalid' })).status, 403);
  await models.StaffAccount.updateOne({ _id: owner._id }, { $set: { status: 'locked' } });
  assert.equal((await post('open', {})).status, 403);
  await models.StaffAccount.updateOne({ _id: owner._id }, { $set: { status: 'active' } });
});

test('audit write failure aborts close; event never exists without committed close', async () => {
  const original = runtime.models.AuditLog;
  runtime.models = { ...models, AuditLog: { create: async () => { throw new Error('synthetic private dependency failure'); } } };
  try {
    const failed = await post(`${opened.id}/close`, { reason: 'Must roll back' });
    assert.equal(failed.status, 503); assert.equal(JSON.stringify(failed.body).includes('synthetic private'), false);
    assert.equal((await models.WorkSession.findById(opened.id)).status, 'open');
    assert.equal(await models.AuditLog.countDocuments({ workSessionId: opened.id, reason: 'Must roll back' }), 0);
  } finally { runtime.models = { ...models, AuditLog: original }; }
});

test('midnight rejects prior-day close, reconciles exact boundary and creates next-day ID', async () => {
  clock = Date.parse('2026-10-23T16:59:59.999Z'); token = await issueToken(owner, config, clock);
  assert.equal((await post('open', {})).body.data.session.id, opened.id);
  clock += 1;
  const oldClose = await post(`${opened.id}/close`, { reason: 'Too late' }); assert.equal(oldClose.status, 409);
  const stale = await models.WorkSession.findById(opened.id);
  assert.equal(stale.status, 'closed'); assert.equal(stale.closedAt.toISOString(), '2026-10-23T17:00:00.000Z');
  const fresh = await post('open', {}); assert.equal(fresh.status, 201);
  assert.equal(fresh.body.data.session.workDateVN, '2026-10-24'); assert.notEqual(fresh.body.data.session.id, opened.id);
  assert.equal(await models.AuditLog.countDocuments({ workSessionId: opened.id, reason: 'Too late' }), 0);
});

test('crossing midnight before transactional write guard aborts without old-day mutation', async () => {
  const isolated = await account('crossing@example.invalid');
  let calls = 0;
  const before = Date.parse('2026-10-24T16:59:59.999Z');
  await assert.rejects(openSession({ ...runtime, now: () => calls++ === 0 ? before : before + 1 }, String(isolated._id)), e => e.code === 'SESSION_DAY_ENDED');
  assert.equal(await models.WorkSession.countDocuments({ staffId: isolated._id }), 0);
});

test('transaction contention is bounded and an uncertain commit is not replayed', async () => {
  let attempts = 0;
  const session = { startTransaction() {}, inTransaction: () => true, abortTransaction: async () => {}, endSession: async () => {} };
  await assert.rejects(sessionTransaction({ startSession: async () => session }, async () => { attempts++; throw Object.assign(new Error('conflict'), { code: 112 }); }));
  assert.equal(attempts, 3);
  attempts = 0;
  const unknown = { ...session, commitTransaction: async () => { throw { hasErrorLabel: label => label === 'UnknownTransactionCommitResult' }; } };
  await assert.rejects(sessionTransaction({ startSession: async () => unknown }, async () => { attempts++; }));
  assert.equal(attempts, 1);
});

test('new Identity process reconciles persisted stale records before accepting HTTP', async () => {
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve)); server = null;
  const staleAccount = await account('restart@example.invalid');
  const stale = await models.WorkSession.create({ staffId: staleAccount._id, workDateVN: '2026-10-21', status: 'open', openedAt: new Date('2026-10-21T03:00:00Z') });
  const child = spawn(process.execPath, [fileURLToPath(new URL('../src/server.js', import.meta.url))], { env: {
    ...process.env, NODE_ENV: 'test', HOST: '127.0.0.1', PORT: String(port), IDENTITY_MONGODB_URI: config.uri,
    IDENTITY_JWT_KEY_B64URL: config.jwtKey.toString('base64url'), IDENTITY_RATE_HMAC_KEY_B64URL: config.rateKey.toString('base64url'),
    IDENTITY_ALLOWED_ORIGINS: config.origins.join(','), IDENTITY_TRUST_PROXY_CIDRS: '', ...credentials }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Child startup timeout')), 10000);
      child.stdout.on('data', data => { if (data.toString().includes('identity process listening')) { clearTimeout(timer); resolve(); } });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Child exited before startup')); });
    });
    assert.equal((await models.WorkSession.findById(stale._id)).closedAt.toISOString(), '2026-10-21T17:00:00.000Z');
    assert.equal((await fetch(`${base}/health/ready`)).status, 503);
  } finally { const exited = once(child, 'exit'); child.kill(); await exited; }
  server = createApp(runtime).listen(port, '127.0.0.1'); await once(server, 'listening');
});

test('database loss fails session mutation closed503', async () => {
  await connection.close();
  assert.equal((await post('open', {})).status, 503);
});
