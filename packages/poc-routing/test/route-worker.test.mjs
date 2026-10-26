import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Worker } from 'node:worker_threads';
import { createRouteWorkerClient } from '../src/route-client.mjs';
import { calculateGuidance, buildInstructions } from '../src/guidance.mjs';
import { createNavigationPolicy } from '../src/navigation.mjs';
import { RoutingFailure } from '../src/core.mjs';
import { p, node, edge, graph, limits } from './core-fixtures.mjs';

// Synthetic L/T topology near an arbitrary reference; not HCMC streets, entrances or field data.
const both = (id, a, b, length) => [edge(`${id}.f`, a, b, length), edge(`${id}.r`, b, a, length)];
const input = () => ({ nodes: [node('a', 0), node('b', 100), node('c', 100, 100), node('d', 100, -100), node('island', 600)],
  edges: [...both('ab', 'a', 'b', 100.5), ...both('bc', 'b', 'c', 100.5), ...both('bd', 'b', 'd', 100.5)] });
const config = () => ({ graphVersion: 'synthetic-r1-v1', limits: { ...limits }, maxRequests: 50, maxResultPoints: 100, entranceToleranceMeters: 2 });
const options = extra => ({ position: p(0, 0), accuracyMeters: 10, entrance: p(100, 100), entranceToleranceMeters: 2, maxResultPoints: 100, ...extra });
const code = fn => { try { fn(); } catch (error) { assert.ok(error instanceof RoutingFailure); return error.code; } assert.fail('expected failure'); };

test('guidance snaps GPS and entrance, follows edges and emits left/right turns', () => {
  const g = graph(input().nodes, input().edges);
  const left = calculateGuidance(g, options());
  assert.deepEqual(left.instructions.map(step => step.maneuver), ['depart', 'left', 'arrive']);
  assert.ok(Math.abs(left.distanceMeters - 201) < 1e-6);
  assert.equal(left.instructions[0].distanceMeters > 99, true);
  assert.deepEqual(left.warnings, ['MISSING_STREET_NAME']);
  const right = calculateGuidance(g, options({ entrance: p(100, -100) }));
  assert.deepEqual(right.instructions.map(step => step.maneuver), ['depart', 'right', 'arrive']);
  assert.deepEqual(buildInstructions([p(0), p(50), p(0)]).map(step => step.maneuver), ['depart', 'u_turn', 'arrive']);
});

test('GPS beyond reported accuracy is an unverified connector and suppresses turn-by-turn', () => {
  const g = graph(input().nodes, input().edges);
  const route = calculateGuidance(g, options({ position: p(0, 30), accuracyMeters: 5 }));
  assert.deepEqual(route.warnings, ['UNVERIFIED_CONNECTOR', 'MISSING_STREET_NAME']);
  assert.deepEqual(route.instructions.map(step => step.maneuver), ['depart', 'arrive']);
});

test('off-graph entrance, far GPS, uncertain GPS and disconnected targets fail without straight-line fallback', () => {
  const g = graph(input().nodes, input().edges);
  assert.equal(code(() => calculateGuidance(g, options({ entrance: p(50, 10) }))), 'SNAP_NOT_FOUND');
  assert.equal(code(() => calculateGuidance(g, options({ position: p(0, 80) }))), 'SNAP_NOT_FOUND');
  assert.equal(code(() => calculateGuidance(g, options({ accuracyMeters: 51 }))), 'GPS_UNCERTAIN');
  const island = graph([...input().nodes, node('island2', 700)], [...input().edges, ...both('ii', 'island', 'island2', 100.5)]);
  assert.equal(code(() => calculateGuidance(island, options({ entrance: p(650) }))), 'NO_ROUTE');
});

function realFactory(instances) {
  return () => {
    const raw = new Worker(new URL('./route-worker-fixture.mjs', import.meta.url));
    const listeners = new Map(), record = { terminated: false }; instances.push(record);
    return {
      addEventListener(type, handler) { const fn = value => handler(type === 'message' ? { data: value } : value); listeners.set(handler, fn); raw.on(type, fn); },
      removeEventListener(type, handler) { const fn = listeners.get(handler); if (fn) raw.off(type, fn); },
      postMessage: value => raw.postMessage(value),
      terminate() { record.terminated = true; return raw.terminate(); },
    };
  };
}

test('real Worker client satisfies the navigation controller contract and policy acceptRoute', async t => {
  const workers = [], client = createRouteWorkerClient({ graph: input(), config: config(), timeoutMilliseconds: 5000, workerFactory: realFactory(workers) });
  t.after(() => client.terminate());
  const policy = createNavigationPolicy({ maxRoutePoints: 100, maxCalculations: 10, now: () => 0 });
  const destination = { poiId: '0123456789abcdef01234567', revisionId: '0123456789abcdef01234568', graphVersion: 'synthetic-r1-v1', entrance: p(100, 100) };
  policy.setDestination(destination);
  policy.observeFix({ timestamp: 1, position: p(0, 0), accuracyMeters: 10 });
  const token = policy.beginCalculation('req-1');
  const result = await client.calculate({ token, position: p(0, 0), accuracyMeters: 10, destination });
  assert.equal(policy.acceptRoute(result), true);
  assert.equal(policy.snapshot().status, 'navigating');
  assert.deepEqual(result.instructions.map(step => step.maneuver), ['depart', 'left', 'arrive']);
  await assert.rejects(client.calculate({ token: { ...token, requestId: 'req-2' }, position: p(0, 0), accuracyMeters: 10,
    destination: { ...destination, entrance: p(600) } }), error => error.code === 'SNAP_NOT_FOUND');
  await assert.rejects(client.calculate({ token: { ...token, requestId: 'req-3', graphVersion: 'other' }, position: p(0, 0), accuracyMeters: 10, destination }),
    error => error.code === 'GRAPH_INCOMPATIBLE');
  const late = client.calculate({ token: { ...token, requestId: 'req-4' }, position: p(0, 0), accuracyMeters: 10, destination });
  client.terminate();
  await assert.rejects(late, error => error.code === 'CALCULATION_FAILED');
  assert.equal(workers.length, 1); assert.equal(workers[0].terminated, true);
});
