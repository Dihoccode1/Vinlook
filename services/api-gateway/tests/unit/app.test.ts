import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { create_app } from '../../src/app.js';
import { create_app as createPoiApp } from '../../../poi-service/src/app.js';
import { create_app as createNavigationApp } from '../../../navigation-service/src/app.js';
import { create_app as createTranslationApp } from '../../../translation-service/src/app.js';

test('gateway forwards language catalog and translation POST before read-only POI routes', async () => {
  const id = 'POI001';
  const upstream = createTranslationApp({ ready: async () => {}, get: async (poi_id, language) => {
    assert.equal(poi_id, id); assert.equal(language, 'en');
    return { data: { poi_id: poi_id, language, source_language: 'vi', source_hash: 'a'.repeat(64), name: 'Market', description: 'A market', provider: 'test', translated_at: new Date().toISOString() }, original: false, from_cache: true };
  } }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => upstream.once('listening', resolve));
  try {
    const app = create_app(undefined, undefined, `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`);
    assert.equal((await request(app).get('/api/languages').expect(200)).body.data.length, 16);
    const response = await request(app).post(`/api/pois/${id}/translation`).send({ language: 'en' }).expect(200);
    assert.equal(response.body.from_cache, true); assert.equal(response.headers['cache-control'], 'no-store');
    await request(app).post(`/api/pois/${id}/translation`).send({ language: 'xx' }).expect(400);
  } finally { await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve())); }
});

test('gateway forwards POI search, status and errors through real HTTP', async () => {
  const upstream = createPoiApp({
    async ready() {},
    async find() { return undefined; },
    async find_image() { return undefined; },
    async list(query) {
      assert.equal(query.q, 'Chợ');
      return { data: [], pagination: { page: 1, limit: 20, total: 0 } };
    },
  }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => upstream.once('listening', resolve));
  try {
    const app = create_app(`http://127.0.0.1:${(upstream.address() as AddressInfo).port}`);
    assert.equal((await request(app).get('/api/pois').query({ q: 'Chợ' })).status, 200);
    assert.equal((await request(app).get('/api/pois/bad')).status, 400);
    assert.equal((await request(app).get('/api/pois/POI002')).status, 404);
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
    async find_image() { return { content: bytes, content_type: 'image/jpeg', sha256: 'a'.repeat(64) }; },
  }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => upstream.once('listening', resolve));
  try {
    const app = create_app(`http://127.0.0.1:${(upstream.address() as AddressInfo).port}`);
    const url = '/api/pois/POI001/image';
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
  const app = create_app('http://127.0.0.1:1');
  assert.equal((await request(app).get('/api/pois')).status, 502);
  assert.equal((await request(app).get('/health/ready')).status, 503);
});

test('gateway forwards route requests and validation errors over HTTP', async () => {
  const waypoints = [{ latitude: 10.77, longitude: 106.69 }, { latitude: 10.78, longitude: 106.7 }];
  const upstream = createNavigationApp({ async calculate(input) {
    assert.deepEqual(input.waypoints, waypoints);
    return { profile: 'driving', provider: 'Valhalla', optimization: 'shortest', distance: 500, duration: 100,
      geometry: { type: 'LineString', coordinates: [[106.69, 10.77], [106.7, 10.78]] },
      legs: [{ distance: 500, duration: 100, geometry: { type: 'LineString', coordinates: [[106.69, 10.77], [106.7, 10.78]] }, steps: [] }],
    };
  } }).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => upstream.once('listening', resolve));
  try {
    const app = create_app('http://127.0.0.1:1', `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`);
    const res = await request(app).post('/api/routes').send({ waypoints });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.distance, 500);
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal((await request(app).post('/api/routes').send({ waypoints: [] })).status, 400);
    assert.equal((await request(app).post('/api/routes').type('json').send('{')).status, 400);
  } finally { await new Promise<void>((resolve, reject) => upstream.close(error => error ? reject(error) : resolve())); }
  assert.equal((await request(create_app('http://127.0.0.1:1', 'http://127.0.0.1:1')).post('/api/routes').send({ waypoints })).status, 502);
});
