import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createApp as createPoiApp } from '../../../poi-service/src/app.js';
import { createApp as createNavigationApp } from '../../../navigation-service/src/app.js';

test('gateway forwards POI search, status and errors through real HTTP', async () => {
  const upstream = createPoiApp({
    async ready() {},
    async find() { return undefined; },
    async findImage() { return undefined; },
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

test('gateway preserves image bytes, content type, ETag and 304 responses', async () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x80, 0xfe, 0xd9]);
  const upstream = createPoiApp({
    async ready() {},
    async find() { return undefined; },
    async list() { return { data: [], pagination: { page: 1, limit: 20, total: 0 } }; },
    async findImage() { return { content: bytes, contentType: 'image/jpeg', sha256: 'a'.repeat(64) }; },
  }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => upstream.once('listening', resolve));
  try {
    const app = createApp(`http://127.0.0.1:${(upstream.address() as AddressInfo).port}`);
    const url = '/api/pois/11111111-1111-4111-8111-111111111111/image';
    const response = await request(app).get(url);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, bytes);
    assert.match(response.headers['content-type'], /^image\/jpeg/);
    assert.equal(response.headers.etag, `"${'a'.repeat(64)}"`);
    assert.equal(response.headers['cache-control'], 'public, max-age=300');
    assert.equal((await request(app).get(url).set('If-None-Match', response.headers.etag)).status, 304);
  } finally { await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve())); }
});

test('unreachable service returns 502 and gateway readiness returns 503', async () => {
  const app = createApp('http://127.0.0.1:1');
  assert.equal((await request(app).get('/api/pois')).status, 502);
  assert.equal((await request(app).get('/health/ready')).status, 503);
});

test('gateway forwards route requests and validation errors over HTTP', async () => {
  const waypoints = [{ latitude: 10.77, longitude: 106.69 }, { latitude: 10.78, longitude: 106.7 }];
  const upstream = createNavigationApp({ async calculate(input) {
    assert.deepEqual(input.waypoints, waypoints);
    return { profile: 'driving', provider: 'Valhalla', optimization: 'shortest', distance: 500, duration: 100,
      geometry: { type: 'LineString', coordinates: [[106.69, 10.77], [106.7, 10.78]] },
      legs: [{ distance: 500, duration: 100, steps: [] }],
    };
  } }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => upstream.once('listening', resolve));
  try {
    const app = createApp('http://127.0.0.1:1', `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`);
    const res = await request(app).post('/api/routes').send({ waypoints });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.distance, 500);
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal((await request(app).post('/api/routes').send({ waypoints: [] })).status, 400);
    assert.equal((await request(app).post('/api/routes').type('json').send('{')).status, 400);
  } finally { await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve())); }
  assert.equal((await request(createApp('http://127.0.0.1:1', 'http://127.0.0.1:1')).post('/api/routes').send({ waypoints })).status, 502);
});
