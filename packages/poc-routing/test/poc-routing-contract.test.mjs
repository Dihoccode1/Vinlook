import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makePackageFixture, verifyPackageFixture, activatePackageFixture, createRouteGateFixture, createNavigationFixture } from './fixtures/poc-routing.mjs';

const verify = candidate => verifyPackageFixture({ fixtureMode: true, ...candidate });
test('manifest fixture is explicitly synthetic and cannot certify real OSM/map/audio bytes', () => {
  assert.throws(() => makePackageFixture(false), /fixture mode/);
  const candidate = makePackageFixture(true);
  assert.equal(verify(candidate).fixtureOnly, true);
  candidate.manifest.provenance.kind = 'osm';
  assert.throws(() => verify(candidate), /FIXTURE_PACKAGE_INVALID/);
});

test('every required file hash/length and every POI graph/boundary reference must resolve', () => {
  for (const kind of ['shell', 'style', 'glyphs', 'sprite', 'pmtiles', 'boundary', 'graph', 'spatial-index', 'poi', 'thumbnail', 'audio']) {
    const candidate = makePackageFixture(true);
    candidate.bytes.delete(kind);
    assert.throws(() => verify(candidate), /CHECKSUM/);
  }
  for (const mutate of [c => { c.bytes.set('graph', Buffer.from('CORRUPTED')); },
    c => { c.manifest.files[0].sha256 = '0'.repeat(64); },
    c => { c.manifest.files[0].byteLength++; },
    c => { c.manifest.graph.chunkFileIds = ['missing']; },
    c => { c.manifest.graph.spatialIndexFileId = 'audio'; },
    c => { c.manifest.boundaryFileId = 'poi'; },
    c => { c.manifest.pois[0].audioFileId = 'graph'; },
    c => { c.manifest.pois[0].entrance = [Infinity, 10]; },
    c => { c.manifest.files.push({ ...c.manifest.files[0] }); }]) {
    const candidate = makePackageFixture(true); mutate(candidate);
    assert.throws(() => verify(candidate));
  }
});

test('manifest rejects incompatible schema/app/graph versions, non-English package and unsafe URLs', () => {
  for (const mutate of [c => { c.manifest.schemaVersion = 2; },
    c => { c.manifest.appCompatibility.minBuild = 2; },
    c => { c.manifest.graph.schemaVersion = 2; },
    c => { c.manifest.language = 'vi'; }]) {
    const candidate = makePackageFixture(true); mutate(candidate); assert.throws(() => verify(candidate));
  }
  for (const url of ['https://foreign.invalid/audio', '//foreign.invalid/audio', '/offline/fixture-v1/../key',
    '/offline/fixture-v1/%2e%2e/key', '/offline/fixture-v1/a%2fb', '/offline/fixture-v1/a?token=fixture',
    '/offline/fixture-v1/a#fragment', '/offline/other-version/a', '/offline/fixture-v1//a']) {
    const candidate = makePackageFixture(true); candidate.manifest.files[0].url = url;
    assert.throws(() => verify(candidate));
  }
});

test('failed update/absent shell marker keeps old active; activation waits for all checks', () => {
  const candidate = makePackageFixture(true), active = 'fixture-old-v0';
  let value = activatePackageFixture({ fixtureMode: true, active, candidate, shellMarkerVersion: 'wrong' });
  assert.deepEqual(value, { active, status: 'incomplete', fixtureOnly: true });
  candidate.bytes.delete('audio');
  value = activatePackageFixture({ fixtureMode: true, active, candidate, shellMarkerVersion: 'fixture-v1' });
  assert.equal(value.active, active); assert.equal(value.status, 'incomplete');
  value = activatePackageFixture({ fixtureMode: true, active, candidate: makePackageFixture(true), shellMarkerVersion: 'fixture-v1' });
  assert.equal(value.active, 'fixture-v1'); assert.equal(value.status, 'ready');
});

const request = { requestId: 'fixture-calc-1', graphVersion: 'fixture-graph-v1',
  destinationPoiId: '000000000000000000000001', destinationRevisionId: '000000000000000000000011' };
function route() {
  return { ...request, type: 'ROUTE_RESULT', geometry: [[106.7, 10.7], [106.701, 10.701]], distanceMeters: 150,
    snappedStart: [106.7, 10.7], snappedEnd: [106.701, 10.701], warnings: [],
    instructions: [{ maneuver: 'depart', geometryIndex: 0, distanceMeters: 150, streetName: null, text: 'Synthetic depart instruction' },
      { maneuver: 'arrive', geometryIndex: 1, distanceMeters: 0, streetName: null, text: 'Synthetic arrival instruction' }] };
}
test('route gate drops stale/canceled/mixed graph/revision/destination results', () => {
  const gate = createRouteGateFixture(true);
  gate.begin(request); assert.equal(gate.accept(route()), true);
  for (const key of ['requestId', 'graphVersion', 'destinationPoiId', 'destinationRevisionId']) {
    assert.equal(gate.accept({ ...route(), [key]: 'stale' }), false);
  }
  gate.cancel(); assert.equal(gate.accept(route()), false);
});

test('route errors or malformed geometry/distance/instructions cannot masquerade as successful guidance', () => {
  const gate = createRouteGateFixture(true); gate.begin(request);
  for (const mutate of [r => { r.type = 'ERROR'; r.code = 'NO_ROUTE'; },
    r => { r.geometry[0][0] = NaN; }, r => { r.distanceMeters = -1; },
    r => { r.instructions[0].geometryIndex = 100; }, r => { r.instructions[0].maneuver = 'teleport'; },
    r => { r.extra = 'unapproved-wire-field'; }, r => { r.instructions[0].extra = true; },
    r => { r.warnings = ['UNVERIFIED_CONNECTOR']; }, r => { r.warnings = ['unrecognized']; }]) {
    const value = route(); mutate(value); assert.equal(gate.accept(value), false);
  }
});

const fix = (time, overrides = {}) => ({ time, accuracyMeters: 20, distanceFromRouteMeters: 31, distanceToEntranceMeters: 100, ...overrides });
test('reroute requires three consecutive valid fixes; GPS loss/bad fix resets, with one inflight and 10s cooldown', () => {
  const nav = createNavigationFixture(true);
  assert.equal(nav.fix(fix(0)), 'retain_route'); assert.equal(nav.fix(fix(1000)), 'retain_route');
  assert.equal(nav.lostGps(), 'gps_unavailable');
  assert.equal(nav.fix(fix(2000)), 'retain_route');
  assert.equal(nav.fix(fix(3000, { accuracyMeters: 51 })), 'gps_uncertain');
  assert.equal(nav.fix(fix(4000)), 'retain_route'); assert.equal(nav.fix(fix(5000)), 'retain_route');
  assert.equal(nav.fix(fix(6000)), 'reroute');
  for (const time of [7000, 8000, 17000]) assert.equal(nav.fix(fix(time)), 'retain_route');
  nav.completeCalculation(); assert.equal(nav.fix(fix(18000)), 'reroute');
  nav.completeCalculation();
  for (const time of [19000, 20000, 21000]) assert.equal(nav.fix(fix(time)), 'retain_route');
  assert.equal(nav.fix(fix(28000)), 'reroute');
});

test('off-route threshold is strict >30m; arrival needs <=25m distance AND <=25m accuracy, no autoplay', () => {
  const nav = createNavigationFixture(true);
  for (const time of [0, 1000, 2000, 3000]) assert.equal(nav.fix(fix(time, { distanceFromRouteMeters: 30 })), 'retain_route');
  assert.equal(nav.fix(fix(4000, { distanceToEntranceMeters: 25, accuracyMeters: 25 })), 'arrived');
  assert.equal(nav.fix(fix(5000, { distanceToEntranceMeters: 25, accuracyMeters: 25.1 })), 'retain_route');
  assert.equal(nav.fix(fix(6000, { distanceToEntranceMeters: 25.1, accuracyMeters: 25 })), 'retain_route');
  assert.equal(nav.fix(fix(7000, { accuracyMeters: 50, distanceFromRouteMeters: 0 })), 'retain_route');
  assert.equal(nav.fix(fix(8000, { accuracyMeters: Infinity })), 'gps_uncertain');
});
