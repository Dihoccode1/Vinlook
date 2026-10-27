import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatDistance, formatDuration } from '../src/features/navigation/types.js';
import { calculateRoute } from '../src/services/routes.js';

test('route distances and durations use Vietnamese units at boundary values', () => {
  assert.equal(formatDistance(999), '999 m');
  assert.equal(formatDistance(1500), '1,5 km');
  assert.equal(formatDuration(0), '1 phút');
  assert.equal(formatDuration(3600), '1 giờ');
  assert.equal(formatDuration(3660), '1 giờ 1 phút');
});

test('route request sends coordinates in a JSON body and respects cancellation signal', async t => {
  const controller = new AbortController();
  const points = [{ latitude: 10.7, longitude: 106.6 }, { latitude: 10.8, longitude: 106.7 }];
  t.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
    assert.equal(url, '/api/routes');
    assert.equal(options.method, 'POST');
    assert.equal(options.signal, controller.signal);
    assert.deepEqual(JSON.parse(options.body as string), { waypoints: points, profile: 'driving', optimization: 'shortest' });
    return Response.json({ error: { code: 'NO_ROUTE' } }, { status: 422 });
  });
  await assert.rejects(calculateRoute(points, controller.signal), /Không tìm thấy đường/);
});
