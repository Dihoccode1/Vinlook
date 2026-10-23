import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { createIdentityModels } from '../src/models/index.js';
import { createAuthRuntime, verifyIdentityIndexes } from '../src/auth/runtime.js';
import { loadAuthConfig } from '../src/auth/config.js';
import { rateBucket, consumeBudget, RateExceeded } from '../src/auth/rate.js';
import { verifyToken } from '../src/auth/token.js';
import { createApp } from '../src/app.js';

let connection, models, config, runtime, server, base;
let clock = Date.now();
const password = 'Synthetic-password-2026!';
const image = 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907';
async function listen(value) {
  server = createApp(value).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
}
async function closeServer() { if (server) await new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
async function post(operation, body, headers = {}) {
  const response = await fetch(`${base}/api/v1/auth/${operation}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const result = await response.json();
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(result.requestId ?? result.error.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(JSON.stringify(result).includes('passwordHash'), false);
  assert.equal(JSON.stringify(result).includes(password), false);
  return { response, result, status: response.status };
}
async function clearRates() { await models.AuthRateLimit.deleteMany({}); }

before(async () => {
  const name = process.env.VINLOOK_TEST_MONGO_CONTAINER;
  assert.match(name ?? '', /^vinlook-task005-mongo-[a-zA-Z0-9_-]+$/);
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }));
  assert.equal(container.Config.Labels['vinlook.task'], 'TASK-005');
  assert.equal(container.Config.Image, image);
  const [binding] = container.NetworkSettings.Ports['27017/tcp'];
  assert.equal(binding.HostIp, '127.0.0.1');
  assert.match(binding.HostPort, /^[0-9]+$/);
  const uri = `mongodb://127.0.0.1:${binding.HostPort}/vinlook_identity_task005?replicaSet=vinlook_task005&directConnection=true`;
  config = loadAuthConfig('test', { IDENTITY_MONGODB_URI: uri,
    IDENTITY_JWT_KEY_B64URL: randomBytes(32).toString('base64url'),
    IDENTITY_RATE_HMAC_KEY_B64URL: randomBytes(32).toString('base64url'),
    IDENTITY_ALLOWED_ORIGINS: 'https://test.example.invalid' });
  connection = await mongoose.createConnection(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 3000 }).asPromise();
  assert.equal((await connection.db.listCollections().toArray()).length, 0, 'Fresh isolated database required');
  assert.equal((await connection.db.admin().command({ hello: 1 })).setName, 'vinlook_task005');
  models = createIdentityModels(connection);
  await assert.rejects(verifyIdentityIndexes(models));
  assert.equal((await connection.db.listCollections().toArray()).length, 0);
  for (const model of Object.values(models)) { await model.createCollection(); await model.createIndexes(); }
  runtime = await createAuthRuntime(models, config, () => clock);
  await listen(runtime);
});
after(async () => { await closeServer(); if (connection) await connection.close(); });

test('index gate rejects missing/mismatched indexes without repairing them', async () => {
  await models.StaffAccount.collection.dropIndex('email_1');
  await models.StaffAccount.collection.createIndex({ email: 1 });
  await assert.rejects(verifyIdentityIndexes(models));
  assert.equal((await models.StaffAccount.collection.indexes()).find(x => x.name === 'email_1').unique, undefined);
  await models.StaffAccount.collection.dropIndex('email_1');
  await models.StaffAccount.createIndexes();
  await verifyIdentityIndexes(models);
});

test('strict signup rejects short, over-byte, confirmation and injected role; Unicode password preserved', async () => {
  const seed = { fullName: ' Test Staff ', email: 'unicode@example.invalid', password, confirmPassword: password };
  for (const input of [ { ...seed, role: 'Manager' }, { ...seed, password: 'short', confirmPassword: 'short' },
    { ...seed, password: '😀'.repeat(19), confirmPassword: '😀'.repeat(19) }, { ...seed, confirmPassword: `${password} ` } ]) {
    assert.equal((await post('register', input)).status, 422);
  }
  await clearRates();
  const unicodePassword = '😀'.repeat(15) + ' ';
  assert.equal((await post('register', { ...seed, password: unicodePassword, confirmPassword: unicodePassword })).status, 201);
  const account = await models.StaffAccount.findOne({ email: seed.email }).select('+passwordHash');
  assert.equal(account.fullName, 'Test Staff');
  assert.equal(bcrypt.getRounds(account.passwordHash), 12);
  assert.equal(await bcrypt.compare(unicodePassword, account.passwordHash), true);
  assert.equal(await bcrypt.compare(unicodePassword.trim(), account.passwordHash), false);
  assert.equal(account.role, 'Staff'); assert.equal(account.status, 'pending'); assert.equal(account.authVersion, 0);
});

test('normalized duplicate signup is generic409 and pending account never receives JWT', async () => {
  await clearRates();
  assert.equal((await post('register', { fullName: 'Duplicate', email: ' UNICODE@EXAMPLE.INVALID ', password, confirmPassword: password })).status, 409);
  const pending = await post('login', { email: 'unicode@example.invalid', password: '😀'.repeat(15) + ' ' });
  assert.equal(pending.status, 401); assert.equal(pending.result.error.code, 'AUTHENTICATION_FAILED');
});

test('active login issues safe token; wrong, unknown and locked share generic401; success retains failures', async () => {
  await clearRates();
  const started = performance.now();
  const hash = await bcrypt.hash(password, 12);
  const hashMs = performance.now() - started;
  const account = await models.StaffAccount.create({ fullName: 'Active Fixture', email: 'active@example.invalid', passwordHash: hash,
    status: 'active', role: 'Staff', authVersion: 2 });
  const compareStarted = performance.now();
  assert.equal(await bcrypt.compare(password, hash), true);
  console.log(JSON.stringify({ measurement: 'bcrypt12-single-local-sample', hashMs: Math.round(hashMs), compareMs: Math.round(performance.now() - compareStarted) }));
  const wrong = await post('login', { email: account.email, password: 'x' });
  const unknown = await post('login', { email: 'unknown@example.invalid', password });
  await models.StaffAccount.create({ fullName: 'Locked Fixture', email: 'locked@example.invalid', passwordHash: hash, status: 'locked', role: 'Staff', authVersion: 0 });
  const locked = await post('login', { email: 'locked@example.invalid', password });
  for (const item of [wrong, unknown, locked]) { assert.equal(item.status, 401); assert.equal(item.result.error.message, 'Login could not be completed'); }
  const success = await post('login', { email: ' ACTIVE@EXAMPLE.INVALID ', password });
  assert.equal(success.status, 200); assert.equal(success.result.data.expiresIn, 7200);
  const claims = await verifyToken(success.result.data.accessToken, config, clock);
  assert.equal(claims.sub, String(account._id)); assert.equal(claims.authVersion, 2);
  assert.deepEqual(Object.keys(success.result.data.account).sort(), ['email', 'fullName', 'id', 'role', 'status']);
  const bucket = rateBucket(config.rateKey, 'login', 'account', account.email, clock);
  assert.equal((await models.AuthRateLimit.findOne({ key: bucket.key })).count, 1);
});

test('malformed/oversized/invalid bodies count against IP; forged forwarding cannot evade registration budget', async () => {
  await clearRates();
  assert.equal((await post('register', '{')).status, 400);
  assert.equal((await post('register', JSON.stringify({ x: 'x'.repeat(17000) }))).status, 413);
  for (let i = 0; i < 3; i++) assert.equal((await post('register', {}, { 'X-Forwarded-For': `203.0.113.${i}` })).status, 422);
  const limited = await post('register', {}, { 'X-Forwarded-For': '198.51.100.9' });
  assert.equal(limited.status, 429); assert.ok(Number(limited.response.headers.get('retry-after')) >= 1);
  const raw = await models.AuthRateLimit.collection.find({}).toArray();
  assert.equal(raw.length, 1); assert.equal(raw[0].count, 5);
  assert.match(raw[0].key, /^[0-9a-f]{64}$/);
});

test('CORS exact allowlist/preflight rejects unapproved origins without consuming attempts', async () => {
  await clearRates();
  assert.equal((await post('login', {}, { Origin: 'https://evil.example.invalid' })).status, 403);
  const preflight = await fetch(`${base}/api/v1/auth/login`, { method: 'OPTIONS', headers: { Origin: 'https://test.example.invalid', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,authorization' } });
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://test.example.invalid');
  assert.equal(preflight.headers.get('access-control-allow-credentials'), null);
  assert.equal(await models.AuthRateLimit.countDocuments({}), 0);
  const allowed = await post('login', {}, { Origin: 'https://test.example.invalid' });
  assert.equal(allowed.status, 422); assert.equal(allowed.response.headers.get('access-control-allow-origin'), 'https://test.example.invalid');
});

test('concurrent login failures return exactly five401 and remaining429 without changing account status', async () => {
  await clearRates();
  const results = await Promise.all(Array.from({ length: 8 }, () => post('login', { email: 'active@example.invalid', password: 'wrong' })));
  assert.equal(results.filter(x => x.status === 401).length, 5);
  assert.equal(results.filter(x => x.status === 429).length, 3);
  assert.equal((await models.StaffAccount.findOne({ email: 'active@example.invalid' })).status, 'active');
  assert.equal((await post('login', { email: 'active@example.invalid', password })).status, 429);
});

test('atomic IP budget admits exactly30 of40 concurrent claims; counter survives new server process', async () => {
  await clearRates();
  const bucket = rateBucket(config.rateKey, 'login', 'ip', 'synthetic-concurrent-ip', clock);
  const results = await Promise.allSettled(Array.from({ length: 40 }, () => consumeBudget(models.AuthRateLimit, bucket, 30)));
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 30);
  assert.ok(results.filter(x => x.status === 'rejected').every(x => x.reason instanceof RateExceeded));
  await clearRates();
  for (let i = 0; i < 5; i++) assert.equal((await post('register', {})).status, 422);
  const port = server.address().port;
  await closeServer();
  const child = spawn(process.execPath, [fileURLToPath(new URL('../src/server.js', import.meta.url))], {
    env: { ...process.env, NODE_ENV: 'test', HOST: '127.0.0.1', PORT: String(port),
      IDENTITY_MONGODB_URI: config.uri, IDENTITY_JWT_KEY_B64URL: config.jwtKey.toString('base64url'),
      IDENTITY_RATE_HMAC_KEY_B64URL: config.rateKey.toString('base64url'),
      IDENTITY_ALLOWED_ORIGINS: config.origins.join(','), IDENTITY_TRUST_PROXY_CIDRS: '',
      IDENTITY_CONTENT_SERVICE_KEY_B64URL: randomBytes(32).toString('base64url'),
      IDENTITY_USAGE_SERVICE_KEY_B64URL: randomBytes(32).toString('base64url') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Test child startup timeout')), 10000);
      child.stdout.on('data', data => { if (data.toString().includes('identity process listening')) { clearTimeout(timer); resolve(); } });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Test child exited before startup')); });
    });
    assert.equal((await post('register', {})).status, 429);
  } finally {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
  runtime = await createAuthRuntime(models, config, () => clock);
  await listen(runtime);
  assert.equal((await post('register', {})).status, 429);
  clock += 3600000;
  assert.equal((await post('register', {})).status, 422);
  assert.ok(await models.AuthRateLimit.countDocuments({}) >= 1);
});

test('login IP budget includes invalid input and resets in new window', async () => {
  await clearRates();
  for (let i = 0; i < 30; i++) assert.equal((await post('login', {})).status, 422);
  assert.equal((await post('login', {})).status, 429);
  clock += 900000;
  assert.equal((await post('login', {})).status, 422);
  assert.equal((await fetch(`${base}/health/ready`)).status, 503);
});

test('closed DB fails auth closed503 with redacted error response', async () => {
  await connection.close();
  const result = await post('login', { email: 'active@example.invalid', password });
  assert.equal(result.status, 503);
  assert.equal(result.result.error.code, 'DEPENDENCY_UNAVAILABLE');
  assert.equal(JSON.stringify(result.result).includes('mongodb'), false);
});
