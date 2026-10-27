import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { poiRepository } from '../../src/modules/pois/poi.repository.js';
import { closePool } from '../../src/config/database.js';

after(closePool);

test('SQL Server returns seeded POIs, filters and pagination', async () => {
  await poiRepository.ready();
  const page = await poiRepository.list({ q: '', page: 1, limit: 1 });
  assert.equal(page.data.length, 1);
  assert.ok(page.pagination.total >= 3);
  const result = await poiRepository.list({ q: 'Bến Thành', category: 'market', page: 1, limit: 20 });
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].name, 'Chợ Bến Thành');
  assert.equal((await poiRepository.find(result.data[0].id))?.slug, 'cho-ben-thanh');
  const missing = await poiRepository.list({ q: '', page: 1000, limit: 20 });
  assert.equal(missing.data.length, 0);
  assert.ok(missing.pagination.total >= 3);
});

test('search treats SQL injection and LIKE wildcards as literal text', async () => {
  for (const q of ["' OR 1=1 --", '%', '_', '[', '~']) {
    const result = await poiRepository.list({ q, page: 1, limit: 20 });
    assert.equal(result.data.length, 0);
  }
});
