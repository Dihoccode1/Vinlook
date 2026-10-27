import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createValhallaProvider } from '../../src/providers/valhalla.js';
import { createTransitProvider, decodePolyline6 } from '../../src/providers/transit.js';
import { routeRequestSchema, RoutingError } from '../../src/modules/routes/route.schema.js';

const input = routeRequestSchema.parse({ profile: 'bus', waypoints: [{ latitude: 38.5, longitude: -120.2 }, { latitude: 40.7, longitude: -120.95 }] });
// A standard polyline with coordinates scaled to polyline6 precision.
function encode(points: [number, number][]) {
  let lat = 0, lon = 0, value = '';
  function part(delta: number) { let num = delta < 0 ? ~(delta << 1) : delta << 1; while (num >= 32) { value += String.fromCharCode((32 | (num & 31)) + 63); num >>>= 5; } value += String.fromCharCode(num + 63); }
  for (const [x, y] of points) { const nextLat = Math.round(y * 1e6), nextLon = Math.round(x * 1e6); part(nextLat - lat); part(nextLon - lon); lat = nextLat; lon = nextLon; }
  return value;
}
const points: [number, number][] = [[-120.2, 38.5], [-120.95, 40.7]];
const shape = encode(points);
const response = { trip: { status: 0, units: 'kilometers', summary: { length: 2, time: 600 }, legs: [{ summary: { length: 2, time: 600 }, shape,
  maneuvers: [{ instruction: 'Đi tuyến 01', length: 2, time: 600, begin_shape_index: 0, travel_mode: 'transit', travel_type: 'bus', transit_info: { short_name: '01', transit_stops: [{ name: 'Trạm A' }, { name: 'Trạm B' }] } }],
}] } };

test('bus requests actual public transit and returns line and boarding/alighting stops', async () => {
  const provider = createTransitProvider('https://transit.example.test', async (_url, options) => {
    const body = JSON.parse(options?.body as string);
    assert.equal(body.costing, 'multimodal');
    assert.equal(body.costing_options.transit.use_bus, 1);
    assert.equal(body.costing_options.auto, undefined);
    assert.equal(body.date_time.type, 0);
    return Response.json(response);
  });
  const route = await provider.calculate(input);
  assert.equal(route.profile, 'bus');
  assert.equal(route.optimization, 'transit');
  assert.equal(route.legs[0].steps[0].transit?.departureStop, 'Trạm A');
  assert.equal(route.legs[0].steps[0].transit?.arrivalStop, 'Trạm B');
  assert.deepEqual(route.geometry.coordinates, points);
});

test('walking-only and no-route responses do not become fake bus routes', async () => {
  const walking = structuredClone(response); walking.trip.legs[0].maneuvers[0].travel_mode = 'pedestrian';
  for (const body of [{ code: 'NoRoute' }, { error_code: 170, error: 'Locations are in unconnected regions' }, walking]) {
    const provider = createTransitProvider('https://transit.example.test', async () => Response.json(body));
    await assert.rejects(provider.calculate(input), (error: unknown) => error instanceof RoutingError && error.code === 'NO_TRANSIT_ROUTE');
  }
});

test('motorbike uses the motor_scooter road access model', async () => {
  const provider = createValhallaProvider('https://routing.example.test', async (_url, options) => {
    const body = JSON.parse(options?.body as string);
    assert.equal(body.costing, 'motor_scooter');
    assert.equal(body.costing_options.motor_scooter.shortest, true);
    return Response.json({ code: 'NoRoute' });
  });
  await assert.rejects(provider.calculate({ ...input, profile: 'motorcycle', optimization: 'shortest' }), (error: unknown) => error instanceof RoutingError && error.code === 'NO_ROUTE');
});

test('polyline decoder rejects truncated data and bus rejects multiple destinations', async () => {
  assert.throws(() => decodePolyline6('~'), RoutingError);
  const provider = createTransitProvider('https://transit.example.test', async () => { throw new Error('Should not fetch'); });
  await assert.rejects(provider.calculate({ ...input, waypoints: [...input.waypoints, input.waypoints[0]] }), (error: unknown) => error instanceof RoutingError && error.code === 'BUS_SINGLE_DESTINATION');
});
