import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { poiRepository } from '../../src/modules/pois/poi.repository.js';
import { closePool } from '../../src/config/database.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

after(closePool);

test('SQL Server returns seeded POIs, filters and pagination', async () => {
  await poiRepository.ready();
  const page = await poiRepository.list({ q: '', page: 1, limit: 1 });
  assert.equal(page.data.length, 1);
  assert.ok(page.pagination.total >= 3);
  const result = await poiRepository.list({ q: 'Bến Thành', category: 'market', page: 1, limit: 20 });
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].name, 'Chợ Bến Thành');
  assert.equal(result.data[0].imageUrl, `/api/pois/${result.data[0].id}/image`);
  assert.equal(result.data[0].imageCredit, 'Riza · CC BY 2.0');
  assert.equal(result.data[0].imageLicenseUrl, 'https://creativecommons.org/licenses/by/2.0/');
  assert.equal((await poiRepository.find(result.data[0].id))?.slug, 'cho-ben-thanh');
  const missing = await poiRepository.list({ q: '', page: 1000, limit: 20 });
  assert.equal(missing.data.length, 0);
  assert.ok(missing.pagination.total >= 3);
});

test('SQL Server stores the exact binary photo, separate from POI JSON metadata', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const original = await readFile(new URL('../../database/seeds/images/ben-thanh.jpg', import.meta.url));
  const photo = await poiRepository.findImage(id);
  assert.ok(photo);
  assert.deepEqual(photo.content, original);
  assert.equal(photo.contentType, 'image/jpeg');
  assert.equal(photo.sha256, createHash('sha256').update(original).digest('hex'));
  const poi = await poiRepository.find(id);
  assert.ok(poi);
  assert.equal('content' in poi, false);
  assert.equal(await poiRepository.findImage('44444444-4444-4444-8444-444444444444'), undefined);
});

test('search treats SQL injection and LIKE wildcards as literal text', async () => {
  for (const q of ["' OR 1=1 --", '%', '_', '[', '~']) {
    const result = await poiRepository.list({ q, page: 1, limit: 20 });
    assert.equal(result.data.length, 0);
  }
});
