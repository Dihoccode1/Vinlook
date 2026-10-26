import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPoiController } from '../src/modules/pois/poi.controller.js';
import { createPoiRouter } from '../src/modules/pois/poi.route.js';

test('POI controller preserves exact version, locale, actor and idempotency inputs', async () => {
  const calls = [],
    id = 'a'.repeat(24),
    key = '11111111-1111-4111-8111-111111111111',
    principal = { account: { id: 'staff' } };
  const controller = createPoiController({
    clone(...args) {
      calls.push(['clone', ...args]);
    },
    patch(...args) {
      calls.push(['patch', ...args]);
    },
    async read(value) {
      return { poiId: value };
    },
  });
  const request = {
    params: { id, code: 'vi' },
    body: { expectedEditVersion: 7, text: 'Current Vietnamese draft' },
    get: () => key,
  };
  controller.patchLocale(request, principal);
  controller.clone({ ...request, body: { expectedPublishedRevisionId: id } }, principal);
  assert.deepEqual(calls, [
    ['patch', id, request.body, principal, 'vi'],
    ['clone', id, { expectedPublishedRevisionId: id }, principal, key],
  ]);
  assert.deepEqual(await controller.read(request), { status: 200, body: { data: { poiId: id } } });
  assert.throws(() =>
    controller.patchLocale({ ...request, params: { ...request.params, code: 'en' } }, principal),
  );
  assert.throws(() =>
    controller.patchLocale({ ...request, body: { ...request.body, unapproved: true } }, principal),
  );
});
test('POI router retains all five existing method/path contracts', () => {
  const router = createPoiRouter({ authorization: {}, models: {} });
  assert.deepEqual(
    router.stack
      .filter((layer) => layer.route)
      .map((layer) => [layer.route.path, Object.keys(layer.route.methods)[0]]),
    [
      ['/admin/pois', 'post'],
      ['/admin/pois/:id/draft', 'post'],
      ['/admin/revisions/:id', 'patch'],
      ['/admin/revisions/:id/languages/:code', 'patch'],
      ['/admin/pois/:id', 'get'],
    ],
  );
});
