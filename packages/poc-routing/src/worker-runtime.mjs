import { createGraph, aStar, RoutingFailure, validPoint } from './core.mjs';

// Internal node-query transport; deliberately distinct from the proposed GPS R1 bridge.
export const WORKER_PROTOCOL = 'vinlook-node-worker-v1';
export const opaqueId = (value) =>
  typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
export const graphVersion = (value) =>
  typeof value === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(value);
export const exactKeys = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const fail = (code) => {
  throw new RoutingFailure(code);
};
const limitKeys = [
  'nodes',
  'edges',
  'indexEntries',
  'snapCandidates',
  'queryEdges',
  'searchSettled',
];
export function validateWorkerConfig(value) {
  if (
    !exactKeys(value, ['graphVersion', 'limits', 'maxRequests', 'maxResultPoints']) ||
    !graphVersion(value.graphVersion) ||
    !exactKeys(value.limits, limitKeys) ||
    limitKeys.some((key) => !Number.isSafeInteger(value.limits[key]) || value.limits[key] < 1) ||
    !Number.isSafeInteger(value.maxRequests) ||
    value.maxRequests < 1 ||
    value.maxRequests > 10000 ||
    !Number.isSafeInteger(value.maxResultPoints) ||
    value.maxResultPoints < 1 ||
    value.maxResultPoints > value.limits.nodes
  )
    fail('INVALID_WORKER_CONFIG');
}
export function copyWorkerGraph(input, limits) {
  if (
    !exactKeys(input, ['nodes', 'edges']) ||
    !Array.isArray(input.nodes) ||
    !input.nodes.length ||
    input.nodes.length > limits.nodes ||
    !Array.isArray(input.edges) ||
    input.edges.length > limits.edges
  )
    fail('INVALID_GRAPH_BUDGET');
  // Copy only core fields before postMessage; no caller metadata, callbacks, URLs or secrets cross the boundary.
  return {
    nodes: input.nodes.map((node) => {
      if (
        !opaqueId(node?.id) ||
        !validPoint(node.point) ||
        ![true, false, null, undefined].includes(node.passable)
      )
        fail('INVALID_GRAPH');
      return { id: node.id, point: [...node.point], passable: node.passable };
    }),
    edges: input.edges.map((edge) => {
      if (
        ![edge?.id, edge?.from, edge?.to].every(opaqueId) ||
        !Number.isFinite(edge.lengthMeters) ||
        ![true, false, null, undefined].includes(edge.walkable) ||
        ![true, false, null, undefined].includes(edge.restrictionsResolved) ||
        (edge.streetName !== undefined &&
          edge.streetName !== null &&
          (typeof edge.streetName !== 'string' || edge.streetName.length > 1024))
      )
        fail('INVALID_GRAPH');
      return {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        lengthMeters: edge.lengthMeters,
        walkable: edge.walkable,
        restrictionsResolved: edge.restrictionsResolved,
        streetName: edge.streetName ?? null,
      };
    }),
  };
}
const safeCodes = new Set([
  'INVALID_GRAPH_BUDGET',
  'INVALID_GRAPH',
  'INVALID_METRIC_EDGE',
  'UNSUPPORTED_SEGMENT',
  'SPATIAL_INDEX_BUDGET_EXCEEDED',
  'SEARCH_BUDGET_EXCEEDED',
  'COST_OVERFLOW',
  'INVALID_NODE',
  'RESULT_BUDGET_EXCEEDED',
  'INVALID_MESSAGE',
  'GRAPH_UNAVAILABLE',
  'GRAPH_INCOMPATIBLE',
  'REQUEST_LIMIT_EXCEEDED',
  'DUPLICATE_REQUEST',
]);

/** One graph per Worker lifetime. No network, storage, GPS, connector inference or turn guidance. */
export function installRoutingWorker(scope) {
  let graph = null,
    config = null,
    attemptedLoad = false;
  const requests = new Set();
  const send = (message) => scope.postMessage({ protocol: WORKER_PROTOCOL, ...message });
  scope.addEventListener('message', (event) => {
    const message = event.data;
    const requestId = opaqueId(message?.requestId) ? message.requestId : null;
    try {
      if (!message || message.protocol !== WORKER_PROTOCOL || requestId === null)
        fail('INVALID_MESSAGE');
      if (message.type === 'LOAD_NODE_GRAPH') {
        if (
          attemptedLoad ||
          !exactKeys(message, ['protocol', 'type', 'requestId', 'config', 'graph'])
        )
          fail('INVALID_MESSAGE');
        attemptedLoad = true;
        validateWorkerConfig(message.config);
        const nextConfig = { ...message.config, limits: { ...message.config.limits } };
        const nextGraph = createGraph(
          copyWorkerGraph(message.graph, nextConfig.limits),
          nextConfig.limits,
        );
        config = nextConfig;
        graph = nextGraph;
        send({ type: 'NODE_GRAPH_READY', requestId, graphVersion: config.graphVersion });
      } else if (message.type === 'ROUTE_NODES') {
        if (
          !exactKeys(message, [
            'protocol',
            'type',
            'requestId',
            'graphVersion',
            'fromNodeId',
            'toNodeId',
          ]) ||
          !opaqueId(message.fromNodeId) ||
          !opaqueId(message.toNodeId)
        )
          fail('INVALID_MESSAGE');
        if (!graph) fail('GRAPH_UNAVAILABLE');
        if (message.graphVersion !== config.graphVersion) fail('GRAPH_INCOMPATIBLE');
        if (requests.has(requestId)) fail('DUPLICATE_REQUEST');
        if (requests.size >= config.maxRequests) fail('REQUEST_LIMIT_EXCEEDED');
        requests.add(requestId);
        const result = aStar(graph, message.fromNodeId, message.toNodeId);
        if (result.status === 'found' && result.geometry.length > config.maxResultPoints)
          fail('RESULT_BUDGET_EXCEEDED');
        send({
          type: 'NODE_ROUTE_RESULT',
          requestId,
          graphVersion: config.graphVersion,
          fromNodeId: message.fromNodeId,
          toNodeId: message.toNodeId,
          result,
        });
      } else fail('INVALID_MESSAGE');
    } catch (error) {
      send({
        type: 'ERROR',
        requestId,
        code:
          error instanceof RoutingFailure && safeCodes.has(error.code)
            ? error.code
            : 'CALCULATION_FAILED',
      });
    }
  });
}
