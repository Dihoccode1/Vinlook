import { createGraph, RoutingFailure, validPoint } from './core.mjs';
import { opaqueId, graphVersion, exactKeys, validateWorkerConfig, copyWorkerGraph } from './worker-runtime.mjs';
import { R1_SCHEMA_VERSION, calculateGuidance, r1Code, retryable } from './guidance.mjs';

// Proposed R1 GPS/POI transport. Separate from vinlook-node-worker-v1, which stays an internal node query.
export const ROUTE_PROTOCOL = 'vinlook-route-worker-r1';
const fail = code => { throw new RoutingFailure(code); };
const configKeys = ['graphVersion', 'limits', 'maxRequests', 'maxResultPoints', 'entranceToleranceMeters'];

/** Entrance tolerance must stay within the arrival radius; it is a data-alignment bound, not a GPS threshold. */
export function validateRouteConfig(value) {
  if (!exactKeys(value, configKeys) || !Number.isFinite(value.entranceToleranceMeters)
    || value.entranceToleranceMeters < 0 || value.entranceToleranceMeters > 25) fail('INVALID_WORKER_CONFIG');
  const { entranceToleranceMeters, ...nodeConfig } = value;
  validateWorkerConfig(nodeConfig);
}
export const routeRequestKeys = ['requestId', 'graphVersion', 'destinationPoiId', 'destinationRevisionId', 'position', 'accuracyMeters', 'entrance'];
export function validRouteRequest(value) {
  return exactKeys(value, routeRequestKeys) && opaqueId(value.requestId) && graphVersion(value.graphVersion)
    && opaqueId(value.destinationPoiId) && opaqueId(value.destinationRevisionId)
    && validPoint(value.position) && validPoint(value.entrance) && Number.isFinite(value.accuracyMeters);
}

/** One graph per Worker lifetime; GPS stays in memory for one calculation and is never stored or sent elsewhere. */
export function installRouteWorker(scope) {
  let graph = null, config = null, attemptedLoad = false;
  const requests = new Set();
  const send = message => scope.postMessage({ protocol: ROUTE_PROTOCOL, ...message });
  scope.addEventListener('message', event => {
    const message = event.data;
    const requestId = opaqueId(message?.requestId) ? message.requestId : null;
    try {
      if (!message || message.protocol !== ROUTE_PROTOCOL || requestId === null) fail('CALCULATION_FAILED');
      if (message.type === 'LOAD_GRAPH') {
        if (attemptedLoad || !exactKeys(message, ['protocol', 'type', 'requestId', 'graphVersion', 'schemaVersion', 'config', 'graph'])) fail('GRAPH_INCOMPATIBLE');
        attemptedLoad = true;
        if (message.schemaVersion !== R1_SCHEMA_VERSION) fail('GRAPH_INCOMPATIBLE');
        try { validateRouteConfig(message.config); } catch { fail('GRAPH_INCOMPATIBLE'); }
        if (message.config.graphVersion !== message.graphVersion) fail('GRAPH_INCOMPATIBLE');
        const nextConfig = { ...message.config, limits: { ...message.config.limits } };
        let nextGraph;
        try { nextGraph = createGraph(copyWorkerGraph(message.graph, nextConfig.limits), nextConfig.limits); }
        catch { fail('GRAPH_UNAVAILABLE'); }
        config = nextConfig; graph = nextGraph;
        send({ type: 'GRAPH_READY', requestId, graphVersion: config.graphVersion, schemaVersion: R1_SCHEMA_VERSION });
      } else if (message.type === 'CALCULATE_ROUTE') {
        const { protocol, type, ...request } = message;
        if (!validRouteRequest(request)) fail('INVALID_POSITION');
        if (!graph) fail('GRAPH_UNAVAILABLE');
        if (request.graphVersion !== config.graphVersion) fail('GRAPH_INCOMPATIBLE');
        if (requests.has(requestId) || requests.size >= config.maxRequests) fail('CALCULATION_FAILED');
        requests.add(requestId);
        const route = calculateGuidance(graph, { position: request.position, accuracyMeters: request.accuracyMeters,
          entrance: request.entrance, entranceToleranceMeters: config.entranceToleranceMeters, maxResultPoints: config.maxResultPoints });
        send({ type: 'ROUTE_RESULT', requestId, graphVersion: config.graphVersion, destinationPoiId: request.destinationPoiId,
          destinationRevisionId: request.destinationRevisionId, ...route });
      } else fail('CALCULATION_FAILED');
    } catch (error) {
      const code = r1Code(error);
      send({ type: 'ERROR', requestId, code, retryable: retryable(code) });
    }
  });
}
