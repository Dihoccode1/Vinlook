import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { createHash, randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { createIdentityModels } from '../src/models/index.js';
import { createAuthRuntime } from '../src/auth/runtime.js';
import { loadAuthConfig } from '../src/auth/config.js';
import { issueToken } from '../src/auth/token.js';
import { loadServiceCredentials } from '../src/authorization.js';
import { createApp } from '../src/app.js';
import { rateBucket } from '../src/auth/rate.js';
import { resetPassword } from '../src/staff-recovery.js';

const key = () => randomBytes(32).toString('base64url');
const hashCode = code => createHash('sha256').update(Buffer.from(code, 'base64url')).digest('hex');
const credentials = { IDENTITY_CONTENT_SERVICE_KEY_B64URL: key(), IDENTITY_USAGE_SERVICE_KEY_B64URL: key() };
const password = 'Synthetic-reset-password-2026!';
let clock = Date.parse('2026-10-23T03:00:00.000Z');
let connection, models, config, runtime, server, base, manager, staff, pending, otherManager, operatorManager, managerToken, staffToken, initialHash;
async function account(email, role = 'Staff', status = 'active') {
  return models.StaffAccount.create({ fullName: 'Staff Fixture', email, role, status, authVersion: 0, passwordHash: initialHash });
}
async function call(path, body, token, method = 'POST', extra = {}) {
  const r = await fetch(`${base}/api/v1/${path}`, { method, headers: { 'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra },
  ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
  const value = await r.json(); assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(value.requestId ?? value.error.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(JSON.stringify(value).includes('passwordHash'), false);
  assert.equal(JSON.stringify(value).includes(password), false);
  return { status: r.status, body: value, headers: r.headers };
}
const issue = target => call(`staff/${target._id}/recovery-codes`, { reason: 'Synthetic verification completed' }, managerToken);
const reset = (target, code, replacement = password) => call('auth/reset-password', { email: target.email,
  code, password: replacement, confirmPassword: replacement });
const clearRates = () => models.AuthRateLimit.deleteMany({});
before(async () => {
  const name = process.env.VINLOOK_TEST_MONGO_CONTAINER;
  assert.match(name ?? '', /^vinlook-task009-mongo-[A-Za-z0-9_-]+$/);
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }));
  assert.equal(container.Config.Labels['vinlook.task'], 'TASK-009');
  assert.equal(container.Config.Image, 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');
  const [binding] = container.NetworkSettings.Ports['27017/tcp'];
  assert.equal(binding.HostIp, '127.0.0.1'); assert.match(binding.HostPort, /^[0-9]+$/);
  const uri = `mongodb://127.0.0.1:${binding.HostPort}/vinlook_identity_task009?replicaSet=vinlook_task009&directConnection=true`;
  config = loadAuthConfig('test', { IDENTITY_MONGODB_URI: uri, IDENTITY_JWT_KEY_B64URL: key(), IDENTITY_RATE_HMAC_KEY_B64URL: key(), IDENTITY_ALLOWED_ORIGINS: 'https://test.example.invalid' });
  connection = await mongoose.createConnection(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 3000 }).asPromise();
  assert.equal((await connection.db.listCollections().toArray()).length, 0);
  assert.equal((await connection.db.admin().command({ hello: 1 })).setName, 'vinlook_task009');
  models = createIdentityModels(connection);
  for (const model of Object.values(models)) { await model.createCollection(); await model.createIndexes(); }
  runtime = { ...await createAuthRuntime(models, config, () => clock), callers: loadServiceCredentials(config, credentials, clock) };
  initialHash = await bcrypt.hash('Synthetic-original-password!', 12);
  [manager, staff, pending, otherManager, operatorManager] = await Promise.all([
    account('manager@example.invalid', 'Manager'), account('staff@example.invalid'), account('pending@example.invalid', 'Staff', 'pending'),
    account('other-manager@example.invalid', 'Manager'), account('operator-manager@example.invalid', 'Manager')]);
  managerToken = await issueToken(manager, config, clock); staffToken = await issueToken(staff, config, clock);
  server = createApp(runtime).listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } if (connection) await connection.close(); });

test('Manager-only Staff listing is safe and cursor-bound; no Manager targeting/role injection', async () => {
  assert.equal((await call('staff', undefined, staffToken, 'GET')).status, 403);
  assert.equal((await call('staff', undefined, undefined, 'GET')).status, 401);
  const first = await call('staff?limit=1', undefined, managerToken, 'GET'); assert.equal(first.status, 200);
  assert.ok(first.body.data.items.every(x => x.role === 'Staff' && x.authVersion === undefined));
  const cursor = first.body.data.nextCursor; assert.ok(cursor);
  assert.equal((await call(`staff?limit=1&cursor=${cursor}`, undefined, managerToken, 'GET')).status, 200);
  assert.equal((await call(`staff?status=pending&cursor=${cursor}`, undefined, managerToken, 'GET')).status, 422);
  const otherToken = await issueToken(otherManager, config, clock);
  assert.equal((await call(`staff?cursor=${cursor}`, undefined, otherToken, 'GET')).status, 422);
  assert.equal((await call(`staff/${manager._id}/lock`, { expectedStatus: 'active' }, managerToken)).status, 404);
  assert.equal((await call(`staff/${otherManager._id}/recovery-codes`, { reason: 'No Manager override' }, managerToken)).status, 404);
  assert.equal((await call(`staff/${pending._id}/approve`, { expectedStatus: 'pending', role: 'Manager' }, managerToken)).status, 422);
});

test('approval/lock/unlock enforce expected state; old JWT stays invalid after unlock; local audit atomic', async () => {
  assert.equal((await call(`staff/${pending._id}/approve`, { expectedStatus: 'pending' }, managerToken)).status, 200);
  assert.equal((await call(`staff/${pending._id}/approve`, { expectedStatus: 'pending' }, managerToken)).status, 409);
  assert.equal((await call(`staff/${staff._id}/lock`, { expectedStatus: 'active' }, managerToken)).status, 200);
  assert.equal((await models.StaffAccount.findById(staff._id)).authVersion, 1);
  assert.equal((await call(`staff/${staff._id}/unlock`, { expectedStatus: 'locked' }, managerToken)).status, 200);
  assert.equal((await call('me', undefined, staffToken, 'GET')).status, 401);
  assert.equal((await models.StaffAccount.findById(staff._id)).status, 'active');
  const audit = await models.AuditLog.findOne({ action: 'staff.lock', targetAccountId: staff._id });
  assert.equal(String(audit.actorId), String(manager._id)); assert.equal(audit.workSessionId, null);
});

test('issuance returns32-byte code once; SHA256-only DB,15minutes, replaces old codes and revokes JWT', async () => {
  const current = await models.StaffAccount.findById(staff._id); const beforeToken = await issueToken(current, config, clock);
  const first = await issue(staff); assert.equal(first.status, 201); const raw = first.body.data.code;
  assert.equal(Buffer.from(raw, 'base64url').length, 32); assert.equal(Buffer.from(raw, 'base64url').toString('base64url'), raw);
  assert.equal(Date.parse(first.body.data.expiresAt) - clock, 900000);
  const stored = await models.RecoveryCode.findOne({ staffId: staff._id }).select('+codeHash');
  assert.equal(stored.codeHash, hashCode(raw)); assert.equal(JSON.stringify(stored.toObject()).includes(raw), false);
  assert.equal((await call('me', undefined, beforeToken, 'GET')).status, 401);
  clock += 1000;
  const second = await issue(staff); assert.equal(second.status, 201);
  assert.equal((await reset(staff, raw)).status, 401);
  assert.equal(await models.RecoveryCode.countDocuments({ staffId: staff._id, usedAt: null, expiresAt: { $gt: new Date(clock) } }), 1);
});

test('Unicode reset consumes once, actual bcrypt12, confirmation/byte validation and locked status retained', async () => {
  await clearRates();
  await call(`staff/${staff._id}/lock`, { expectedStatus: 'active' }, managerToken);
  const issued = await issue(staff); const raw = issued.body.data.code;
  for (const patch of [{ confirmPassword: `${password} ` }, { password: 'short', confirmPassword: 'short' },
    { password: '😀'.repeat(19), confirmPassword: '😀'.repeat(19) }]) {
    assert.equal((await call('auth/reset-password', { email: staff.email, code: raw, password, confirmPassword: password, ...patch })).status, 422);
  }
  const replacement = '😀'.repeat(15) + ' ';
  const done = await reset(staff, raw, replacement); assert.equal(done.status, 200); assert.deepEqual(done.body.data, { reset: true });
  const updated = await models.StaffAccount.findById(staff._id).select('+passwordHash');
  assert.equal(updated.status, 'locked'); assert.equal(updated.role, 'Staff'); assert.equal(bcrypt.getRounds(updated.passwordHash), 12);
  assert.equal(await bcrypt.compare(replacement, updated.passwordHash), true); assert.equal(await bcrypt.compare(replacement.trim(), updated.passwordHash), false);
  assert.equal((await reset(staff, raw, replacement)).status, 401);
  assert.ok((await models.RecoveryCode.findOne({ codeHash: hashCode(raw) })).usedAt);
  assert.equal(await models.WorkSession.countDocuments({ staffId: staff._id }), 0);
  assert.equal((await call('auth/login', { email: staff.email, password: replacement })).status, 401);
});

test('concurrent issuance leaves only last committed code valid; concurrent reset consumes exactly once', async () => {
  await clearRates(); const target = await account('concurrent@example.invalid');
  const issued = await Promise.all(Array.from({ length: 3 }, () => issue(target)));
  assert.ok(issued.every(x => [201, 503].includes(x.status))); assert.ok(issued.some(x => x.status === 201));
  const active = await models.RecoveryCode.find({ staffId: target._id, usedAt: null, expiresAt: { $gt: new Date(clock) } }).select('+codeHash');
  assert.equal(active.length, 1);
  const raw = issued.find(x => x.status === 201 && hashCode(x.body.data.code) === active[0].codeHash).body.data.code;
  const version = (await models.StaffAccount.findById(target._id)).authVersion;
  const beforeResetToken = await issueToken(await models.StaffAccount.findById(target._id), config, clock);
  assert.equal((await call('me', undefined, beforeResetToken, 'GET')).status, 200);
  const resets = await Promise.all([reset(target, raw), reset(target, raw)]);
  assert.deepEqual(resets.map(x => x.status).sort(), [200, 401]);
  assert.equal((await models.StaffAccount.findById(target._id)).authVersion, version + 1);
  assert.equal((await call('me', undefined, beforeResetToken, 'GET')).status, 401);
  assert.equal(await models.AuditLog.countDocuments({ action: 'staff.password_reset', targetAccountId: target._id }), 1);
});

test('audit failure rolls back lifecycle, issuance and reset with no partial code/hash/version change', async () => {
  await clearRates(); const target = await account('rollback@example.invalid'); const issued = await issue(target);
  const before = await models.StaffAccount.findById(target._id).select('+passwordHash');
  const recoveryCount = await models.RecoveryCode.countDocuments({ staffId: target._id });
  runtime.models = { ...models, AuditLog: { create: async () => { throw new Error('synthetic private audit failure'); } } };
  try {
    assert.equal((await call(`staff/${target._id}/lock`, { expectedStatus: 'active' }, managerToken)).status, 503);
    assert.equal((await issue(target)).status, 503);
    const failed = await reset(target, issued.body.data.code); assert.equal(failed.status, 503); assert.equal(JSON.stringify(failed.body).includes('synthetic private'), false);
    const after = await models.StaffAccount.findById(target._id).select('+passwordHash');
    assert.equal(after.status, before.status); assert.equal(after.authVersion, before.authVersion); assert.equal(after.passwordHash, before.passwordHash);
    assert.equal(await models.RecoveryCode.countDocuments({ staffId: target._id }), recoveryCount);
    assert.equal((await models.RecoveryCode.findOne({ codeHash: hashCode(issued.body.data.code) })).usedAt, null);
  } finally { runtime.models = models; }
});

test('expiry/noncanonical/unknown/pending errors are generic; operator Manager fixture resets without unlock', async () => {
  await clearRates(); const target = await account('expiry@example.invalid'); const issued = await issue(target);
  clock = Date.parse(issued.body.data.expiresAt);
  const a = await reset(target, issued.body.data.code);
  const b = await reset({ email: 'unknown@example.invalid' }, key());
  const c = await reset(target, 'not canonical');
  for (const result of [a, b, c]) { assert.equal(result.status, 401); assert.equal(result.body.error.code, 'RECOVERY_FAILED'); }
  const raw = key();
  await models.StaffAccount.updateOne({ _id: operatorManager._id }, { $set: { status: 'locked' } });
  await models.RecoveryCode.create({ staffId: operatorManager._id, codeHash: hashCode(raw), expiresAt: new Date(clock + 900000),
    usedAt: null, issuedBy: null, issuedByOperator: 'synthetic-operator-alias' });
  assert.equal((await reset(operatorManager, raw)).status, 200);
  assert.equal((await models.StaffAccount.findById(operatorManager._id)).status, 'locked');
  assert.equal(await models.AuditLog.countDocuments({ action: 'manager.password_reset', actorId: operatorManager._id }), 1);
  const notApproved = await account('still-pending@example.invalid', 'Staff', 'pending');
  assert.equal((await issue(notApproved)).status, 409);
  assert.equal((await reset(notApproved, key())).status, 401);
});

test('five concurrent account failures then429; reset IP budget counts invalid bodies and ignores forged forwarding', async () => {
  await clearRates(); const target = { email: 'rate@example.invalid' };
  const failures = await Promise.all(Array.from({ length: 8 }, () => reset(target, key())));
  assert.equal(failures.filter(x => x.status === 401).length, 5); assert.equal(failures.filter(x => x.status === 429).length, 3);
  assert.ok(Number(failures.find(x => x.status === 429).headers.get('retry-after')) >= 1);
  const bucket = rateBucket(config.rateKey, 'reset', 'account', target.email, clock);
  assert.equal((await models.AuthRateLimit.findOne({ key: bucket.key })).count, 5);
  await clearRates();
  for (let i = 0; i < 30; i++) assert.equal((await call('auth/reset-password', {}, undefined, 'POST', { 'X-Forwarded-For': `203.0.113.${i}` })).status, 422);
  assert.equal((await reset(target, key())).status, 429);
  clock += 900000;
  assert.equal((await reset(target, key())).status, 401);
});

test('expiry is rechecked after bcrypt before consumption; authVersion cannot overflow', async () => {
  await clearRates();
  const target = await account('consumption-expiry@example.invalid');
  const issued = await issue(target);
  const prior = await models.StaffAccount.findById(target._id).select('+passwordHash');
  let reads = 0;
  await assert.rejects(resetPassword({ ...runtime, now: () => ++reads <= 2 ? clock : Date.parse(issued.body.data.expiresAt) },
    { email: target.email, code: issued.body.data.code, password, confirmPassword: password }), e => e.code === 'RECOVERY_FAILED');
  assert.equal((await models.RecoveryCode.findOne({ codeHash: hashCode(issued.body.data.code) })).usedAt, null);
  assert.equal((await models.StaffAccount.findById(target._id).select('+passwordHash')).passwordHash, prior.passwordHash);
  await models.StaffAccount.updateOne({ _id: target._id }, { $set: { authVersion: Number.MAX_SAFE_INTEGER } });
  assert.equal((await issue(target)).status, 503);
  assert.equal((await models.StaffAccount.findById(target._id)).authVersion, Number.MAX_SAFE_INTEGER);
});

test('exhausted reset budget survives new server process and DB failure fails closed', async () => {
  clock = Date.now();
  managerToken = await issueToken(manager, config, clock);
  await clearRates(); const target = { email: 'restart-rate@example.invalid' };
  for (let i = 0; i < 5; i++) assert.equal((await reset(target, key())).status, 401);
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); server = null;
  const child = spawn(process.execPath, [fileURLToPath(new URL('../src/server.js', import.meta.url))], { env: { ...process.env,
    NODE_ENV: 'test', HOST: '127.0.0.1', PORT: String(port), IDENTITY_MONGODB_URI: config.uri,
    IDENTITY_JWT_KEY_B64URL: config.jwtKey.toString('base64url'), IDENTITY_RATE_HMAC_KEY_B64URL: config.rateKey.toString('base64url'),
    IDENTITY_ALLOWED_ORIGINS: config.origins.join(','), IDENTITY_TRUST_PROXY_CIDRS: '', ...credentials }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Child startup timeout')), 10000);
      child.stdout.on('data', data => { if (data.toString().includes('identity process listening')) { clearTimeout(timer); resolve(); } });
      child.once('error', e => { clearTimeout(timer); reject(e); }); child.once('exit', () => { clearTimeout(timer); reject(new Error('Child exited early')); });
    });
    assert.equal((await reset(target, key())).status, 429);
    assert.equal((await fetch(`${base}/health/ready`)).status, 200);
  } finally { const exited = once(child, 'exit'); child.kill(); await exited; }
  server = createApp(runtime).listen(port, '127.0.0.1'); await once(server, 'listening');
  await connection.close();
  assert.equal((await reset(target, key())).status, 503);
  assert.equal((await call('staff', undefined, managerToken, 'GET')).status, 503);
});
