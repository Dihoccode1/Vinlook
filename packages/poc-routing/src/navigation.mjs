import { RoutingFailure, validPoint, distanceMeters, distanceToPolyline, GEOMETRY_EPSILON_METERS as EPS } from './core.mjs';

export const NAVIGATION_THRESHOLDS = Object.freeze({ maxAccuracyMeters: 50, maxSnapMeters: 50,
  offRouteMeters: 30, consecutiveFixes: 3, cooldownMilliseconds: 10000,
  arrivalMeters: 25, arrivalAccuracyMeters: 25 });
const fail = code => { throw new RoutingFailure(code); };
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 128;

/** Pure in-memory policy, no GPS acquisition, Worker, network, storage or autoplay. */
export function createNavigationPolicy({ maxRoutePoints, maxCalculations, now = () => performance.now() } = {}) {
  if (!Number.isSafeInteger(maxRoutePoints) || maxRoutePoints < 2 || !Number.isSafeInteger(maxCalculations)
    || maxCalculations < 1 || typeof now !== 'function') fail('INVALID_POLICY_BUDGET');
  let destination = null, route = null, inflight = null, status = 'idle', lastCalculation = null;
  let latestFix = null, lastTimestamp = -Infinity, offRouteFixes = 0, lastClock = -Infinity;
  const usedRequests = new Set();
  const clock = () => {
    const time = now();
    if (!Number.isFinite(time) || time < lastClock) fail('INVALID_CLOCK');
    lastClock = time; return time;
  };
  const eligible = time => destination && route && !inflight && offRouteFixes >= 3
    && (lastCalculation === null || time - lastCalculation >= 10000);
  const view = () => ({ status, destination: destination ? { ...destination, entrance: [...destination.entrance] } : null,
    route: route ? { geometry: route.geometry.map(p => [...p]) } : null,
    latestFix: latestFix ? { ...latestFix, position: [...latestFix.position] } : null,
    inflight: inflight ? { ...inflight } : null, offRouteFixes, lastCalculation });
  return Object.freeze({
    snapshot: view,
    setDestination(value) {
      if (!value || !['poiId', 'revisionId', 'graphVersion'].every(key => id(value[key])) || !validPoint(value.entrance)) fail('INVALID_DESTINATION');
      const cancelRequestId = inflight?.requestId ?? null;
      destination = { poiId: value.poiId, revisionId: value.revisionId, graphVersion: value.graphVersion, entrance: [...value.entrance] };
      route = null; inflight = null; latestFix = null; offRouteFixes = 0; lastCalculation = null; status = 'loading_graph';
      return { event: 'destination_changed', cancelRequestId };
    },
    beginCalculation(requestId) {
      const time = clock();
      if (!destination || !latestFix || ['arrived', 'gps_unavailable', 'gps_uncertain'].includes(status) || !id(requestId)) fail('CALCULATION_NOT_ALLOWED');
      if (inflight) fail('CALCULATION_IN_PROGRESS');
      if (route && !eligible(time)) fail('REROUTE_NOT_ELIGIBLE');
      if (usedRequests.has(requestId)) fail('REQUEST_ID_REUSED');
      if (usedRequests.size >= maxCalculations) fail('CALCULATION_BUDGET_EXCEEDED');
      usedRequests.add(requestId);
      inflight = { requestId, graphVersion: destination.graphVersion, poiId: destination.poiId, revisionId: destination.revisionId };
      lastCalculation = time; offRouteFixes = 0; status = 'calculating';
      return { ...inflight };
    },
    acceptRoute(result) {
      if (!inflight || !result || !['requestId', 'graphVersion', 'poiId', 'revisionId'].every(key => result[key] === inflight[key])) return false;
      if (!Array.isArray(result.geometry) || result.geometry.length < 2 || result.geometry.length > maxRoutePoints || !result.geometry.every(validPoint)) fail('INVALID_GEOMETRY');
      const gpsBlocked = ['gps_unavailable', 'gps_uncertain'].includes(status);
      route = { geometry: result.geometry.map(p => [...p]) }; inflight = null;
      if (!gpsBlocked) status = 'navigating';
      // Reevaluate the latest location against the new line without treating it as a fresh arrival fix.
      if (latestFix && !gpsBlocked) offRouteFixes = distanceToPolyline(latestFix.position, route.geometry) > 30 + EPS ? 1 : 0;
      return true;
    },
    failCalculation(requestId) {
      if (!inflight || inflight.requestId !== requestId) return false;
      inflight = null;
      if (!['gps_unavailable', 'gps_uncertain'].includes(status)) status = route ? 'navigating' : 'route_unavailable';
      return true;
    },
    observeFix(value) {
      const time = clock();
      if (!destination || status === 'arrived') return { event: 'inactive' };
      if (!value || !Number.isFinite(value.timestamp) || value.timestamp < 0 || value.timestamp <= lastTimestamp) {
        offRouteFixes = 0; return { event: 'stale_fix' };
      }
      lastTimestamp = value.timestamp;
      if (!validPoint(value.position) || !Number.isFinite(value.accuracyMeters) || value.accuracyMeters < 0 || value.accuracyMeters > 50) {
        offRouteFixes = 0; status = 'gps_uncertain'; return { event: 'gps_uncertain' };
      }
      latestFix = { position: [...value.position], accuracyMeters: value.accuracyMeters, timestamp: value.timestamp };
      if (value.accuracyMeters <= 25 && distanceMeters(value.position, destination.entrance) <= 25 + EPS) {
        const cancelRequestId = inflight?.requestId ?? null;
        inflight = null; offRouteFixes = 0; status = 'arrived'; return { event: 'arrived', cancelRequestId };
      }
      status = inflight ? 'calculating' : route ? 'navigating' : 'loading_graph';
      if (route) offRouteFixes = distanceToPolyline(value.position, route.geometry) > 30 + EPS ? offRouteFixes + 1 : 0;
      return { event: eligible(time) ? 'reroute_eligible' : 'retain_route' };
    },
    gpsLost() { offRouteFixes = 0; if (destination && status !== 'arrived') status = 'gps_unavailable'; return { event: 'gps_unavailable' }; },
    pollReroute() {
      // Polling never increments the fix streak or declares arrival from an old fix.
      const time = clock();
      return { event: !['gps_unavailable', 'gps_uncertain', 'arrived'].includes(status) && eligible(time) ? 'reroute_eligible' : 'retain_route' };
    },
    cancel() {
      const cancelRequestId = inflight?.requestId ?? null;
      destination = null; route = null; inflight = null; latestFix = null; offRouteFixes = 0; lastCalculation = null; status = 'idle';
      return { event: 'cancelled', cancelRequestId };
    },
    withdraw(poiId) {
      if (destination?.poiId !== poiId) return { event: 'unchanged' };
      const cancelRequestId = inflight?.requestId ?? null;
      destination = null; route = null; inflight = null; latestFix = null; offRouteFixes = 0; lastCalculation = null; status = 'destination_withdrawn';
      return { event: 'destination_withdrawn', cancelRequestId };
    },
  });
}
