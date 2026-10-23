import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import { SignJWT } from 'jose';
import { createIdentityModels } from '../src/models/index.js';
import { loadAuthConfig } from '../src/auth/config.js';
import { createAuthRuntime } from '../src/auth/runtime.js';
import { issueToken } from '../src/auth/token.js';
import { createApp } from '../src/app.js';
import { loadServiceCredentials, requireAuthority } from '../src/authorization.js';
import * as content from '../../content/src/authorization.js';
import * as usage from '../../usage/src/authorization.js';

let connection, models, runtime, config, account, token, base;
let clock = Date.parse('2026-10-23T03:00:00.000Z');
const servers = [];
const key = () => randomBytes(32).toString('base64url');
const credentials = { IDENTITY_CONTENT_SERVICE_KEY_B64URL: key(), IDENTITY_USAGE_SERVICE_KEY_B64URL: key(),
  IDENTITY_CONTENT_PREVIOUS_SERVICE_KEY_B64URL: key(), IDENTITY_CONTENT_PREVIOUS_KEY_EXPIRES_AT: '2026-10-23T04:00:00.000Z' };
async function listen(app) { const server = app.listen(0, '127.0.0.1'); servers.push(server); await once(server, 'listening'); return `http://127.0.0.1:${server.address().port}`; }
async function request(path = '/me', options = {}) {
  const r = await fetch(`${base}/api/v1${path}`, options);
  const b = await r.json();
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(b.requestId ?? b.error.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(JSON.stringify(b).includes('passwordHash'), false);
  return { status: r.status, body: b };
}
function internal(service = 'content', serviceKey = credentials.IDENTITY_CONTENT_SERVICE_KEY_B64URL, body = { accessToken: token }, extra = {}) {
  return request('/internal/authorize', { method: 'POST', headers: { 'Content-Type': 'application/json',
    'X-Vinlook-Service': service, 'X-Vinlook-Service-Key': serviceKey, ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
before(async () => {
  const name = process.env.VINLOOK_TEST_MONGO_CONTAINER;
  assert.match(name ?? '', /^vinlook-task006-mongo-[A-Za-z0-9_-]+$/);
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }));
  assert.equal(container.Config.Labels['vinlook.task'], 'TASK-006');
  assert.equal(container.Config.Image, 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');
  const [binding] = container.NetworkSettings.Ports['27017/tcp'];
  assert.equal(binding.HostIp, '127.0.0.1'); assert.match(binding.HostPort, /^[0-9]+$/);
  const uri = `mongodb://127.0.0.1:${binding.HostPort}/vinlook_identity_task006?replicaSet=vinlook_task006&directConnection=true`;
  config = loadAuthConfig('test', { IDENTITY_MONGODB_URI: uri, IDENTITY_JWT_KEY_B64URL: key(),
    IDENTITY_RATE_HMAC_KEY_B64URL: key(), IDENTITY_ALLOWED_ORIGINS: 'https://test.example.invalid' });
  connection = await mongoose.createConnection(uri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000 }).asPromise();
  assert.equal((await connection.db.listCollections().toArray()).length, 0);
  assert.equal((await connection.db.admin().command({ hello: 1 })).setName, 'vinlook_task006');
  models = createIdentityModels(connection);
  for (const model of Object.values(models)) { await model.createCollection(); await model.createIndexes(); }
  runtime = { ...await createAuthRuntime(models, config, () => clock), callers: loadServiceCredentials(config, credentials, clock) };
  base = await listen(createApp(runtime));
  account = await models.StaffAccount.create({ fullName: 'Auth Fixture', email: 'auth@example.invalid', passwordHash: `$2b$12$${'A'.repeat(53)}`,
    role: 'Staff', status: 'active', authVersion: 0 });
  token = await issueToken(account, config, clock);
});
after(async () => { for (const server of servers) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } if (connection) await connection.close(); });

test('current principal safe me and internal response; reject identity injection and malformed inputs', async () => {
  const me = await request('/me', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(me.status, 200); assert.equal(me.body.data.account.email, account.email); assert.equal(me.body.data.currentWorkSession, null);
  assert.equal(me.body.data.account.authVersion, undefined);
  const checked = await internal(); assert.equal(checked.status, 200); assert.equal(checked.body.data.account.id, String(account._id));
  assert.equal(checked.body.data.account.email, undefined);
  assert.equal((await internal('content', credentials.IDENTITY_CONTENT_SERVICE_KEY_B64URL, { accessToken: token, role: 'Manager' })).status, 422);
  assert.equal((await internal('content', credentials.IDENTITY_CONTENT_SERVICE_KEY_B64URL, '{')).status, 400);
  assert.equal((await internal('content', credentials.IDENTITY_CONTENT_SERVICE_KEY_B64URL, { accessToken: 'x'.repeat(17000) })).status, 413);
  assert.equal((await request('/me?accountId=forged', { headers: { Authorization: `Bearer ${token}` } })).status, 422);
});

test('JWT errors and deleted account denied; authVersion, lock, pending and role read fresh every request', async () => {
  assert.equal((await request()).status, 401);
  for (const t of ['bad.token.value', await issueToken(account, config, clock - 7200000),
    await issueToken({ _id: new mongoose.Types.ObjectId(), authVersion: 0 }, config, clock),
    await new SignJWT({ authVersion: 0 }).setSubject(String(account._id)).setProtectedHeader({ alg: 'HS384' }).sign(randomBytes(48))]) {
    assert.equal((await request('/me', { headers: { Authorization: `Bearer ${t}` } })).status, 401);
  }
  for (const status of ['locked', 'pending']) {
    await models.StaffAccount.updateOne({ _id: account._id }, { $set: { status } });
    assert.equal((await internal()).status, 403);
  }
  await models.StaffAccount.updateOne({ _id: account._id }, { $set: { status: 'active', authVersion: 1 } });
  assert.equal((await internal()).status, 401);
  await models.StaffAccount.updateOne({ _id: account._id }, { $set: { authVersion: 0, role: 'Manager' } });
  assert.equal((await internal()).body.data.account.role, 'Manager');
  await models.StaffAccount.updateOne({ _id: account._id }, { $set: { role: 'Staff' } });
  assert.equal((await internal()).body.data.account.role, 'Staff');
});

test('session context uses verified actor/current Vietnam day; no mutation or old-day admission', async () => {
  const prior = await models.WorkSession.create({ staffId: account._id, workDateVN: '2026-10-22', status: 'open', openedAt: new Date('2026-10-22T03:00:00Z') });
  assert.equal((await internal()).body.data.currentWorkSession, null);
  const session = await models.WorkSession.create({ staffId: account._id, workDateVN: '2026-10-23', status: 'open', openedAt: new Date(clock) });
  const principal = (await internal()).body.data;
  assert.equal(principal.currentWorkSession.id, String(session._id));
  assert.equal((await models.WorkSession.findById(prior._id)).status, 'open');
  assert.throws(() => requireAuthority(principal, { roles: ['Manager'] }), e => e.status === 403);
  requireAuthority(principal, { requireSession: true });
  assert.throws(() => requireAuthority({ ...principal, currentWorkSession: null }, { requireSession: true }), e => e.code === 'WORK_SESSION_REQUIRED');
  await models.WorkSession.updateOne({ _id: session._id }, { $set: { status: 'closed', closedAt: new Date(clock) } });
  assert.equal((await internal()).body.data.currentWorkSession, null);
});

test('scoped credentials, Origin rejection and old-key expiry/removal never bypass caller checks', async () => {
  assert.equal((await internal('worker')).status, 401);
  assert.equal((await internal('usage')).status, 401);
  assert.equal((await internal('content', key())).status, 401);
  assert.equal((await internal('usage', credentials.IDENTITY_USAGE_SERVICE_KEY_B64URL)).status, 200);
  assert.equal((await internal('content', credentials.IDENTITY_CONTENT_SERVICE_KEY_B64URL, { accessToken: token }, { Origin: 'https://test.example.invalid' })).status, 401);
  assert.equal((await internal('content', credentials.IDENTITY_CONTENT_PREVIOUS_SERVICE_KEY_B64URL)).status, 200);
  clock = Date.parse(credentials.IDENTITY_CONTENT_PREVIOUS_KEY_EXPIRES_AT);
  assert.equal((await internal('content', credentials.IDENTITY_CONTENT_PREVIOUS_SERVICE_KEY_B64URL)).status, 401);
  clock -= 1000;
  const removed = { ...credentials };
  delete removed.IDENTITY_CONTENT_PREVIOUS_SERVICE_KEY_B64URL;
  delete removed.IDENTITY_CONTENT_PREVIOUS_KEY_EXPIRES_AT;
  const revokedBase = await listen(createApp({ ...runtime, callers: loadServiceCredentials(config, removed, clock) }));
  const revoked = await fetch(`${revokedBase}/api/v1/internal/authorize`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Vinlook-Service': 'content', 'X-Vinlook-Service-Key': credentials.IDENTITY_CONTENT_PREVIOUS_SERVICE_KEY_B64URL },
    body: JSON.stringify({ accessToken: token }) });
  assert.equal(revoked.status, 401);
  assert.equal((await internal()).status, 200);
});

test('session day follows Vietnam midnight while UTC calendar date is still prior day', async () => {
  const priorClock = clock;
  clock = Date.parse('2026-10-23T17:00:00.000Z');
  try {
    const fresh = await issueToken(account, config, clock);
    assert.equal((await internal('content', credentials.IDENTITY_CONTENT_SERVICE_KEY_B64URL, { accessToken: fresh })).body.data.currentWorkSession, null);
    const session = await models.WorkSession.create({ staffId: account._id, workDateVN: '2026-10-24', status: 'open', openedAt: new Date(clock) });
    assert.equal((await internal('content', credentials.IDENTITY_CONTENT_SERVICE_KEY_B64URL, { accessToken: fresh })).body.data.currentWorkSession.id, String(session._id));
  } finally { clock = priorClock; }
});

for (const [name, adapter] of [['content', content], ['usage', usage]]) {
  test(`${name} adapter uses its own credential and fresh current role/session, no positive cache`, async () => {
    // Adapter calls use real wall-clock JWT verification through the injected Identity clock.
    const cfg = adapter.loadAuthorizationConfig('test', { IDENTITY_BASE_URL: base,
      [`${name.toUpperCase()}_IDENTITY_SERVICE_KEY_B64URL`]: credentials[`IDENTITY_${name.toUpperCase()}_SERVICE_KEY_B64URL`] });
    const app = express();
    app.get('/protected', adapter.protectedRequest(cfg, { roles: ['Manager'] }), (_r, s) => s.json({ admitted: true }));
    app.get('/mutation', adapter.protectedRequest(cfg, { requireSession: true }), (_r, s) => s.json({ admitted: true }));
    const url = await listen(app);
    const call = path => fetch(`${url}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal((await call('/protected')).status, 403);
    await models.StaffAccount.updateOne({ _id: account._id }, { $set: { role: 'Manager' } });
    assert.equal((await call('/protected')).status, 200);
    assert.equal((await call('/mutation')).status, 403);
    await models.StaffAccount.updateOne({ _id: account._id }, { $set: { status: 'locked' } });
    assert.equal((await call('/protected')).status, 403);
    await models.StaffAccount.updateOne({ _id: account._id }, { $set: { status: 'active', role: 'Staff' } });
  });
}

test('Identity database closure returns safe503 and adapters do not authorize', async () => {
  await connection.close();
  assert.equal((await internal()).status, 503);
  const cfg = content.loadAuthorizationConfig('test', { IDENTITY_BASE_URL: base, CONTENT_IDENTITY_SERVICE_KEY_B64URL: credentials.IDENTITY_CONTENT_SERVICE_KEY_B64URL });
  await assert.rejects(content.authorize(`Bearer ${token}`, cfg), e => e.status === 503 && e.code === 'AUTHORIZATION_UNAVAILABLE');
});
