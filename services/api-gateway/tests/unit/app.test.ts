import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createApp as createPoiApp } from '../../../poi-service/src/app.js';

test('gateway forwards POI search, status and errors through real HTTP', async () => {
  const upstream = createPoiApp({
    async ready() {},
    async find() { return undefined; },
    async list(query) {
      assert.equal(query.q, 'Chợ');
      return { data: [], pagination: { page: 1, limit: 20, total: 0 } };
    },
  }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => upstream.once('listening', resolve));
  try {
    const app = createApp(`http://127.0.0.1:${(upstream.address() as AddressInfo).port}`);
    assert.equal((await request(app).get('/api/pois').query({ q: 'Chợ' })).status, 200);
    assert.equal((await request(app).get('/api/pois/bad')).status, 400);
    assert.equal((await request(app).get('/api/pois/44444444-4444-4444-8444-444444444444')).status, 404);
    assert.equal((await request(app).get('/health/ready')).status, 200);
    assert.equal((await request(app).post('/api/pois')).status, 405);
  } finally { await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve())); }
});

test('unreachable service returns 502 and gateway readiness returns 503', async () => {
  const app = createApp('http://127.0.0.1:1');
  assert.equal((await request(app).get('/api/pois')).status, 502);
  assert.equal((await request(app).get('/health/ready')).status, 503);
});
