import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { poi_repository } from '../../src/modules/pois/poi.repository.js';
import { close_pool } from '../../src/config/database.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

after(close_pool);

test('SQL Server returns seeded POIs, filters and pagination', async () => {
  await poi_repository.ready();
  const page = await poi_repository.list({ q: '', page: 1, limit: 1 });
  assert.equal(page.data.length, 1);
  assert.ok(page.pagination.total >= 3);
  const result = await poi_repository.list({ q: 'Bến Thành', category: 'market', page: 1, limit: 20 });
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].name, 'Chợ Bến Thành');
  assert.equal(result.data[0].image_url, `/api/pois/${result.data[0].id}/image`);
  assert.equal(result.data[0].image_credit, 'Riza · CC BY 2.0');
  assert.equal(result.data[0].image_license_url, 'https://creativecommons.org/licenses/by/2.0/');
  assert.equal((await poi_repository.find(result.data[0].id))?.slug, 'cho-ben-thanh');
  const missing = await poi_repository.list({ q: '', page: 1000, limit: 20 });
  assert.equal(missing.data.length, 0);
  assert.ok(missing.pagination.total >= 3);
});

test('SQL Server stores the exact binary photo, separate from POI JSON metadata', async () => {
  const id = (await poi_repository.list({q:'Bến Thành',category:'market',page:1,limit:20})).data[0].id;
  const original = await readFile(new URL('../../database/seeds/images/ben-thanh.jpg', import.meta.url));
  const photo = await poi_repository.find_image(id);
  assert.ok(photo);
  assert.deepEqual(photo.content, original);
  assert.equal(photo.content_type, 'image/jpeg');
  assert.equal(photo.sha256, createHash('sha256').update(original).digest('hex'));
  const poi = await poi_repository.find(id);
  assert.ok(poi);
  assert.equal('content' in poi, false);
  assert.equal(await poi_repository.find_image('POI99999999999999999999'), undefined);
});

test('search treats SQL injection and LIKE wildcards as literal text', async () => {
  for (const q of ["' OR 1=1 --", '%', '_', '[', '~']) {
    const result = await poi_repository.list({ q, page: 1, limit: 20 });
    assert.equal(result.data.length, 0);
  }
});
