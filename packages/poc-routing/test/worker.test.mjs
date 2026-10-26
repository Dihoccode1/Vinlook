import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Worker } from 'node:worker_threads';
import { createNodeWorkerClient } from '../src/worker-client.mjs';
import { installRoutingWorker, WORKER_PROTOCOL } from '../src/worker-runtime.mjs';
import { createGraph, aStar } from '../src/core.mjs';
import { generatedGraph, referenceDijkstra, node, edge, limits } from './core-fixtures.mjs';
const config = () => ({ graphVersion: 'synthetic-worker-v1', limits: { ...limits }, maxRequests: 200, maxResultPoints: 500 });
const request = (requestId = 'route-1', fromNodeId = 'a', toNodeId = 'b') => ({ requestId, fromNodeId, toNodeId, graphVersion: 'synthetic-worker-v1' });
const input = () => ({ nodes: [node('a', 0), node('b', 100), node('island', 300)], edges: [edge('ab', 'a', 'b', 120)] });
function realFactory(instances, workerData) {
  return () => {
    const raw = new Worker(new URL('./node-worker-fixture.mjs', import.meta.url), { workerData });
    const listeners = new Map();
    const record = { raw, terminated: false, exited: new Promise(resolve => raw.once('exit', resolve)) }; instances.push(record);
    return {
      addEventListener(type, handler) { const fn = value => handler(type === 'message' ? { data: value } : value); listeners.set(handler, [type, fn]); raw.on(type, fn); },
      removeEventListener(type, handler) { const pair = listeners.get(handler); if (pair) raw.off(type, pair[1]); },
      postMessage: value => raw.postMessage(value),
      terminate() { record.terminated = true; return raw.terminate(); },
    };
  };
}
const client = (overrides = {}) => createNodeWorkerClient({ graph: input(), config: config(), timeoutMilliseconds: 3000, ...overrides });

test('real Worker entry loads once and 144 directed/disconnected node queries match independent Dijkstra', async t => {
  const graph = generatedGraph(12), workers = [], c = client({ graph, workerFactory: realFactory(workers) }); t.after(() => c.dispose());
  let i = 0;
  for (const a of graph.nodes) for (const b of graph.nodes) {
    const result = await c.calculateNodes(request(`r-${i++}`, a.id, b.id));
    const expected = referenceDijkstra(graph.nodes, graph.edges, a.id, b.id);
    if (Number.isFinite(expected)) { assert.equal(result.status, 'found'); assert.ok(Math.abs(result.distanceMeters - expected) < 1e-7); }
    else { assert.equal(result.status, 'no_route'); assert.equal(result.geometry, undefined); }
  }
  assert.equal(i, 144); assert.equal(workers.length, 1);
});

test('caller graph/config/request mutations cannot change the private Worker snapshot', async t => {
  const graph = input(), pinned = config(), workers = [], c = client({ graph, config: pinned, workerFactory: realFactory(workers) }); t.after(() => c.dispose());
  graph.edges[0].lengthMeters = 999; graph.nodes[0].point[0] = 0; pinned.graphVersion = 'changed'; pinned.limits.nodes = 1;
  const req = request(), calculation = c.calculateNodes(req); req.fromNodeId = 'island';
  const result = await calculation; assert.equal(result.distanceMeters, 120); assert.equal(result.nodeIds[0], 'a');
  result.geometry[0][0] = 0;
  assert.notEqual((await c.calculateNodes(request('second'))).geometry[0][0], 0);
});

test('hard cancel terminates a genuinely blocked thread, rejects pending work and replacement reloads pinned graph', async t => {
  const workers = [], state = new Int32Array(new SharedArrayBuffer(8)); let first = true;
  const c = client({ workerFactory: () => { const factory = realFactory(workers, first ? { block: state.buffer } : undefined); first = false; return factory(); } });
  t.after(() => c.dispose());
  const blocked = c.calculateNodes(request()); const rejected = assert.rejects(blocked, { code: 'CALCULATION_ABORTED' });
  await Atomics.waitAsync(state, 0, 0, 2000).value;
  assert.equal(Atomics.load(state, 0), 1); c.cancel();
  const next = c.calculateNodes(request('replacement'));
  await rejected; await workers[0].exited;
  assert.equal(workers[0].terminated, true); assert.equal((await next).distanceMeters, 120); assert.equal(workers.length, 2);
});

test('one inflight, unique bounded request IDs, pinned version, dispose and explicit search/output budgets', async t => {
  const workers = [], c = client({ config: { ...config(), maxRequests: 2 }, workerFactory: realFactory(workers) }); t.after(() => c.dispose());
  const first = c.calculateNodes(request());
  await assert.rejects(c.calculateNodes(request('parallel')), { code: 'WORKER_BUSY' }); await first;
  await assert.rejects(c.calculateNodes(request()), { code: 'DUPLICATE_REQUEST' });
  await assert.rejects(c.calculateNodes({ ...request('version'), graphVersion: 'other' }), { code: 'GRAPH_INCOMPATIBLE' });
  await c.calculateNodes(request('second'));
  await assert.rejects(c.calculateNodes(request('third')), { code: 'REQUEST_LIMIT_EXCEEDED' });
  c.dispose(); await assert.rejects(c.calculateNodes(request('disposed')), { code: 'WORKER_DISPOSED' });
  for (const [change, code] of [[{ limits: { ...limits, searchSettled: 1 } }, 'SEARCH_BUDGET_EXCEEDED'], [{ maxResultPoints: 1 }, 'RESULT_BUDGET_EXCEEDED']]) {
    const limited = client({ config: { ...config(), ...change }, workerFactory: realFactory([]) });
    try { await assert.rejects(limited.calculateNodes(request()), { code }); } finally { limited.dispose(); }
  }
});

function controlledFactory(records) {
  return () => {
    const handlers = new Map(), record = { terminated: false, sent: [], listeners: handlers,
      reply(data) { handlers.get('message')?.({ data: { protocol: WORKER_PROTOCOL, ...data } }); } };
    records.push(record);
    return { addEventListener: (type, fn) => handlers.set(type, fn), removeEventListener: (type, fn) => { if (handlers.get(type) === fn) handlers.delete(type); },
      postMessage: message => record.sent.push(message), terminate: () => { record.terminated = true; } };
  };
}
const ready = record => record.reply({ type: 'NODE_GRAPH_READY', requestId: record.sent[0].requestId, graphVersion: 'synthetic-worker-v1' });

test('timeout, factory/postMessage/error failures reject safely and terminate; no hanging promises', async t => {
  const records = [], c = client({ workerFactory: controlledFactory(records), timeoutMilliseconds: 25 }); t.after(() => c.dispose());
  await assert.rejects(c.calculateNodes(request()), { code: 'WORKER_TIMEOUT' }); assert.equal(records[0].terminated, true);
  const failed = c.calculateNodes(request('error')); const rejects = assert.rejects(failed, { code: 'WORKER_FAILED' });
  records[1].listeners.get('error')({ message: 'private path/token must not escape', preventDefault() {} }); await rejects;
  const unavailable = client({ workerFactory() { throw new Error('private'); } });
  await assert.rejects(unavailable.calculateNodes(request()), { code: 'WORKER_FAILED' }); unavailable.dispose();
  const broken = client({ workerFactory: () => ({ addEventListener() {}, removeEventListener() {}, terminate() {}, postMessage() { throw new Error('private'); } }) });
  await assert.rejects(broken.calculateNodes(request()), { code: 'WORKER_FAILED' }); broken.dispose();
});

test('malformed/mixed/stale responses never become success and old callbacks cannot affect replacement', async t => {
  const records = [], c = client({ workerFactory: controlledFactory(records) }); t.after(() => c.dispose());
  const old = c.calculateNodes(request()); const oldRejected = assert.rejects(old, { code: 'CALCULATION_ABORTED' });
  const oldCallback = records[0].listeners.get('message'); c.cancel();
  const next = c.calculateNodes(request('next')); ready(records[1]); await Promise.resolve();
  oldCallback({ data: { protocol: WORKER_PROTOCOL, type: 'ERROR', requestId: 'next', code: 'CALCULATION_FAILED' } });
  assert.equal(records[1].terminated, false);
  const rejected = assert.rejects(next, { code: 'INVALID_WORKER_RESPONSE' });
  records[1].reply({ type: 'NODE_ROUTE_RESULT', requestId: 'next', graphVersion: 'other', fromNodeId: 'a', toNodeId: 'b', result: {} });
  await oldRejected; await rejected;
  for (const bad of [
    { type: 'ERROR', code: 'raw private error' },
    { type: 'NODE_GRAPH_READY', graphVersion: 'synthetic-worker-v1', privateField: 'unexpected' },
    { type: 'NODE_GRAPH_READY', graphVersion: 'synthetic-worker-v1', requestId: 'wrong' },
  ]) {
    const job = c.calculateNodes(request(`bad-${records.length}`)), record = records.at(-1);
    const check = assert.rejects(job, { code: 'INVALID_WORKER_RESPONSE' }); record.reply({ requestId: record.sent[0].requestId, ...bad }); await check;
  }
});

test('Worker runtime rejects reload, unknown messages, missing graph, private exceptions and unsafe graph', () => {
  let handler; const output = [];
  installRoutingWorker({ addEventListener: (_, fn) => { handler = fn; }, postMessage: data => output.push(data) });
  const send = data => { handler({ data: { protocol: WORKER_PROTOCOL, requestId: 'test', ...data } }); return output.at(-1); };
  assert.equal(send({ type: 'ROUTE_NODES', graphVersion: 'synthetic-worker-v1', fromNodeId: 'a', toNodeId: 'b' }).code, 'GRAPH_UNAVAILABLE');
  assert.equal(send({ type: 'CANCEL' }).code, 'INVALID_MESSAGE');
  assert.equal(send({ type: 'LOAD_NODE_GRAPH', config: config(), graph: input() }).type, 'NODE_GRAPH_READY');
  assert.equal(send({ type: 'LOAD_NODE_GRAPH', config: config(), graph: input() }).code, 'INVALID_MESSAGE');
  assert.equal(send({ type: 'ROUTE_NODES', graphVersion: 'synthetic-worker-v1', fromNodeId: 'b', toNodeId: 'a' }).result.status, 'no_route');
  assert.equal(send({ type: 'ROUTE_NODES', graphVersion: 'synthetic-worker-v1', fromNodeId: 'a', toNodeId: 'b' }).code, 'DUPLICATE_REQUEST');
  assert.throws(() => client({ graph: { ...input(), nodes: [{ ...node('a', 0), point: [1, 2, 3] }] } }), { code: 'INVALID_GRAPH' });
  assert.throws(() => client({ config: { ...config(), maxRequests: Infinity } }), { code: 'INVALID_WORKER_CONFIG' });
  let unsafe;
  installRoutingWorker({ addEventListener: (_, fn) => { unsafe = fn; }, postMessage: data => output.push(data) });
  unsafe({ data: { protocol: WORKER_PROTOCOL, type: 'LOAD_NODE_GRAPH', requestId: 'private-error', graph: input(),
    get config() { throw new Error('private source details'); } } });
  assert.deepEqual(output.at(-1), { protocol: WORKER_PROTOCOL, type: 'ERROR', requestId: 'private-error', code: 'CALCULATION_FAILED' });
});

test('invalid output geometry/cost/path/fields and cancellation after response cannot escape the current generation', async t => {
  const records = [], c = client({ workerFactory: controlledFactory(records) }); t.after(() => c.dispose());
  const valid = aStar(createGraph(input(), limits), 'a', 'b');
  const badResults = [
    { ...valid, geometry: [[NaN, 0], valid.geometry[1]] }, { ...valid, geometry: [] },
    { ...valid, distanceMeters: 1 }, { ...valid, distanceMeters: Infinity },
    { ...valid, nodeIds: ['b', 'a'] }, { ...valid, edgeIds: [] },
    { ...valid, privateField: 'unexpected' }, { status: 'no_route', settled: 1, geometry: valid.geometry },
  ];
  for (let i = 0; i < badResults.length; i++) {
    const job = c.calculateNodes(request(`bad-output-${i}`)), check = assert.rejects(job, { code: 'INVALID_WORKER_RESPONSE' });
    const record = records.at(-1); ready(record); await Promise.resolve();
    record.reply({ type: 'NODE_ROUTE_RESULT', requestId: `bad-output-${i}`, graphVersion: 'synthetic-worker-v1', fromNodeId: 'a', toNodeId: 'b', result: badResults[i] });
    await check;
  }
  const job = c.calculateNodes(request('resolved-then-canceled')), check = assert.rejects(job, { code: 'CALCULATION_ABORTED' });
  const record = records.at(-1); ready(record); await Promise.resolve();
  record.reply({ type: 'NODE_ROUTE_RESULT', requestId: 'resolved-then-canceled', graphVersion: 'synthetic-worker-v1', fromNodeId: 'a', toNodeId: 'b', result: valid });
  c.cancel(); await check;
});

test('invalid metric graph never becomes loaded or available for route queries', async t => {
  const graph = input(); graph.edges[0].lengthMeters = 1;
  const workers = [], c = client({ graph, workerFactory: realFactory(workers) }); t.after(() => c.dispose());
  await assert.rejects(c.calculateNodes(request()), { code: 'INVALID_METRIC_EDGE' });
  assert.equal(workers[0].terminated, true); await workers[0].exited;
});
