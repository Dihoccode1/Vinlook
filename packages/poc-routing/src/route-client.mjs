import { RoutingFailure, validPoint } from './core.mjs';
import { exactKeys, copyWorkerGraph } from './worker-runtime.mjs';
import {
  ROUTE_PROTOCOL,
  validateRouteConfig,
  validRouteRequest,
  validCsrSource,
} from './route-worker-runtime.mjs';
import { R1_SCHEMA_VERSION, R1_ERROR_CODES, R1_WARNINGS } from './guidance.mjs';
const failure = (code) => new RoutingFailure(code);
const MANEUVERS = new Set(['depart', 'continue', 'left', 'right', 'u_turn', 'arrive']);
const resultKeys = [
  'protocol',
  'type',
  'requestId',
  'graphVersion',
  'destinationPoiId',
  'destinationRevisionId',
  'geometry',
  'distanceMeters',
  'instructions',
  'snappedStart',
  'snappedEnd',
  'warnings',
];

/**
 * Drop-in for the web navigation controller's workerFactory(): calculate({token,position,accuracyMeters,destination})
 * and terminate(). Terminate physically stops the synchronous Worker; a new client reloads the graph.
 * Pass either a normalized `graph` or `csr` artifact bytes ({binary, metadata, sha256, profileVersion, bytes, metadataBytes});
 * CSR is checksum-verified and decoded inside the Worker. Alternatively pass `tiles` with
 * manifestUrl/manifestSha256/graphVersion/limits/searchLimits for lazy verified R2 search.
 */
export function createRouteWorkerClient({
  graph,
  csr,
  tiles,
  config,
  timeoutMilliseconds,
  workerFactory = () =>
    new Worker(new URL('./route-worker.mjs', import.meta.url), { type: 'module' }),
} = {}) {
  validateRouteConfig(config);
  if (
    !Number.isSafeInteger(timeoutMilliseconds) ||
    timeoutMilliseconds < 1 ||
    timeoutMilliseconds > 60000 ||
    typeof workerFactory !== 'function' ||
    [graph, csr, tiles].filter((x) => x !== undefined).length !== 1
  )
    throw failure('INVALID_WORKER_CONFIG');
  if (csr !== undefined && !validCsrSource(csr)) throw failure('INVALID_WORKER_CONFIG');
  const pinned = { ...config, limits: { ...config.limits } };
  // Copies keep caller mutations out; CSR bytes are copied so the caller's buffers are never transferred or detached.
  const source =
    tiles !== undefined
      ? { tiles: structuredClone(tiles) }
      : graph !== undefined
        ? { graph: copyWorkerGraph(graph, config.limits) }
        : { csr: { ...csr, binary: csr.binary.slice(), metadata: csr.metadata.slice() } };
  let worker = null,
    detach = null,
    loaded = false,
    terminated = false,
    pending = null,
    loads = 0;
  function stop(code) {
    terminated = true;
    loaded = false;
    if (worker) {
      try {
        detach?.();
      } catch {
        /* Still terminate and reject. */
      }
      detach = null;
      try {
        worker.terminate();
      } catch {
        /* Generation is closed regardless. */
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
  function validRoute(message, task) {
    if (
      !exactKeys(message, resultKeys) ||
      message.type !== 'ROUTE_RESULT' ||
      message.graphVersion !== pinned.graphVersion ||
      message.destinationPoiId !== task.destinationPoiId ||
      message.destinationRevisionId !== task.destinationRevisionId ||
      !Array.isArray(message.geometry) ||
      message.geometry.length < 2 ||
      message.geometry.length > pinned.maxResultPoints ||
      !message.geometry.every(validPoint) ||
      !Number.isFinite(message.distanceMeters) ||
      message.distanceMeters < 0 ||
      !validPoint(message.snappedStart) ||
      !validPoint(message.snappedEnd) ||
      !Array.isArray(message.warnings) ||
      !message.warnings.every((code) => R1_WARNINGS.includes(code)) ||
      !Array.isArray(message.instructions) ||
      message.instructions.length < 2
    )
      return false;
    return message.instructions.every(
      (step) =>
        exactKeys(step, ['maneuver', 'geometryIndex', 'distanceMeters', 'streetName', 'text']) &&
        MANEUVERS.has(step.maneuver) &&
        Number.isSafeInteger(step.geometryIndex) &&
        step.geometryIndex >= 0 &&
        step.geometryIndex < message.geometry.length &&
        Number.isFinite(step.distanceMeters) &&
        step.distanceMeters >= 0 &&
        (step.streetName === null || typeof step.streetName === 'string') &&
        typeof step.text === 'string' &&
        step.text.length > 0,
    );
  }
  function onMessage(event) {
    if (!pending) return;
    const message = event.data,
      task = pending;
    if (!message || message.protocol !== ROUTE_PROTOCOL || message.requestId !== task.requestId) {
      stop('CALCULATION_FAILED');
      return;
    }
    if (message.type === 'ERROR') {
      const known =
        exactKeys(message, ['protocol', 'type', 'requestId', 'code', 'retryable']) &&
        R1_ERROR_CODES.includes(message.code);
      // A Worker error leaves no reusable state worth trusting; GRAPH_* stay sticky via a fresh client.
      pending = null;
      clearTimeout(task.timer);
      task.reject(failure(known ? message.code : 'CALCULATION_FAILED'));
      if (!known || task.kind === 'load') stop('CALCULATION_FAILED');
      return;
    }
    if (
      task.kind === 'load'
        ? !(
            exactKeys(message, [
              'protocol',
              'type',
              'requestId',
              'graphVersion',
              'schemaVersion',
            ]) &&
            message.type === 'GRAPH_READY' &&
            message.graphVersion === pinned.graphVersion &&
            message.schemaVersion === R1_SCHEMA_VERSION
          )
        : !validRoute(message, task)
    ) {
      stop('CALCULATION_FAILED');
      return;
    }
    pending = null;
    clearTimeout(task.timer);
    task.resolve(message);
  }
  function exchange(message, kind) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => stop('CALCULATION_FAILED'), timeoutMilliseconds);
      pending = { ...message, kind, resolve, reject, timer };
      try {
        worker.postMessage({ protocol: ROUTE_PROTOCOL, ...message });
      } catch {
        stop('CALCULATION_FAILED');
      }
    });
  }
  function ensureWorker() {
    if (worker) return;
    try {
      worker = workerFactory();
      const instance = worker;
      const message = (event) => {
        if (worker === instance) onMessage(event);
      };
      const error = (event) => {
        event?.preventDefault?.();
        if (worker === instance) stop('CALCULATION_FAILED');
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
      stop('GRAPH_UNAVAILABLE');
      throw failure('GRAPH_UNAVAILABLE');
    }
  }
  return Object.freeze({
    async calculate({ token, position, accuracyMeters, destination } = {}) {
      if (terminated) throw failure('CALCULATION_FAILED');
      if (pending) throw failure('CALCULATION_FAILED');
      if (
        !token ||
        !destination ||
        token.graphVersion !== pinned.graphVersion ||
        destination.graphVersion !== pinned.graphVersion
      )
        throw failure('GRAPH_INCOMPATIBLE');
      const request = {
        requestId: token.requestId,
        graphVersion: token.graphVersion,
        destinationPoiId: token.poiId,
        destinationRevisionId: token.revisionId,
        position: Array.isArray(position) ? [...position] : position,
        accuracyMeters,
        entrance: Array.isArray(destination.entrance)
          ? [...destination.entrance]
          : destination.entrance,
      };
      if (
        !validRouteRequest(request) ||
        request.requestId.startsWith('load:') ||
        token.poiId !== destination.poiId ||
        token.revisionId !== destination.revisionId
      )
        throw failure('INVALID_POSITION');
      ensureWorker();
      if (!loaded) {
        await exchange(
          {
            type: 'LOAD_GRAPH',
            requestId: `load:${++loads}`,
            graphVersion: pinned.graphVersion,
            schemaVersion: R1_SCHEMA_VERSION,
            config: pinned,
            ...source,
          },
          'load',
        );
        loaded = true;
      }
      const route = await exchange({ type: 'CALCULATE_ROUTE', ...request }, 'route');
      // Field names consumed by createNavigationPolicy().acceptRoute plus the full R1 payload.
      return {
        requestId: route.requestId,
        graphVersion: route.graphVersion,
        poiId: route.destinationPoiId,
        revisionId: route.destinationRevisionId,
        geometry: route.geometry,
        distanceMeters: route.distanceMeters,
        instructions: route.instructions,
        snappedStart: route.snappedStart,
        snappedEnd: route.snappedEnd,
        warnings: route.warnings,
      };
    },
    terminate() {
      stop('CALCULATION_FAILED');
    },
  });
}
