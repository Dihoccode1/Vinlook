import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { create_app } from '../../src/app.js';
import type { Poi, PoiRepository } from '../../src/modules/pois/poi.repository.js';
import { createHash } from 'node:crypto';

const poi: Poi = { id: 'POI001', slug: 'cho-ben-thanh', name: 'Chợ Bến Thành', description: 'Test', address: 'TP.HCM', latitude: 10.7725, longitude: 106.698, category: 'market', source_language: 'vi', image_url: '/images/pois/ben-thanh.jpg', image_credit: 'Riza · CC BY 2.0', image_source_url: 'https://commons.wikimedia.org/wiki/File:Ben_Thanh_market_2.jpg', image_license_url: 'https://creativecommons.org/licenses/by/2.0/' };
const repository: PoiRepository = {
  async list(query) { return { data: [poi], pagination: { page: query.page, limit: query.limit, total: 1 } }; },
  async find(id) { return id === poi.id ? poi : undefined; },
  async find_image() { return undefined; },
  async ready() {},
};

test('image endpoint returns original bytes and supports conditional caching', async () => {
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x80, 0xfe, 0xd9]);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const app = create_app({ ...repository, async find_image(id) {
    return id === poi.id ? { content: bytes, content_type: 'image/jpeg', sha256 } : undefined;
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
  assert.equal((await request(app).get('/pois/POI002/image')).status, 404);
});

test('list forwards validated search and pagination to repository', async () => {
  const app = create_app({ ...repository, async list(query) {
    assert.deepEqual(query, { q: 'Chợ', category: 'market', page: 2, limit: 5 });
    return repository.list(query);
  } });
  const res = await request(app).get('/pois').query({ q: ' Chợ ', category: 'market', page: 2, limit: 5 });
  assert.equal(res.status, 200);
  assert.equal(res.body.data[0].id, poi.id);
  assert.equal(res.body.data[0].image_url, poi.image_url);
  assert.equal(res.body.pagination.page, 2);
});

test('rejects invalid and repeated pagination inputs', async () => {
  for (const query of ['limit=101', 'page=0', 'page=abc', 'page=1&page=2', 'q[x]=oops']) {
    assert.equal((await request(create_app(repository)).get(`/pois?${query}`)).status, 400);
  }
});

test('detail returns POI, malformed id returns 400, unknown id returns 404', async () => {
  const app = create_app(repository);
  assert.equal((await request(app).get(`/pois/${poi.id}`)).body.data.name, poi.name);
  assert.equal((await request(app).get(`/pois/${poi.id}`)).body.data.image_credit, poi.image_credit);
  assert.equal((await request(app).get('/pois/invalid')).status, 400);
  assert.equal((await request(app).get('/pois/POI002')).status, 404);
});

test('database outage fails readiness and API without exposing SQL errors', async () => {
  const fail = async (): Promise<never> => { throw new Error('secret database error'); };
  const app = create_app({ ...repository, ready: fail, list: fail });
  assert.equal((await request(app).get('/health/live')).status, 200);
  assert.equal((await request(app).get('/health/ready')).status, 503);
  const res = await request(app).get('/pois');
  assert.equal(res.status, 503);
  assert.ok(!res.text.includes('secret'));
});
