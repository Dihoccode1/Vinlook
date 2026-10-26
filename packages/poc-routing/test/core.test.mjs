import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGraph, aStar, snapCandidates, routeSnapped, distanceMeters, distanceToPolyline } from '../src/core.mjs';
import { p, node, edge, graph, limits, syntheticConnector, generatedGraph, referenceDijkstra } from './core-fixtures.mjs';
const near = (a, b) => assert.ok(Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(b)), `${a} vs ${b}`);

test('A* matches independent Dijkstra on 5760 deterministic directed/disconnected queries', () => {
  let count = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const input = generatedGraph(seed), built = createGraph(input, limits), byId = new Map(input.edges.map(e => [e.id, e]));
    for (const start of input.nodes) for (const end of input.nodes) {
      const expected = referenceDijkstra(input.nodes, input.edges, start.id, end.id), actual = aStar(built, start.id, end.id);
      count++;
      if (!Number.isFinite(expected)) { assert.equal(actual.status, 'no_route'); assert.equal(actual.geometry, undefined); continue; }
      assert.equal(actual.status, 'found'); near(actual.distanceMeters, expected);
      assert.equal(actual.nodeIds[0], start.id); assert.equal(actual.nodeIds.at(-1), end.id);
      near(actual.edgeIds.reduce((sum, id, i) => {
        const e = byId.get(id); assert.equal(e.from, actual.nodeIds[i]); assert.equal(e.to, actual.nodeIds[i + 1]); return sum + e.lengthMeters;
      }, 0), actual.distanceMeters);
    }
  }
  assert.equal(count, 5760);
});

test('crossing bridge/tunnel geometries and coincident nodes never create implicit connections', () => {
  const built = graph([node('a', -100), node('b', 100), node('c', 0, -100), node('d', 0, 100), node('same-position-other-id', -100)],
    [edge('street', 'a', 'b', 250), edge('bridge', 'c', 'd', 250)]);
  assert.equal(aStar(built, 'a', 'd').status, 'no_route');
  assert.equal(aStar(built, 'a', 'same-position-other-id').status, 'no_route');
  assert.equal(aStar(built, 'a', 'b').status, 'found');
});

test('directions, denied/unknown walking permission, unresolved restrictions and node barriers are respected', () => {
  const nodes = [node('a', 0), node('b', 100), node('c', 200), node('barrier', 300, 0, false)];
  const built = graph(nodes, [edge('forward', 'a', 'b', 120), edge('unknown', 'b', 'c', 120, { walkable: undefined }),
    edge('restricted', 'a', 'c', 250, { restrictionsResolved: false }), edge('denied', 'b', 'c', 120, { walkable: false }),
    edge('blocked-node', 'c', 'barrier', 120)]);
  assert.equal(aStar(built, 'b', 'a').status, 'no_route');
  assert.equal(aStar(built, 'a', 'c').status, 'no_route');
  assert.equal(aStar(built, 'barrier', 'barrier').status, 'no_route');
  assert.equal(built.eligibleEdgeCount, 1);
});

test('parallel edges choose shortest; input/output mutations cannot alter the private graph', () => {
  const nodes = [node('a', 0), node('b', 100)], edges = [edge('slow', 'a', 'b', 200), edge('fast', 'a', 'b', 120)];
  const built = graph(nodes, edges);
  nodes[0].point[0] = 0; edges[1].lengthMeters = 500;
  const result = aStar(built, 'a', 'b'); assert.deepEqual(result.edgeIds, ['fast']); near(result.distanceMeters, 120);
  result.geometry[0][0] = 0;
  assert.notEqual(aStar(built, 'a', 'b').geometry[0][0], 0);
});

test('malformed graphs and sub-geodesic edge costs are rejected rather than silently repaired', () => {
  const nodes = [node('a', 0), node('b', 100)];
  for (const edges of [[edge('e', 'a', 'missing', 120)], [edge('e', 'a', 'b', -1)], [edge('e', 'a', 'b', Infinity)],
    [edge('e', 'a', 'b', 120), edge('e', 'a', 'b', 130)], [edge('e', 'a', 'b', 120, { walkable: 'yes' })]]) {
    assert.throws(() => graph(nodes, edges), { code: 'INVALID_GRAPH' });
  }
  assert.throws(() => graph(nodes, [edge('e', 'a', 'b', 1)]), { code: 'INVALID_METRIC_EDGE' });
  assert.throws(() => graph([...nodes, nodes[0]], []), { code: 'INVALID_GRAPH' });
});

test('node/edge/index/search/snap/query budgets fail explicitly; no truncated successful route', () => {
  const nodes = [node('a', 0), node('b', 100)], edges = [edge('e', 'a', 'b', 120), edge('back', 'b', 'a', 120)];
  assert.throws(() => graph(nodes, edges, { nodes: 1 }), { code: 'INVALID_GRAPH_BUDGET' });
  assert.throws(() => graph(nodes, edges, { edges: 1 }), { code: 'INVALID_GRAPH_BUDGET' });
  assert.throws(() => graph(nodes, edges, { indexEntries: 1 }), { code: 'SPATIAL_INDEX_BUDGET_EXCEEDED' });
  assert.throws(() => aStar(graph(nodes, edges, { searchSettled: 1 }), 'a', 'b'), { code: 'SEARCH_BUDGET_EXCEEDED' });
  assert.throws(() => snapCandidates(graph(nodes, edges, { snapCandidates: 1 }), p(20)), { code: 'SNAP_BUDGET_EXCEEDED' });
  assert.throws(() => routeSnapped(graph(nodes, edges, { queryEdges: 1 }), { start: p(20), end: p(80), accuracyMeters: 1, verifyConnector: syntheticConnector }), { code: 'QUERY_EDGE_BUDGET_EXCEEDED' });
});

test('spatial candidate search retains the 50m snap/accuracy bounds and validates geometry', () => {
  const built = graph([node('a', 0), node('b', 100)], [edge('e', 'a', 'b', 120)]);
  assert.equal(snapCandidates(built, p(50, 49.99), 50).length, 1);
  assert.equal(snapCandidates(built, p(50, 50), 50).length, 1);
  assert.deepEqual(snapCandidates(built, p(50, 50.01), 50), []);
  assert.throws(() => snapCandidates(built, p(50), 50.001), { code: 'GPS_UNCERTAIN' });
  for (const position of [[NaN, 0], [106, 91], [181, 0]]) assert.throws(() => snapCandidates(built, position), { code: 'INVALID_POSITION' });
  near(distanceToPolyline(p(50, 20), [p(0), p(100)]), 20);
  near(distanceMeters(p(0), p(0)), 0);
});

test('same directed edge permits forward fractional route but never backwards without a reverse edge', () => {
  const built = graph([node('a', 0), node('b', 100)], [edge('e', 'a', 'b', 120)]);
  const result = routeSnapped(built, { start: p(20), end: p(80), accuracyMeters: 20, verifyConnector: syntheticConnector });
  assert.equal(result.status, 'found'); near(result.graphDistanceMeters, 72);
  assert.equal(result.geometry.length, 2);
  assert.equal(routeSnapped(built, { start: p(80), end: p(20), accuracyMeters: 20, verifyConnector: syntheticConnector }).status, 'no_route');
});

test('snap selection considers target connectivity instead of blindly taking closest disconnected edge', () => {
  const built = graph([node('a', 0), node('b', 100), node('c', 0, 20), node('d', 100, 20), node('e', 300, 20)],
    [edge('closest-disconnected', 'a', 'b', 120), edge('reachable-start', 'c', 'd', 120), edge('reachable-end', 'd', 'e', 240)]);
  assert.equal(snapCandidates(built, p(5))[0].edgeId, 'closest-disconnected');
  const result = routeSnapped(built, { start: p(5), end: p(300, 20), accuracyMeters: 10, verifyConnector: syntheticConnector });
  assert.equal(result.status, 'found'); assert.equal(result.startSnap.edgeId, 'reachable-start');
  assert.ok(result.totalDistanceMeters > result.graphDistanceMeters);
});

test('snapping exactly at a shared endpoint permits other legal incident edges without reversing an edge', () => {
  const built = graph([node('a', -100), node('b', 0), node('c', 0, 100), node('d', 100)],
    [edge('ab', 'a', 'b', 120), edge('cb', 'c', 'b', 120), edge('bd', 'b', 'd', 120)]);
  const endAtB = routeSnapped(built, { start: p(0, 100), end: p(0), accuracyMeters: 10,
    verifyConnector: ({ kind, candidate }) => kind === 'start' && candidate.edgeId === 'cb' || kind === 'end' && candidate.edgeId === 'ab'
      ? { verified: true, lengthMeters: candidate.distanceMeters } : null });
  assert.equal(endAtB.status, 'found'); near(endAtB.graphDistanceMeters, 120);
  const startAtB = routeSnapped(built, { start: p(0), end: p(100), accuracyMeters: 10,
    verifyConnector: ({ kind, candidate }) => kind === 'start' && candidate.edgeId === 'ab' || kind === 'end' && candidate.edgeId === 'bd'
      ? { verified: true, lengthMeters: candidate.distanceMeters } : null });
  assert.equal(startAtB.status, 'found'); near(startAtB.graphDistanceMeters, 120);
  assert.equal(aStar(built, 'b', 'a').status, 'no_route');
});

test('unverified/invalid connectors or missing graph data never become a straight-line fallback', () => {
  const built = graph([node('a', 0), node('b', 100)], [edge('e', 'a', 'b', 120)]);
  const input = { start: p(20, 10), end: p(80, 10), accuracyMeters: 10 };
  assert.throws(() => routeSnapped(built, input), { code: 'CONNECTOR_VERIFICATION_REQUIRED' });
  assert.throws(() => routeSnapped(built, { ...input, verifyConnector: () => null }), { code: 'SNAP_NOT_FOUND' });
  assert.throws(() => routeSnapped(built, { ...input, verifyConnector: () => ({ verified: true, lengthMeters: 0 }) }), { code: 'INVALID_CONNECTOR' });
  assert.throws(() => routeSnapped(built, { ...input, verifyConnector: () => { throw new Error('private location'); } }), { code: 'CONNECTOR_VERIFICATION_FAILED' });
  assert.throws(() => aStar({}, 'a', 'b'), { code: 'INVALID_GRAPH' });
  const controller = new AbortController(); controller.abort();
  assert.throws(() => aStar(built, 'a', 'b', { signal: controller.signal }), { code: 'CALCULATION_ABORTED' });
});
