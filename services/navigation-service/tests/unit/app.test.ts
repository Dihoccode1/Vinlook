import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { create_app } from '../../src/app.js';
import { RoutingError, type RouteResult } from '../../src/modules/routes/route.schema.js';

const waypoints = [{ latitude: 10.7725, longitude: 106.698 }, { latitude: 10.777, longitude: 106.6953 }];
export const route: RouteResult = {
  profile: 'driving', provider: 'Valhalla', optimization: 'shortest', distance: 1200, duration: 300,
  geometry: { type: 'LineString', coordinates: [[106.698, 10.7725], [106.6953, 10.777]] },
  legs: [{ distance: 1200, duration: 300, geometry: { type: 'LineString', coordinates: [[106.698, 10.7725], [106.6953, 10.777]] }, steps: [{ instruction: 'Đến điểm dừng', distance: 0, duration: 0, location: [106.6953, 10.777] }] }],
};

test('validates ordered waypoints and supplies default driving profile', async () => {
  const app = create_app({ async calculate(input) { assert.deepEqual(input, { waypoints, profile: 'driving', optimization: 'shortest' }); return route; } });
  const res = await request(app).post('/routes').send({ waypoints });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, route);
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('invalid coordinates, point counts and unknown profile never reach the provider', async () => {
  let calls = 0;
  const app = create_app({ async calculate() { calls++; return route; } });
  for (const body of [{ waypoints: [] }, { waypoints: [waypoints[0]] }, { waypoints: Array(11).fill(waypoints[0]) }, { waypoints: [{ latitude: 91, longitude: 0 }, waypoints[0]] }, { waypoints: [{ latitude: '10', longitude: 0 }, waypoints[0]] }, { waypoints, profile: 'bus' }, { waypoints, url: 'http://evil.test' }]) {
    assert.equal((await request(app).post('/routes').send(body)).status, 400);
  }
  assert.equal(calls, 0);
});

test('provider errors use stable HTTP statuses without exposing provider details', async () => {
  for (const [code, status] of [['NO_ROUTE', 422], ['PROVIDER_TIMEOUT', 504], ['PROVIDER_UNAVAILABLE', 502], ['INVALID_PROVIDER_RESPONSE', 502]] as const) {
    const app = create_app({ async calculate() { throw new RoutingError(code); } });
    const res = await request(app).post('/routes').send({ waypoints });
    assert.equal(res.status, status);
    assert.equal(res.body.error.code, code);
  }
});

test('malformed JSON and oversized request bodies are rejected', async () => {
  const app = create_app({ async calculate() { return route; } });
  assert.equal((await request(app).post('/routes').type('json').send('{')).status, 400);
  assert.equal((await request(app).post('/routes').send({ text: 'a'.repeat(20000) })).status, 413);
});
