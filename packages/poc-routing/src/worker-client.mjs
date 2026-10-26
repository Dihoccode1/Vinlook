import { RoutingFailure, validPoint, distanceMeters } from './core.mjs';
import {
  WORKER_PROTOCOL,
  opaqueId,
  exactKeys,
  validateWorkerConfig,
  copyWorkerGraph,
} from './worker-runtime.mjs';
const failure = (code) => new RoutingFailure(code);
const errorCodes = new Set([
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
  'CALCULATION_FAILED',
]);

/** Internal node-to-node client. Cancellation terminates the actual synchronous Worker. */
export function createNodeWorkerClient({
  graph,
  config,
  timeoutMilliseconds,
  workerFactory = () => new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' }),
} = {}) {
  validateWorkerConfig(config);
  if (
    !Number.isSafeInteger(timeoutMilliseconds) ||
    timeoutMilliseconds < 1 ||
    timeoutMilliseconds > 60000 ||
    typeof workerFactory !== 'function'
  )
    throw failure('INVALID_WORKER_CONFIG');
  const pinned = { ...config, limits: { ...config.limits } },
    input = copyWorkerGraph(graph, config.limits);
  let worker = null,
    detach = null,
    epoch = 0,
    loaded = false,
    disposed = false,
    pending = null,
    active = null;
  const used = new Set();
  function reset(code) {
    epoch++;
    loaded = false;
    active = null;
    if (worker) {
      try {
        detach?.();
      } catch {
        /* Broken injected factories must not prevent rejection. */
      }
      detach = null;
      try {
        worker.terminate();
      } catch {
        /* Still invalidate the generation and reject; never reuse. */
      }
      worker = null;
    }
    if (pending) {
      const task = pending;
      pending = null;
      clearTimeout(task.timer);
      task.reject(failure(code));
    }
  }
  function onError(event) {
    event?.preventDefault?.();
    reset('WORKER_FAILED');
  }
  function onMessage(event) {
    if (!pending) return;
    const message = event.data,
      task = pending;
    if (!message || message.protocol !== WORKER_PROTOCOL || message.requestId !== task.requestId) {
      reset('INVALID_WORKER_RESPONSE');
      return;
    }
    if (message.type === 'ERROR') {
      if (
        !exactKeys(message, ['protocol', 'type', 'requestId', 'code']) ||
        !errorCodes.has(message.code)
      ) {
        reset('INVALID_WORKER_RESPONSE');
        return;
      }
      reset(message.code);
      return;
    }
    if (task.kind === 'load') {
      if (
        !exactKeys(message, ['protocol', 'type', 'requestId', 'graphVersion']) ||
        message.type !== 'NODE_GRAPH_READY' ||
        message.graphVersion !== pinned.graphVersion
      ) {
        reset('INVALID_WORKER_RESPONSE');
        return;
      }
    } else {
      if (
        !exactKeys(message, [
          'protocol',
          'type',
          'requestId',
          'graphVersion',
          'fromNodeId',
          'toNodeId',
          'result',
        ]) ||
        message.type !== 'NODE_ROUTE_RESULT' ||
        message.graphVersion !== pinned.graphVersion ||
        message.fromNodeId !== task.fromNodeId ||
        message.toNodeId !== task.toNodeId ||
        !validResult(message.result, task)
      ) {
        reset('INVALID_WORKER_RESPONSE');
        return;
      }
    }
    clearTimeout(task.timer);
    pending = null;
    task.resolve(message.result);
  }
  function validResult(result, task) {
    if (result?.status === 'no_route')
      return (
        exactKeys(result, ['status', 'settled']) &&
        Number.isSafeInteger(result.settled) &&
        result.settled >= 0 &&
        result.settled <= pinned.limits.searchSettled
      );
    if (
      !exactKeys(result, [
        'status',
        'distanceMeters',
        'nodeIds',
        'edgeIds',
        'geometry',
        'settled',
      ]) ||
      result.status !== 'found' ||
      !Number.isFinite(result.distanceMeters) ||
      result.distanceMeters < 0 ||
      result.distanceMeters > Number.MAX_SAFE_INTEGER ||
      !Number.isSafeInteger(result.settled) ||
      result.settled < 1 ||
      result.settled > pinned.limits.searchSettled ||
      !Array.isArray(result.geometry) ||
      !result.geometry.length ||
      result.geometry.length > pinned.maxResultPoints ||
      !result.geometry.every(validPoint) ||
      !Array.isArray(result.nodeIds) ||
      result.nodeIds.length !== result.geometry.length ||
      !result.nodeIds.every(opaqueId) ||
      result.nodeIds[0] !== task.fromNodeId ||
      result.nodeIds.at(-1) !== task.toNodeId ||
      !Array.isArray(result.edgeIds) ||
      result.edgeIds.length !== result.nodeIds.length - 1 ||
      !result.edgeIds.every(opaqueId)
    )
      return false;
    let minimum = 0;
    for (let i = 1; i < result.geometry.length; i++)
      minimum += distanceMeters(result.geometry[i - 1], result.geometry[i]);
    return result.distanceMeters + 1e-7 >= minimum;
  }
  function exchange(message, kind) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reset('WORKER_TIMEOUT'), timeoutMilliseconds);
      pending = { ...message, kind, resolve, reject, timer };
      try {
        worker.postMessage({ protocol: WORKER_PROTOCOL, ...message });
      } catch {
        reset('WORKER_FAILED');
      }
    });
  }
  return Object.freeze({
    async calculateNodes(request) {
      if (disposed) throw failure('WORKER_DISPOSED');
      if (active) throw failure('WORKER_BUSY');
      if (
        !exactKeys(request, ['requestId', 'graphVersion', 'fromNodeId', 'toNodeId']) ||
        !opaqueId(request.requestId) ||
        request.requestId.startsWith('load:') ||
        !opaqueId(request.fromNodeId) ||
        !opaqueId(request.toNodeId)
      )
        throw failure('INVALID_MESSAGE');
      if (request.graphVersion !== pinned.graphVersion) throw failure('GRAPH_INCOMPATIBLE');
      if (used.has(request.requestId)) throw failure('DUPLICATE_REQUEST');
      if (used.size >= pinned.maxRequests) throw failure('REQUEST_LIMIT_EXCEEDED');
      used.add(request.requestId);
      const token = { ...request },
        generation = epoch;
      active = token;
      try {
        if (!worker) {
          try {
            worker = workerFactory();
            const instance = worker;
            const message = (event) => {
              if (epoch === generation && worker === instance) onMessage(event);
            };
            const error = (event) => {
              if (epoch === generation && worker === instance) onError(event);
            };
            detach = () => {
              instance.removeEventListener('message', message);
              instance.removeEventListener('error', error);
              instance.removeEventListener('messageerror', error);
            };
            worker.addEventListener('message', message);
            worker.addEventListener('error', error);
            worker.addEventListener('messageerror', error);
          } catch {
            reset('WORKER_FAILED');
            throw failure('WORKER_FAILED');
          }
        }
        if (!loaded) {
          await exchange(
            {
              type: 'LOAD_NODE_GRAPH',
              requestId: `load:${used.size}`,
              config: pinned,
              graph: input,
            },
            'load',
          );
          if (generation !== epoch) throw failure('CALCULATION_ABORTED');
          loaded = true;
        }
        const result = await exchange({ type: 'ROUTE_NODES', ...token }, 'route');
        if (generation !== epoch) throw failure('CALCULATION_ABORTED');
        return result;
      } finally {
        if (active === token) active = null;
      }
    },
    cancel() {
      reset('CALCULATION_ABORTED');
    },
    dispose() {
      disposed = true;
      reset('WORKER_DISPOSED');
    },
  });
}
