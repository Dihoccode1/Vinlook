import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNavigationPolicy, NAVIGATION_THRESHOLDS } from '../src/navigation.mjs';
import { p } from './core-fixtures.mjs';

const destination = { poiId: '000000000000000000000001', revisionId: '000000000000000000000011', graphVersion: 'synthetic-v1', entrance: p(1000) };
function setup({ maxCalculations = 100, maxRoutePoints = 100 } = {}) {
  let time = 0, timestamp = 0;
  const policy = createNavigationPolicy({ maxRoutePoints, maxCalculations, now: () => time });
  const fix = (x, y = 0, accuracyMeters = 20, stamp = ++timestamp) => policy.observeFix({ position: p(x, y), accuracyMeters, timestamp: stamp });
  policy.setDestination(destination); fix(0);
  const request = policy.beginCalculation('initial');
  policy.acceptRoute({ ...request, geometry: [p(0), p(1000)] });
  return { policy, fix, advance: ms => { time += ms; }, time: () => time };
}

test('approved thresholds remain 50m accuracy/snap,30m×3,10s cooldown and25m/25m arrival', () => {
  assert.deepEqual(NAVIGATION_THRESHOLDS, { maxAccuracyMeters: 50, maxSnapMeters: 50, offRouteMeters: 30,
    consecutiveFixes: 3, cooldownMilliseconds: 10000, arrivalMeters: 25, arrivalAccuracyMeters: 25 });
});

test('three consecutive eligible fixes and >=10s cooldown; only one calculation can be inflight', () => {
  const { policy, fix, advance } = setup();
  assert.equal(fix(100, 31).event, 'retain_route'); assert.equal(fix(100, 31).event, 'retain_route');
  assert.equal(fix(100, 31).event, 'retain_route');
  advance(9999); assert.equal(policy.pollReroute().event, 'retain_route');
  advance(1); assert.equal(policy.pollReroute().event, 'reroute_eligible');
  const request = policy.beginCalculation('reroute-1');
  assert.throws(() => policy.beginCalculation('parallel'), { code: 'CALCULATION_IN_PROGRESS' });
  for (let i = 0; i < 5; i++) assert.equal(fix(120 + i, 40).event, 'retain_route');
  assert.equal(policy.snapshot().latestFix.position[0], p(124, 40)[0]);
  assert.equal(policy.acceptRoute({ ...request, geometry: [p(120, 40), p(1000)] }), true);
  assert.equal(policy.snapshot().inflight, null);
  assert.ok(policy.snapshot().offRouteFixes <= 1); // New line reevaluates latest fix once, never replays a burst.
});

test('returning to route, bad accuracy, missing GPS and stale fixes reset the consecutive streak', () => {
  const { policy, fix, advance } = setup(); advance(10000);
  fix(100, 31); fix(100, 31); fix(100, 0);
  assert.equal(policy.snapshot().offRouteFixes, 0);
  fix(100, 31); fix(100, 31); assert.equal(fix(100, 31, 50.001).event, 'gps_uncertain');
  assert.equal(policy.snapshot().offRouteFixes, 0);
  fix(100, 31); fix(100, 31); policy.gpsLost(); assert.equal(policy.snapshot().offRouteFixes, 0);
  fix(100, 31); fix(100, 31); assert.equal(fix(100, 31, 20, -1).event, 'stale_fix');
  assert.equal(policy.snapshot().offRouteFixes, 0);
});

test('strict off-route boundary:30m is retained,31m can form a streak; accuracy50 remains eligible', () => {
  const { policy, fix, advance } = setup(); advance(10000);
  for (let i = 0; i < 4; i++) assert.equal(fix(100, 30, 50).event, 'retain_route');
  assert.equal(policy.snapshot().offRouteFixes, 0);
  assert.equal(fix(100, 31, 50).event, 'retain_route'); assert.equal(fix(100, 31, 50).event, 'retain_route');
  assert.equal(fix(100, 31, 50).event, 'reroute_eligible');
});

test('arrival requires a new valid fix within25m and accuracy<=25; polling/old or poor fixes cannot arrive', () => {
  const { policy, fix } = setup();
  assert.equal(fix(1000, 24, 25.001).event, 'retain_route');
  policy.gpsLost(); assert.equal(policy.pollReroute().event, 'retain_route');
  assert.equal(policy.snapshot().status, 'gps_unavailable');
  assert.equal(fix(1000, 25.01, 25).event, 'retain_route');
  assert.equal(fix(1000, 25, 25).event, 'arrived');
  assert.equal(policy.snapshot().inflight, null);
  assert.equal(fix(1000, 0).event, 'inactive');
  assert.equal(Object.hasOwn(policy.snapshot(), 'autoplay'), false);
});

test('GPS loss keeps route/target/last good position; late route completion never pretends GPS recovered', () => {
  const { policy, fix, advance } = setup(); advance(10000);
  fix(100, 40); fix(100, 40); fix(100, 40);
  const request = policy.beginCalculation('reroute');
  const before = policy.snapshot(); policy.gpsLost();
  assert.deepEqual(policy.snapshot().route, before.route);
  assert.deepEqual(policy.snapshot().destination, before.destination);
  assert.deepEqual(policy.snapshot().latestFix, before.latestFix);
  assert.equal(policy.acceptRoute({ ...request, geometry: [p(100), p(1000)] }), true);
  assert.equal(policy.snapshot().status, 'gps_unavailable');
  assert.equal(policy.snapshot().offRouteFixes, 0);
  assert.throws(() => policy.beginCalculation('without-gps'), { code: 'CALCULATION_NOT_ALLOWED' });
  fix(100); assert.equal(policy.snapshot().status, 'navigating');
});

test('current request/graph/POI/revision binding rejects stale results; target change/cancel exposes terminate request', () => {
  const policy = createNavigationPolicy({ maxRoutePoints: 100, maxCalculations: 10, now: () => 0 });
  policy.setDestination(destination);
  assert.throws(() => policy.beginCalculation('no-fix'), { code: 'CALCULATION_NOT_ALLOWED' });
  policy.observeFix({ position: p(0), accuracyMeters: 20, timestamp: 1 });
  const old = policy.beginCalculation('old');
  for (const key of ['requestId', 'graphVersion', 'poiId', 'revisionId']) {
    assert.equal(policy.acceptRoute({ ...old, [key]: 'stale', geometry: [p(0), p(1000)] }), false);
  }
  assert.equal(policy.setDestination({ ...destination, revisionId: '000000000000000000000012' }).cancelRequestId, 'old');
  assert.equal(policy.acceptRoute({ ...old, geometry: [p(0), p(1000)] }), false);
  policy.observeFix({ position: p(0), accuracyMeters: 20, timestamp: 2 });
  const current = policy.beginCalculation('current');
  assert.equal(policy.cancel().cancelRequestId, 'current');
  assert.equal(policy.acceptRoute({ ...current, geometry: [p(0), p(1000)] }), false);
  assert.equal(policy.snapshot().status, 'idle');
});

test('no-route/error keeps previous route if present and cannot overwrite a newer request', () => {
  const { policy, fix, advance } = setup(); advance(10000);
  fix(100, 40); fix(100, 40); fix(100, 40);
  policy.beginCalculation('reroute'); const prior = policy.snapshot().route;
  assert.equal(policy.failCalculation('stale'), false); assert.equal(policy.failCalculation('reroute'), true);
  assert.deepEqual(policy.snapshot().route, prior); assert.equal(policy.snapshot().inflight, null);
});

test('synced destination withdrawal stops guidance; unrelated withdrawal leaves it unchanged', () => {
  const { policy } = setup();
  assert.equal(policy.withdraw('different-poi').event, 'unchanged');
  assert.equal(policy.withdraw(destination.poiId).event, 'destination_withdrawn');
  assert.equal(policy.snapshot().route, null); assert.equal(policy.snapshot().destination, null);
});

test('geometry/request-id/calculation/clock limits fail explicitly and snapshots are defensive copies', () => {
  const { policy, fix, advance } = setup({ maxCalculations: 2 });
  const copy = policy.snapshot(); copy.route.geometry[0][0] = 0; copy.destination.entrance[0] = 0;
  assert.notEqual(policy.snapshot().route.geometry[0][0], 0); assert.notEqual(policy.snapshot().destination.entrance[0], 0);
  advance(10000); fix(100, 40); fix(100, 40); fix(100, 40);
  const request = policy.beginCalculation('second');
  assert.throws(() => policy.acceptRoute({ ...request, geometry: [[NaN, 0], p(1000)] }), { code: 'INVALID_GEOMETRY' });
  policy.failCalculation('second'); policy.cancel(); policy.setDestination(destination); fix(0);
  assert.throws(() => policy.beginCalculation('initial'), { code: 'REQUEST_ID_REUSED' });
  assert.throws(() => policy.beginCalculation('third'), { code: 'CALCULATION_BUDGET_EXCEEDED' });
  let time = 10;
  const clock = createNavigationPolicy({ maxRoutePoints: 2, maxCalculations: 1, now: () => time });
  clock.setDestination(destination); clock.observeFix({ position: p(0), accuracyMeters: 20, timestamp: 1 });
  time = 9;
  assert.throws(() => clock.beginCalculation('backwards-clock'), { code: 'INVALID_CLOCK' });
});
