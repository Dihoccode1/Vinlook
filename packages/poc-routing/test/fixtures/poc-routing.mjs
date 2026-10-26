// TEST/LOCAL ONLY: synthetic bytes and protocol oracles; not a routing engine/package loader.
import { createHash } from 'node:crypto';
export const FIXTURE_ONLY = true;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const safeVersion = value => typeof value === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(value);
const id = value => typeof value === 'string' && /^[0-9a-f]{24}$/.test(value);
const point = value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)
  && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
const requiredKinds = ['shell', 'style', 'glyphs', 'sprite', 'pmtiles', 'boundary', 'graph', 'spatial-index', 'poi', 'thumbnail', 'audio'];
function requireFixture(mode) { if (mode !== true) throw new Error('Explicit fixture mode required'); }
function bad(code = 'FIXTURE_PACKAGE_INVALID') { throw new Error(code); }

export function makePackageFixture(fixtureMode) {
  requireFixture(fixtureMode);
  const bytes = new Map();
  const files = requiredKinds.map(kind => {
    const buffer = Buffer.from(`SYNTHETIC-NOT-PRODUCTION:${kind}`);
    bytes.set(kind, buffer);
    return { id: kind, kind, url: `/offline/fixture-v1/${kind}.bin`, byteLength: buffer.length, sha256: hash(buffer) };
  });
  return { bytes, manifest: {
    schemaVersion: 1, packageVersion: 'fixture-v1', createdAt: '2026-10-26T00:00:00.000Z',
    language: 'en', appCompatibility: { minBuild: 1, maxBuild: 1 },
    coverageVersion: 'synthetic-not-hcmc-coverage', boundaryFileId: 'boundary',
    graph: { graphVersion: 'fixture-graph-v1', schemaVersion: 1, format: 'vinlook-csr-v1',
      profileVersion: 'fixture-profile-v1', chunkFileIds: ['graph'], spatialIndexFileId: 'spatial-index' },
    provenance: { kind: 'fixture', sourceSnapshot: 'synthetic-no-osm-source', license: 'CC0-1.0', attribution: 'Synthetic test bytes only' },
    files, pois: [{ id: '000000000000000000000001', revisionId: '000000000000000000000011',
      entrance: [106.7, 10.7], englishText: 'Synthetic fixture; no tourism narration.', thumbnailFileId: 'thumbnail', audioFileId: 'audio' }],
  } };
}

/** Deliberately accepts fixture provenance only. A real importer must reject it. */
export function verifyPackageFixture({ fixtureMode, manifest: m, bytes, appBuild = 1 }) {
  requireFixture(fixtureMode);
  if (!m || m.provenance?.kind !== 'fixture' || m.schemaVersion !== 1 || m.language !== 'en'
    || !safeVersion(m.packageVersion) || !safeVersion(m.coverageVersion)
    || !Number.isFinite(Date.parse(m.createdAt)) || new Date(Date.parse(m.createdAt)).toISOString() !== m.createdAt
    || !(bytes instanceof Map)) bad();
  const compatibility = m.appCompatibility;
  if (!Number.isSafeInteger(appBuild) || appBuild < 1 || !Number.isSafeInteger(compatibility?.minBuild)
    || !Number.isSafeInteger(compatibility?.maxBuild) || compatibility.minBuild < 1
    || compatibility.maxBuild < compatibility.minBuild || appBuild < compatibility.minBuild || appBuild > compatibility.maxBuild) bad('GRAPH_INCOMPATIBLE');
  if (!Array.isArray(m.files) || m.files.length < requiredKinds.length || m.files.length > 10000) bad();
  const indexed = new Map();
  let totalBytes = 0;
  for (const file of m.files) {
    if (!file || !safeVersion(file.id) || indexed.has(file.id) || !requiredKinds.includes(file.kind)
      || typeof file.url !== 'string' || !file.url.startsWith(`/offline/${m.packageVersion}/`)
      || !/^\/offline\/[A-Za-z0-9._-]+\/[A-Za-z0-9_./-]+$/.test(file.url)
      || file.url.slice(1).split('/').some(segment => !segment || segment === '.' || segment === '..')
      || !Number.isSafeInteger(file.byteLength) || file.byteLength <= 0 || file.byteLength > 16 * 1024 * 1024
      || typeof file.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(file.sha256)) bad();
    const content = bytes.get(file.id);
    if (!(content instanceof Uint8Array) || content.byteLength !== file.byteLength || hash(content) !== file.sha256) bad('FIXTURE_CHECKSUM_MISMATCH');
    totalBytes += file.byteLength;
    if (!Number.isSafeInteger(totalBytes)) bad();
    indexed.set(file.id, file);
  }
  for (const kind of requiredKinds) if (!m.files.some(file => file.kind === kind)) bad();
  const ref = (key, kind) => { if (indexed.get(key)?.kind !== kind) bad(); };
  ref(m.boundaryFileId, 'boundary');
  if (!m.graph || m.graph.schemaVersion !== 1 || m.graph.format !== 'vinlook-csr-v1'
    || !safeVersion(m.graph.graphVersion) || !safeVersion(m.graph.profileVersion)
    || !Array.isArray(m.graph.chunkFileIds) || !m.graph.chunkFileIds.length
    || new Set(m.graph.chunkFileIds).size !== m.graph.chunkFileIds.length) bad('GRAPH_INCOMPATIBLE');
  for (const key of m.graph.chunkFileIds) ref(key, 'graph');
  ref(m.graph.spatialIndexFileId, 'spatial-index');
  if (!Array.isArray(m.pois) || !m.pois.length) bad();
  const pois = new Set();
  for (const poi of m.pois) {
    if (!id(poi.id) || pois.has(poi.id) || !id(poi.revisionId) || !point(poi.entrance)
      || typeof poi.englishText !== 'string' || !poi.englishText.trim()) bad();
    pois.add(poi.id); ref(poi.thumbnailFileId, 'thumbnail'); ref(poi.audioFileId, 'audio');
  }
  return { fixtureOnly: true, totalBytes, packageVersion: m.packageVersion };
}

/** Models the candidate/active contract only; does not pretend CacheStorage is in an IDB transaction. */
export function activatePackageFixture({ fixtureMode, active, candidate, shellMarkerVersion }) {
  requireFixture(fixtureMode);
  try {
    verifyPackageFixture({ ...candidate, fixtureMode });
    if (shellMarkerVersion !== candidate.manifest.packageVersion) bad('FIXTURE_SHELL_NOT_READY');
    return { active: candidate.manifest.packageVersion, status: 'ready', fixtureOnly: true };
  } catch {
    return { active, status: 'incomplete', fixtureOnly: true };
  }
}

/** Message acceptance oracle, not a Worker implementation or a proof that geometry follows roads. */
export function createRouteGateFixture(fixtureMode) {
  requireFixture(fixtureMode);
  let current = null;
  const maneuvers = ['depart', 'continue', 'left', 'right', 'u_turn', 'arrive'];
  return {
    begin(request) { current = structuredClone(request); },
    cancel() { current = null; },
    accept(result) {
      if (!current || !result || typeof result !== 'object'
        || Object.keys(result).some(key => !['type', 'requestId', 'graphVersion', 'destinationPoiId', 'destinationRevisionId', 'geometry', 'distanceMeters', 'instructions', 'snappedStart', 'snappedEnd', 'warnings'].includes(key))
        || !['requestId', 'graphVersion', 'destinationPoiId', 'destinationRevisionId'].every(key => result[key] === current[key])) return false;
      if (result.type !== 'ROUTE_RESULT' || !Array.isArray(result.geometry) || result.geometry.length < 2
        || !result.geometry.every(point) || !Number.isFinite(result.distanceMeters) || result.distanceMeters < 0
        || !point(result.snappedStart) || !point(result.snappedEnd) || !Array.isArray(result.instructions) || !result.instructions.length
        || !Array.isArray(result.warnings) || result.warnings.some(code => !['UNVERIFIED_CONNECTOR', 'MISSING_STREET_NAME'].includes(code))) return false;
      if (!result.instructions.every(step => step && Object.keys(step).every(key => ['maneuver', 'geometryIndex', 'distanceMeters', 'streetName', 'text'].includes(key))
        && maneuvers.includes(step.maneuver) && Number.isSafeInteger(step.geometryIndex)
        && step.geometryIndex >= 0 && step.geometryIndex < result.geometry.length && Number.isFinite(step.distanceMeters)
        && step.distanceMeters >= 0 && (step.streetName === null || typeof step.streetName === 'string')
        && typeof step.text === 'string' && step.text.trim())) return false;
      return !result.warnings.includes('UNVERIFIED_CONNECTOR');
    },
  };
}

export function createNavigationFixture(fixtureMode) {
  requireFixture(fixtureMode);
  let streak = 0, inflight = false, lastCalculation = -Infinity;
  return {
    // Distances are synthetic inputs here, not computed from GPS or real graph geometry.
    fix({ time, accuracyMeters, distanceFromRouteMeters, distanceToEntranceMeters }) {
      if (![time, accuracyMeters, distanceFromRouteMeters, distanceToEntranceMeters].every(Number.isFinite)
        || accuracyMeters < 0 || accuracyMeters > 50 || distanceFromRouteMeters < 0 || distanceToEntranceMeters < 0) {
        streak = 0; return 'gps_uncertain';
      }
      if (distanceToEntranceMeters <= 25 && accuracyMeters <= 25) return 'arrived';
      streak = distanceFromRouteMeters > 30 ? streak + 1 : 0;
      if (streak >= 3 && !inflight && time - lastCalculation >= 10000) {
        inflight = true; lastCalculation = time; streak = 0; return 'reroute';
      }
      return 'retain_route';
    },
    lostGps() { streak = 0; return 'gps_unavailable'; },
    completeCalculation() { inflight = false; },
  };
}
