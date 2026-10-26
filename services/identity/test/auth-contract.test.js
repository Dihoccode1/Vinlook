import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import bcrypt from 'bcrypt';
import { authRouter } from '../src/modules/auth/auth.route.js';
import { RateExceeded } from '../src/auth/rate.js';

const password = 'Synthetic-password-2026!';
const passwordHash = await bcrypt.hash(password, 12);
export function syntheticAuthRuntime(scenario = 'active') {
  return {
    config: {
      origins: ['https://fixture.invalid'],
      rateKey: Buffer.alloc(32, 1),
      jwtKey: Buffer.alloc(32, 2),
      issuer: 'fixture-identity',
      audience: 'fixture-staff',
    },
    now: () => 1793000000000,
    dummyHash: passwordHash,
    models: {
      AuthRateLimit: {
        async exists() {
          return false;
        },
        async findOneAndUpdate() {
          if (scenario === 'rate') throw new RateExceeded(120);
          return { count: 1 };
        },
      },
      StaffAccount: {
        async create(value) {
          if (scenario === 'duplicate') throw Object.assign(Error('synthetic'), { code: 11000 });
          if (scenario === 'dependency') throw Error('PRIVATE_DATABASE_MESSAGE');
          assert.equal(await bcrypt.compare(password, value.passwordHash), true);
          assert.equal(value.role, 'Staff');
          assert.equal(value.status, 'pending');
          return { _id: '0'.repeat(24), ...value };
        },
        findOne() {
          return {
            async select(selection) {
              assert.equal(selection, '+passwordHash');
              if (scenario === 'dependency') throw Error('PRIVATE_DATABASE_MESSAGE');
              if (scenario === 'missing') return null;
              return {
                _id: '1'.repeat(24),
                fullName: 'Synthetic Staff',
                email: 'fixture@example.test',
                role: 'Manager',
                status: scenario === 'inactive' ? 'locked' : 'active',
                authVersion: 0,
                passwordHash,
              };
            },
          };
        },
      },
    },
  };
}
export async function requestAuth(factory, scenario, path, body, options = {}) {
  const app = express();
  app.use('/auth', factory(syntheticAuthRuntime(scenario)));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
      ...options,
    });
    const payload = response.status === 204 ? null : await response.json();
    if (payload?.requestId) payload.requestId = 'request-id';
    if (payload?.error?.requestId) payload.error.requestId = 'request-id';
    return {
      status: response.status,
      body: payload,
      retryAfter: response.headers.get('retry-after'),
      cacheControl: response.headers.get('cache-control'),
      allowOrigin: response.headers.get('access-control-allow-origin'),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('auth contract retains pending registration, confirmation rules and duplicate privacy', async () => {
  const registration = {
    email: ' Fixture@example.test ',
    password,
    confirmPassword: password,
    fullName: 'Synthetic Staff',
  };
  const created = await requestAuth(authRouter, 'active', 'register', registration);
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.data, { accountId: '0'.repeat(24), status: 'pending' });
  assert.equal(
    (await requestAuth(authRouter, 'duplicate', 'register', registration)).body.error.code,
    'REGISTRATION_FAILED',
  );
  assert.equal(
    (
      await requestAuth(authRouter, 'active', 'register', {
        ...registration,
        confirmPassword: 'wrong',
      })
    ).status,
    422,
  );
});
test('auth contract retains active-account login, token DTO and generic rejection', async () => {
  const input = { email: 'fixture@example.test', password };
  const valid = await requestAuth(authRouter, 'active', 'login', input);
  assert.equal(valid.status, 200);
  assert.equal(valid.body.data.expiresIn, 7200);
  assert.equal(valid.body.data.account.role, 'Manager');
  assert.equal(valid.cacheControl, 'no-store');
  assert.equal(JSON.stringify(valid).includes('passwordHash'), false);
  for (const scenario of ['inactive', 'missing'])
    assert.equal(
      (await requestAuth(authRouter, scenario, 'login', input)).body.error.code,
      'AUTHENTICATION_FAILED',
    );
  assert.equal(
    (await requestAuth(authRouter, 'active', 'login', { ...input, password: 'wrong' })).status,
    401,
  );
});
test('auth contract preserves rate limits, malformed JSON, body bound, CORS and safe failures', async () => {
  const input = { email: 'fixture@example.test', password };
  const limited = await requestAuth(authRouter, 'rate', 'login', input);
  assert.equal(limited.status, 429);
  assert.equal(limited.retryAfter, '120');
  assert.equal(
    (await requestAuth(authRouter, 'active', 'login', '{')).body.error.code,
    'MALFORMED_JSON',
  );
  assert.equal((await requestAuth(authRouter, 'active', 'login', 'x'.repeat(17000))).status, 413);
  const denied = await requestAuth(authRouter, 'active', 'login', input, {
    headers: { Origin: 'https://denied.invalid' },
  });
  assert.equal(denied.status, 403);
  const failure = await requestAuth(authRouter, 'dependency', 'login', input);
  assert.equal(failure.status, 503);
  assert.equal(JSON.stringify(failure).includes('PRIVATE_DATABASE_MESSAGE'), false);
});
