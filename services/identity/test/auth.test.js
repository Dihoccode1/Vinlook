import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { SignJWT } from 'jose';
import { loadAuthConfig } from '../src/auth/config.js';
import { issueToken, verifyToken } from '../src/auth/token.js';
import { consumeBudget, rateBucket } from '../src/auth/rate.js';

export function authEnvironment() {
  return { IDENTITY_MONGODB_URI: 'mongodb://127.0.0.1/vinlook_identity',
    IDENTITY_JWT_KEY_B64URL: randomBytes(32).toString('base64url'),
    IDENTITY_RATE_HMAC_KEY_B64URL: randomBytes(32).toString('base64url'),
    IDENTITY_ALLOWED_ORIGINS: 'https://test.example.invalid' };
}

test('auth config validates separate canonical keys, explicit DB/origins/proxy without exposing input', () => {
  const env = authEnvironment();
  const config = loadAuthConfig('test', env);
  assert.deepEqual(config.proxyCidrs, []);
  const sentinel = 'synthetic-sensitive-input';
  for (const patch of [
    { IDENTITY_MONGODB_URI: `mongodb://127.0.0.1/${sentinel}` },
    { IDENTITY_JWT_KEY_B64URL: sentinel },
    { IDENTITY_RATE_HMAC_KEY_B64URL: env.IDENTITY_JWT_KEY_B64URL },
    { IDENTITY_JWT_KEY_B64URL: `${env.IDENTITY_JWT_KEY_B64URL}=` },
    { IDENTITY_ALLOWED_ORIGINS: '*' }, { IDENTITY_ALLOWED_ORIGINS: 'https://user:password@example.invalid' },
    ...['true', '1', '0.0.0.0/0', '::/0', '127.0.0.1/33'].map(IDENTITY_TRUST_PROXY_CIDRS => ({ IDENTITY_TRUST_PROXY_CIDRS })),
  ]) assert.throws(() => loadAuthConfig('test', { ...env, ...patch }), error => !error.message.includes(sentinel));
  assert.throws(() => loadAuthConfig('production', { ...env, IDENTITY_ALLOWED_ORIGINS: 'http://localhost:5173' }));
  assert.throws(() => loadAuthConfig('test', { ...env, IDENTITY_ALLOWED_ORIGINS: undefined }));
  assert.deepEqual(loadAuthConfig('test', { ...env, IDENTITY_TRUST_PROXY_CIDRS: '127.0.0.1/32,::1/128' }).proxyCidrs,
    ['127.0.0.1/32', '::1/128']);
});

test('JWT has exact two-hour claims and rejects malformed, expired, algorithm/namespace/claim errors', async () => {
  const config = loadAuthConfig('test', authEnvironment());
  const now = Date.now();
  const token = await issueToken({ _id: '0123456789abcdef01234567', authVersion: 3 }, config, now);
  const payload = await verifyToken(token, config, now);
  assert.equal(payload.exp - payload.iat, 7200);
  assert.equal(payload.authVersion, 3);
  assert.equal(payload.role, undefined);
  await assert.rejects(verifyToken(token, config, (payload.exp * 1000)));
  await assert.rejects(verifyToken('not.a.token', config, now));
  for (const change of [{ sub: 'invalid' }, { sub: undefined }, { authVersion: -1 }, { authVersion: undefined },
    { authVersion: 1.5 }, { aud: 'wrong' }, { iss: 'wrong' }, { exp: payload.exp + 1 }, { iat: undefined }]) {
    const bad = await new SignJWT({ ...payload, ...change }).setProtectedHeader({ alg: 'HS256' }).sign(config.jwtKey);
    await assert.rejects(verifyToken(bad, config, now));
  }
  const wrongAlgorithm = await new SignJWT(payload).setProtectedHeader({ alg: 'HS384' }).sign(randomBytes(48));
  await assert.rejects(verifyToken(wrongAlgorithm, config, now));
  await assert.rejects(verifyToken(token, { ...config, jwtKey: randomBytes(32) }, now));
});

test('rate buckets are UTC aligned and HMAC separates operations/scopes, not raw identities', () => {
  const secret = randomBytes(32);
  const now = 1800001;
  const bucket = rateBucket(secret, 'login', 'account', 'test@example.invalid', now);
  assert.equal(bucket.windowStart.getTime(), 1800000);
  assert.equal(bucket.expiresAt.getTime(), 2700000);
  assert.equal(bucket.retryAfter, 900);
  assert.match(bucket.key, /^[0-9a-f]{64}$/);
  assert.notEqual(bucket.key, rateBucket(secret, 'login', 'ip', 'test@example.invalid', now).key);
  assert.notEqual(bucket.key, rateBucket(secret, 'register', 'account', 'test@example.invalid', now).key);
});

test('first-insert conflicts stop after three application retries', async () => {
  let inserts = 0;
  await assert.rejects(consumeBudget({ findOneAndUpdate: async () => null, findOne: async () => null,
    create: async () => { inserts++; throw Object.assign(new Error('duplicate'), { code: 11000 }); } },
  rateBucket(randomBytes(32), 'login', 'ip', 'fixture'), 30));
  assert.equal(inserts, 3);
});
