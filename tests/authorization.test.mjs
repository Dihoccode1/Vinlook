import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import { loadServiceCredentials } from '../services/identity/src/authorization.js';
const key = () => randomBytes(32).toString('base64url');

test('caller config requires distinct canonical32-byte credentials and bounded absolute rotation expiry', () => {
  const config = { jwtKey: randomBytes(32), rateKey: randomBytes(32) };
  const env = { IDENTITY_CONTENT_SERVICE_KEY_B64URL: key(), IDENTITY_USAGE_SERVICE_KEY_B64URL: key() };
  const now = Date.now();
  assert.ok(loadServiceCredentials(config, env, now).content.current);
  for (const patch of [{ IDENTITY_CONTENT_SERVICE_KEY_B64URL: undefined },
    { IDENTITY_USAGE_SERVICE_KEY_B64URL: env.IDENTITY_CONTENT_SERVICE_KEY_B64URL },
    { IDENTITY_CONTENT_SERVICE_KEY_B64URL: config.jwtKey.toString('base64url') },
    { IDENTITY_CONTENT_PREVIOUS_SERVICE_KEY_B64URL: key() },
    { IDENTITY_CONTENT_PREVIOUS_KEY_EXPIRES_AT: new Date(now).toISOString() },
    { IDENTITY_CONTENT_PREVIOUS_SERVICE_KEY_B64URL: key(), IDENTITY_CONTENT_PREVIOUS_KEY_EXPIRES_AT: new Date(now + 86400001).toISOString() },
  ]) assert.throws(() => loadServiceCredentials(config, { ...env, ...patch }, now));
  assert.ok(loadServiceCredentials(config, { ...env, IDENTITY_CONTENT_PREVIOUS_SERVICE_KEY_B64URL: key(),
    IDENTITY_CONTENT_PREVIOUS_KEY_EXPIRES_AT: new Date(now - 1).toISOString() }, now));
});

for (const name of ['content', 'usage']) {
  const adapter = await import(`../services/${name}/src/authorization.js`);
  test(`${name}: private config rejects unsafe origin, key and production HTTP`, () => {
    const env = { IDENTITY_BASE_URL: 'https://identity.example.invalid', [`${name.toUpperCase()}_IDENTITY_SERVICE_KEY_B64URL`]: key(), IDENTITY_JWT_KEY_B64URL: 'unused' };
    assert.deepEqual(Object.keys(adapter.loadAuthorizationConfig('production', env)).sort(), ['baseUrl', 'key']);
    for (const url of ['http://localhost:3001', 'https://user:secret@example.invalid', 'https://example.invalid/path', 'https://example.invalid?x=1', 'https://example.invalid#x']) {
      assert.throws(() => adapter.loadAuthorizationConfig('production', { ...env, IDENTITY_BASE_URL: url }));
    }
    assert.throws(() => adapter.loadAuthorizationConfig('test', { ...env, IDENTITY_BASE_URL: 'http://external.example.invalid' }));
  });

  test(`${name}: redirects, invalid/oversize bodies, failure and timeout fail closed; no cache or retries`, async () => {
    let hits = 0;
    let behavior = 'ok';
    const app = express();
    app.post('/api/v1/internal/authorize', (_req, res) => {
      hits++;
      if (behavior === 'timeout') return;
      if (behavior === 'body-timeout') { res.set('Content-Type', 'application/json'); res.write('{'); return; }
      if (behavior === 'redirect') return res.redirect(307, '/destination');
      if (behavior === 'oversize') return res.json({ x: 'x'.repeat(17000) });
      if (behavior === 'invalid') return res.json({ data: { role: 'Manager' } });
      if (behavior === 'fail') return res.status(503).json({ error: { code: 'PRIVATE_DB_ERROR', message: 'synthetic secret' } });
      if (behavior === 'denied') return res.status(403).json({ error: { code: 'ACCESS_DENIED', message: 'Access is denied', requestId: randomUUID() } });
      res.json({ data: { account: { id: '0123456789abcdef01234567', role: 'Staff', status: 'active', authVersion: 0 }, currentWorkSession: null }, requestId: randomUUID() });
    });
    app.all('/destination', () => { assert.fail('Redirect followed'); });
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const cfg = adapter.loadAuthorizationConfig('test', { IDENTITY_BASE_URL: `http://127.0.0.1:${server.address().port}`, [`${name.toUpperCase()}_IDENTITY_SERVICE_KEY_B64URL`]: key() });
    try {
      for (let i = 0; i < 2; i++) assert.equal((await adapter.authorize('Bearer a.b.c', cfg)).account.role, 'Staff');
      assert.equal(hits, 2);
      await assert.rejects(adapter.authorize(undefined, cfg), e => e.status === 401);
      assert.equal(hits, 2);
      for (const kind of ['redirect', 'oversize', 'invalid', 'fail', 'denied', 'timeout', 'body-timeout']) {
        behavior = kind;
        const prior = hits;
        const start = performance.now();
        await assert.rejects(adapter.authorize('Bearer a.b.c', cfg), e => e.status === (kind === 'denied' ? 403 : 503)
          && !e.message.includes('synthetic secret'));
        assert.equal(hits, prior + 1);
        if (kind.endsWith('timeout')) assert.ok(performance.now() - start >= 2800 && performance.now() - start < 5000);
      }
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await assert.rejects(adapter.authorize('Bearer a.b.c', cfg), e => e.status === 503);
  });
}
