import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import type { Poi, PoiRepository } from '../../src/modules/pois/poi.repository.js';
import { createHash } from 'node:crypto';

const poi: Poi = { id: '11111111-1111-4111-8111-111111111111', slug: 'cho-ben-thanh', name: 'Chợ Bến Thành', description: 'Test', address: 'TP.HCM', latitude: 10.7725, longitude: 106.698, category: 'market', sourceLanguage: 'vi', imageUrl: '/images/pois/ben-thanh.jpg', imageCredit: 'Riza · CC BY 2.0', imageSourceUrl: 'https://commons.wikimedia.org/wiki/File:Ben_Thanh_market_2.jpg', imageLicenseUrl: 'https://creativecommons.org/licenses/by/2.0/' };
const repository: PoiRepository = {
  async list(query) { return { data: [poi], pagination: { page: query.page, limit: query.limit, total: 1 } }; },
  async find(id) { return id === poi.id ? poi : undefined; },
  async findImage() { return undefined; },
  async ready() {},
};

test('image endpoint returns original bytes and supports conditional caching', async () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x80, 0xfe, 0xd9]);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const app = createApp({ ...repository, async findImage(id) {
    return id === poi.id ? { content: bytes, contentType: 'image/jpeg', sha256 } : undefined;
  } });
  const url = `/pois/${poi.id}/image`;
  const image = await request(app).get(url);
  assert.equal(image.status, 200);
  assert.match(image.headers['content-type'], /^image\/jpeg/);
  assert.deepEqual(image.body, bytes);
  assert.equal(image.headers['cache-control'], 'public, max-age=300');
  const cached = await request(app).get(url).set('If-None-Match', image.headers.etag);
  assert.equal(cached.status, 304);
  assert.equal((await request(app).get('/pois/bad/image')).status, 400);
  assert.equal((await request(app).get('/pois/44444444-4444-4444-8444-444444444444/image')).status, 404);
});

test('list forwards validated search and pagination to repository', async () => {
  const app = createApp({ ...repository, async list(query) {
    assert.deepEqual(query, { q: 'Chợ', category: 'market', page: 2, limit: 5 });
    return repository.list(query);
  } });
  const res = await request(app).get('/pois').query({ q: ' Chợ ', category: 'market', page: 2, limit: 5 });
  assert.equal(res.status, 200);
  assert.equal(res.body.data[0].id, poi.id);
  assert.equal(res.body.data[0].imageUrl, poi.imageUrl);
  assert.equal(res.body.pagination.page, 2);
});

test('rejects invalid and repeated pagination inputs', async () => {
  for (const query of ['limit=101', 'page=0', 'page=abc', 'page=1&page=2', 'q[x]=oops']) {
    assert.equal((await request(createApp(repository)).get(`/pois?${query}`)).status, 400);
  }
});

test('detail returns POI, malformed id returns 400, unknown id returns 404', async () => {
  const app = createApp(repository);
  assert.equal((await request(app).get(`/pois/${poi.id}`)).body.data.name, poi.name);
  assert.equal((await request(app).get(`/pois/${poi.id}`)).body.data.imageCredit, poi.imageCredit);
  assert.equal((await request(app).get('/pois/invalid')).status, 400);
  assert.equal((await request(app).get('/pois/44444444-4444-4444-8444-444444444444')).status, 404);
});

test('database outage fails readiness and API without exposing SQL errors', async () => {
  const fail = async (): Promise<never> => { throw new Error('secret database error'); };
  const app = createApp({ ...repository, ready: fail, list: fail });
  assert.equal((await request(app).get('/health/live')).status, 200);
  assert.equal((await request(app).get('/health/ready')).status, 503);
  const res = await request(app).get('/pois');
  assert.equal(res.status, 503);
  assert.ok(!res.text.includes('secret'));
});
