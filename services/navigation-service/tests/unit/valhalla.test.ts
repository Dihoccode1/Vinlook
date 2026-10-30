import assert from 'node:assert/strict';
import { test } from 'node:test';
import { create_valhalla_provider } from '../../src/providers/valhalla.js';
import { RoutingError } from '../../src/modules/routes/route.schema.js';

const input = { profile: 'driving' as const, optimization: 'shortest' as const, waypoints: [{ latitude: 10.7725, longitude: 106.698 }, { latitude: 10.777, longitude: 106.6953 }] };
const response = {
  code: 'Ok', routes: [{ distance: 1200, duration: 300,
    geometry: { type: 'LineString', coordinates: [[106.698, 10.7725], [106.6953, 10.777]] },
    legs: [{ distance: 1200, duration: 300, steps: [
      { name: 'Lê Lợi', distance: 500, duration: 100, maneuver: { type: 'depart', location: [106.698, 10.7725] } },
      { name: 'Nam Kỳ Khởi Nghĩa', distance: 700, duration: 200, maneuver: { type: 'turn', modifier: 'left', location: [106.697, 10.774] } },
      { name: '', distance: 0, duration: 0, maneuver: { type: 'arrive', location: [106.6953, 10.777] } },
    ] }],
  }],
};

test('Valhalla requests distance-only costing with hierarchy pruning disabled', async () => {
  const provider = create_valhalla_provider('https://routing.example.test', async (url, options) => {
    const parsed = new URL(String(url));
    assert.equal(parsed.pathname, '/route');
    assert.equal(parsed.search, '');
    assert.equal(options?.method, 'POST');
    const body = JSON.parse(options?.body as string);
    assert.deepEqual(body.locations, input.waypoints.map(p => ({lat:p.latitude, lon:p.longitude, type:'break', search_cutoff:1000})));
    assert.deepEqual(body.costing_options, { auto: { shortest: true, disable_hierarchy_pruning: true } });
    assert.equal(body.shape_format, 'geojson');
    assert.equal(body.language, 'vi-VN');
    assert.equal(options?.redirect, 'error');
    return Response.json(response);
  });
  const route = await provider.calculate(input);
  assert.deepEqual(route.geometry.coordinates, response.routes[0].geometry.coordinates);
  assert.equal(route.legs[0].steps[1].instruction, 'Rẽ trái vào Nam Kỳ Khởi Nghĩa');
  assert.equal(route.optimization, 'shortest');
});

test('no-route responses and invalid provider geometry are rejected', async () => {
  for (const [json, code] of [[{ code: 'NoRoute' }, 'NO_ROUTE'], [{ code: 'NoSegment' }, 'NO_ROUTE'], [{ ...response, routes: [] }, 'INVALID_PROVIDER_RESPONSE'], [{ ...response, routes: [{ ...response.routes[0], geometry: { type: 'LineString', coordinates: [[999, 999], [0, 0]] } }] }, 'INVALID_PROVIDER_RESPONSE']] as const) {
    const provider = create_valhalla_provider('https://routing.example.test', async () => Response.json(json));
    await assert.rejects(provider.calculate(input), (error: unknown) => error instanceof RoutingError && error.code === code);
  }
});

test('provider connection failures and timeouts are mapped to stable errors', async () => {
  for (const [error, code] of [[new Error('private upstream details'), 'PROVIDER_UNAVAILABLE'], [new DOMException('timeout', 'TimeoutError'), 'PROVIDER_TIMEOUT']] as const) {
    const provider = create_valhalla_provider('https://routing.example.test', async () => { throw error; });
    await assert.rejects(provider.calculate(input), (failure: unknown) => failure instanceof RoutingError && failure.code === code);
  }
});

test('walking and motorbike use distinct access models and preserve their profile', async () => {
  for (const [profile, costing] of [['walking', 'pedestrian'], ['motorcycle', 'motor_scooter']] as const) {
    const provider = create_valhalla_provider('https://routing.example.test', async (_url, options) => {
      const body = JSON.parse(options?.body as string);
      assert.equal(body.costing, costing);
      assert.equal(body.costing_options[costing].shortest, true);
      assert.equal(body.costing_options.auto, undefined);
      return Response.json(response);
    });
    const route = await provider.calculate({ ...input, profile });
    assert.equal(route.profile, profile);
    assert.equal(route.optimization, 'shortest');
  }
});

test('each itinerary leg keeps its own road bends in the requested stop order', async () => {
  const first = [[106.698, 10.7725], [106.696, 10.774], [106.6953, 10.777]];
  const second = [[106.6953, 10.777], [106.697, 10.78], [106.6999, 10.7799]];
  const provider = create_valhalla_provider('https://routing.example.test', async (_url, options) => {
    const body = JSON.parse(options?.body as string);
    assert.deepEqual(body.locations.map((point: {lat:number;lon:number}) => [point.lon, point.lat]), [first[0], first.at(-1), second.at(-1)]);
    return Response.json({ code: 'Ok', routes: [{ distance: 2400, duration: 600,
      geometry: { type: 'LineString', coordinates: [...first, ...second.slice(1)] },
      legs: [
        { distance: 1200, duration: 300, steps: [
          { ...response.routes[0].legs[0].steps[0], geometry: { type: 'LineString', coordinates: first.slice(0, 2) } },
          { ...response.routes[0].legs[0].steps[1], geometry: { type: 'LineString', coordinates: first.slice(1) } },
        ] },
        { distance: 1200, duration: 300, steps: [{ ...response.routes[0].legs[0].steps[0], geometry: { type: 'LineString', coordinates: second } }] },
      ],
    }] });
  });
  const route = await provider.calculate({ ...input, waypoints: [...input.waypoints, { latitude: 10.7799, longitude: 106.6999 }] });
  assert.deepEqual(route.legs[0].geometry.coordinates, first);
  assert.deepEqual(route.legs[1].geometry.coordinates, second);
});

test('missing per-leg geometry cannot substitute the entire route into every leg', async () => {
  const provider = create_valhalla_provider('https://routing.example.test', async () => Response.json({
    ...response, routes: [{ ...response.routes[0], legs: [response.routes[0].legs[0], response.routes[0].legs[0]] }],
  }));
  await assert.rejects(provider.calculate({ ...input, waypoints: [...input.waypoints, { latitude: 10.7799, longitude: 106.6999 }] }),
    (error: unknown) => error instanceof RoutingError && error.code === 'INVALID_PROVIDER_RESPONSE');
});
