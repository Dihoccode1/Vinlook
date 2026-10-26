import { RoutingFailure, validPoint, distanceMeters, routeSnapped, GEOMETRY_EPSILON_METERS as EPS } from './core.mjs';

// R1 GPS/POI guidance over the internal core. Proposed bridge for Duy review, not a frozen contract.
export const R1_SCHEMA_VERSION = 1;
export const R1_ERROR_CODES = Object.freeze(['GRAPH_UNAVAILABLE', 'GRAPH_INCOMPATIBLE', 'INVALID_POSITION', 'GPS_UNCERTAIN',
  'SNAP_NOT_FOUND', 'NO_ROUTE', 'CALCULATION_FAILED']);
export const R1_WARNINGS = Object.freeze(['UNVERIFIED_CONNECTOR', 'MISSING_STREET_NAME']);
const RETRYABLE = new Set(['GPS_UNCERTAIN', 'SNAP_NOT_FOUND', 'CALCULATION_FAILED']);
export const retryable = code => RETRYABLE.has(code);
// Bearing change bands for maneuvers; geometry-only, no lane/crossing semantics are inferred.
const TURN_DEGREES = 30, U_TURN_DEGREES = 150;
const TEXT = Object.freeze({ depart: 'Head toward your destination', continue: 'Continue straight', left: 'Turn left',
  right: 'Turn right', u_turn: 'Make a U-turn', arrive: 'Arrive at the entrance' });
const fail = code => { throw new RoutingFailure(code); };

/** Maps any core failure to the fixed R1 allowlist; unknown failures never leak detail. */
export function r1Code(error) {
  const code = error instanceof RoutingFailure ? error.code : null;
  if (R1_ERROR_CODES.includes(code)) return code;
  if (code === 'INVALID_GEOMETRY') return 'INVALID_POSITION';
  return 'CALCULATION_FAILED';
}

function bearing(a, b) {
  const rad = Math.PI / 180, y = Math.sin((b[0] - a[0]) * rad) * Math.cos(b[1] * rad);
  const x = Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos((b[0] - a[0]) * rad);
  return Math.atan2(y, x) / rad;
}

/**
 * English steps derived from route geometry. Straight segments merge; every index is a valid geometry index.
 * segmentNames[k] names the edge arriving at geometry[k]; a step's street is the edge leaving its vertex.
 */
export function buildInstructions(geometry, { turnByTurn = true, segmentNames = [] } = {}) {
  if (!Array.isArray(geometry) || geometry.length < 2 || !geometry.every(validPoint)) fail('INVALID_GEOMETRY');
  const steps = [{ maneuver: 'depart', geometryIndex: 0 }];
  if (turnByTurn) {
    for (let index = 1; index < geometry.length - 1; index++) {
      const before = geometry[index - 1], here = geometry[index], after = geometry[index + 1];
      if (distanceMeters(before, here) <= EPS || distanceMeters(here, after) <= EPS) continue;
      const delta = ((bearing(here, after) - bearing(before, here) + 540) % 360) - 180;
      const magnitude = Math.abs(delta);
      if (magnitude < TURN_DEGREES) continue;
      steps.push({ maneuver: magnitude > U_TURN_DEGREES ? 'u_turn' : delta > 0 ? 'right' : 'left', geometryIndex: index });
    }
  }
  steps.push({ maneuver: 'arrive', geometryIndex: geometry.length - 1 });
  const cumulative = [0];
  for (let index = 1; index < geometry.length; index++) cumulative.push(cumulative[index - 1] + distanceMeters(geometry[index - 1], geometry[index]));
  return steps.map((step, index) => {
    const name = step.maneuver === 'arrive' ? null : segmentNames[step.geometryIndex + 1] ?? null;
    const text = name === null ? TEXT[step.maneuver] : step.maneuver === 'depart' ? `Head along ${name}`
      : step.maneuver === 'u_turn' ? `Make a U-turn onto ${name}` : `${TEXT[step.maneuver]} onto ${name}`;
    return { maneuver: step.maneuver, geometryIndex: step.geometryIndex,
      distanceMeters: index + 1 < steps.length ? cumulative[steps[index + 1].geometryIndex] - cumulative[step.geometryIndex] : 0,
      streetName: name, text };
  });
}

/**
 * Start connector: projection within reported accuracy is plausible on-edge position; beyond accuracy
 * (still <=50m) it is unverified, so turn-by-turn is suppressed. End connector: the approved arrival
 * point must already lie on an allowed edge within entranceToleranceMeters, never a straight join.
 */
export function calculateGuidance(graph, { position, accuracyMeters, entrance, entranceToleranceMeters, maxResultPoints, signal }) {
  if (!validPoint(position) || !validPoint(entrance)) fail('INVALID_POSITION');
  if (!Number.isFinite(accuracyMeters) || accuracyMeters < 0) fail('INVALID_POSITION');
  if (accuracyMeters > 50) fail('GPS_UNCERTAIN');
  let unverifiedStart = false;
  const verifyConnector = ({ kind, candidate }) => {
    if (kind === 'end') return candidate.distanceMeters <= entranceToleranceMeters + EPS
      ? { verified: true, lengthMeters: candidate.distanceMeters } : { verified: false };
    return { verified: true, lengthMeters: candidate.distanceMeters };
  };
  const result = routeSnapped(graph, { start: position, end: entrance, accuracyMeters, verifyConnector, signal });
  if (result.status !== 'found') fail('NO_ROUTE');
  if (result.startSnap.distanceMeters > accuracyMeters + EPS) unverifiedStart = true;
  let geometry = result.geometry, segmentNames = result.segmentNames;
  if (geometry.length === 1) { geometry = [geometry[0], [...geometry[0]]]; segmentNames = [null, segmentNames[0]]; }
  if (geometry.length > maxResultPoints) fail('CALCULATION_FAILED');
  const instructions = buildInstructions(geometry, { turnByTurn: !unverifiedStart, segmentNames });
  const warnings = [];
  if (unverifiedStart) warnings.push('UNVERIFIED_CONNECTOR');
  if (instructions.some(step => step.maneuver !== 'arrive' && step.streetName === null)) warnings.push('MISSING_STREET_NAME');
  return { geometry, distanceMeters: result.graphDistanceMeters, instructions,
    snappedStart: [...result.startSnap.point], snappedEnd: [...result.endSnap.point], warnings };
}
