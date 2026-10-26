import assert from 'node:assert/strict';
import { test } from 'node:test';
import { importOsm, osmId, PROFILE_VERSION } from '../src/importer.mjs';
import { encodeCsr, decodeCsr, sha256, buildSpatialIndex, verifySpatialIndex } from '../src/csr.mjs';
import { createGraph, aStar } from '../src/core.mjs';
import { importLimits, csrLimits, coreLimits, indexLimits, osmFixture } from './build-fixtures.mjs';
const versions = { graphVersion: 'synthetic-review-v1', profileVersion: PROFILE_VERSION };
async function roundtrip(graph) {
  const bytes = await encodeCsr(graph, versions, csrLimits), hash = await sha256(bytes.binary);
  return { ...bytes, hash, decoded: await decodeCsr(bytes.binary, bytes.metadata, { ...versions, sha256: hash }, csrLimits) };
}

test('OSM identity preserves bridge layers and disconnected islands; vehicle oneway does not invent pedestrian direction', async () => {
  const { graph, report } = importOsm(osmFixture(), importLimits), result = await roundtrip(graph), runtime = createGraph(result.decoded.graph, coreLimits);
  assert.equal(report.admittedDirectedEdges, 8); assert.equal(report.releaseReady, false);
  assert.equal(report.weakComponentCount, 3); assert.equal(report.largestWeakComponentNodes, 3); assert.equal(report.isolatedNodes, 0);
  assert.equal(aStar(runtime, 'n:3', 'n:1').status, 'found');
  assert.equal(aStar(runtime, 'n:2', 'n:4').status, 'no_route');
  assert.equal(aStar(runtime, 'n:1', 'n:6').status, 'no_route');
  assert.equal(aStar(runtime, 'n:6', 'n:7').status, 'found'); assert.equal(result.decoded.releaseReady, false);
});

test('specific foot overrides general access; denied/unknown/conditional routes and unresolved barrier cannot enter graph', () => {
  for (const change of [{ foot: 'no', access: 'yes' }, { foot: 'destination' }, { foot: undefined }, { foot: 'yes', 'foot:conditional': 'yes @ (Mo-Fr)' },
    { foot: 'yes', construction: 'yes' }, { foot: 'yes', opening_hours: 'Mo-Fr' }]) {
    const fixture = osmFixture(); fixture.ways[0].tags = Object.fromEntries(Object.entries({ highway: 'residential', ...change }).filter(([, value]) => value !== undefined));
    const result = importOsm(fixture, importLimits); assert.ok(!result.graph.edges.some(edge => edge.id.startsWith('w:10:')));
  }
  const explicit = osmFixture(); explicit.ways[0].tags.access = 'private';
  assert.ok(importOsm(explicit, importLimits).graph.edges.some(edge => edge.id.startsWith('w:10:')));
  const blocked = osmFixture(); blocked.nodes[1].tags = { barrier: 'gate' };
  assert.equal(aStar(createGraph(importOsm(blocked, importLimits).graph, coreLimits), 'n:1', 'n:3').status, 'no_route');
  blocked.nodes[1].tags.foot = 'yes'; assert.equal(aStar(createGraph(importOsm(blocked, importLimits).graph, coreLimits), 'n:1', 'n:3').status, 'found');
  blocked.nodes[1].tags.locked = 'yes'; assert.equal(aStar(createGraph(importOsm(blocked, importLimits).graph, coreLimits), 'n:1', 'n:3').status, 'no_route');
  blocked.nodes[1].tags.locked = 'unknown'; assert.equal(aStar(createGraph(importOsm(blocked, importLimits).graph, coreLimits), 'n:1', 'n:3').status, 'no_route');
});

test('oneway:foot and directional tags remain directed; ambiguous pedestrian oneway is excluded', () => {
  const fixture = osmFixture(); fixture.ways[0].tags['oneway:foot'] = 'yes';
  let graph = createGraph(importOsm(fixture, importLimits).graph, coreLimits);
  assert.equal(aStar(graph, 'n:1', 'n:3').status, 'found'); assert.equal(aStar(graph, 'n:3', 'n:1').status, 'no_route');
  fixture.ways[0].tags['oneway:foot'] = '-1'; graph = createGraph(importOsm(fixture, importLimits).graph, coreLimits);
  assert.equal(aStar(graph, 'n:1', 'n:3').status, 'no_route'); assert.equal(aStar(graph, 'n:3', 'n:1').status, 'found');
  const ambiguous = osmFixture(); ambiguous.ways[0].tags.highway = 'path';
  assert.equal(importOsm(ambiguous, importLimits).report.excluded.AMBIGUOUS_FOOT_DIRECTION, 1);
});

test('unresolved restrictions quarantine involved topology; missing members/refs or incomplete input abort the build', () => {
  const fixture = osmFixture(); fixture.relations = [{ id: '200', tags: { type: 'restriction', restriction: 'no_left_turn', except: 'foot' },
    members: [{ type: 'way', ref: '10', role: 'from' }, { type: 'way', ref: '11', role: 'to' }, { type: 'node', ref: '2', role: 'via' }] }];
  const result = importOsm(fixture, importLimits); assert.equal(result.report.quarantinedWays, 2); assert.equal(result.report.quarantinedNodes, 1);
  assert.ok(result.graph.edges.every(edge => edge.id.startsWith('w:12:')));
  fixture.relations[0].members[0].ref = '999'; assert.throws(() => importOsm(fixture, importLimits), { code: 'UNRESOLVED_RESTRICTION' });
  const missing = osmFixture(); missing.ways[0].nodes.push('999'); assert.throws(() => importOsm(missing, importLimits), { code: 'MISSING_OSM_NODE' });
  assert.throws(() => importOsm({ ...osmFixture(), complete: false }, importLimits));
});

test('import is deterministic, rejects duplicate/unsafe64-bit IDs and fails budgets without truncation', async () => {
  const fixture = osmFixture(), reversed = structuredClone(fixture); reversed.nodes.reverse(); reversed.ways.reverse();
  const a = importOsm(fixture, importLimits), b = importOsm(reversed, importLimits);
  assert.deepEqual(a, b); const encodedA = await roundtrip(a.graph), encodedB = await roundtrip(b.graph); assert.deepEqual(encodedA.binary, encodedB.binary); assert.deepEqual(encodedA.metadata, encodedB.metadata);
  assert.equal(osmId('18446744073709551615'), '18446744073709551615');
  for (const value of [9007199254740992, '18446744073709551616', '01', '-1']) assert.throws(() => osmId(value));
  fixture.nodes.push(fixture.nodes[0]); assert.throws(() => importOsm(fixture, importLimits), { code: 'INVALID_OSM_NODE' });
  assert.throws(() => importOsm(osmFixture(), { ...importLimits, edges: 7 }), { code: 'EDGE_BUDGET_EXCEEDED' });
  assert.throws(() => importOsm(osmFixture(), { ...importLimits, totalRefs: 2 }), { code: 'REFERENCE_BUDGET_EXCEEDED' });
});

test('decoded CSR preserves metric shortest paths against the original normalized graph', async () => {
  const imported = importOsm(osmFixture(), importLimits), result = await roundtrip(imported.graph);
  const before = createGraph(imported.graph, coreLimits), after = createGraph(result.decoded.graph, coreLimits);
  const dijkstra = (from, to) => {
    const costs = new Map(imported.graph.nodes.map(node => [node.id, Infinity])), remaining = new Set(costs.keys()); costs.set(from, 0);
    while (remaining.size) {
      let best = null; for (const node of remaining) if (best === null || costs.get(node) < costs.get(best)) best = node;
      if (!Number.isFinite(costs.get(best))) break; if (best === to) return costs.get(best); remaining.delete(best);
      for (const edge of imported.graph.edges) if (edge.from === best && remaining.has(edge.to)) costs.set(edge.to, Math.min(costs.get(edge.to), costs.get(best) + edge.lengthMeters));
    }
    return Infinity;
  };
  for (const from of imported.graph.nodes) for (const to of imported.graph.nodes) {
    const a = aStar(before, from.id, to.id), b = aStar(after, from.id, to.id);
    assert.equal(a.status, b.status); assert.equal(a.distanceMeters, b.distanceMeters);
    const expected = dijkstra(from.id, to.id); assert.equal(b.status, Number.isFinite(expected) ? 'found' : 'no_route');
    if (Number.isFinite(expected)) assert.equal(b.distanceMeters, expected);
  }
  const index = await buildSpatialIndex(result.decoded.graph, result.hash, indexLimits);
  assert.equal(index.graphSha256, result.hash); assert.equal(await verifySpatialIndex(index, result.decoded.graph, result.hash, indexLimits), true);
  index.cells[0][1][0] = 999; await assert.rejects(verifySpatialIndex(index, result.decoded.graph, result.hash, indexLimits), { code: 'SPATIAL_INDEX_MISMATCH' });
  await assert.rejects(buildSpatialIndex(result.decoded.graph, result.hash, { entries: 1, cells: 1 }), { code: 'INDEX_BUDGET_EXCEEDED' });
});

test('CSR rejects corruption, truncation, mixed metadata/version, malformed offsets/targets and invalid metrics', async () => {
  const result = await roundtrip(importOsm(osmFixture(), importLimits).graph);
  const corrupt = result.binary.slice(); corrupt[0] ^= 1;
  await assert.rejects(decodeCsr(corrupt, result.metadata, { ...versions, sha256: result.hash }, csrLimits), { code: 'CSR_CHECKSUM_MISMATCH' });
  for (const mutate of [bytes => { bytes[0] ^= 1; }, bytes => new DataView(bytes.buffer).setUint32(12, 0xffffffff, true),
    bytes => { const view = new DataView(bytes.buffer), n = view.getUint32(12, true); view.setUint32(64 + n * 17, 1, true); },
    bytes => { const view = new DataView(bytes.buffer), n = view.getUint32(12, true); view.setUint32(64 + n * 17 + (n + 1) * 4, n, true); },
    bytes => { const view = new DataView(bytes.buffer), n = view.getUint32(12, true), e = view.getUint32(16, true); view.setFloat64(64 + n * 17 + (n + 1) * 4 + e * 4, NaN, true); }]) {
    const bytes = result.binary.slice(); mutate(bytes);
    await assert.rejects(decodeCsr(bytes, result.metadata, { ...versions, sha256: await sha256(bytes) }, csrLimits));
  }
  await assert.rejects(decodeCsr(result.binary.slice(0, -1), result.metadata, { ...versions, sha256: result.hash }, csrLimits));
  await assert.rejects(decodeCsr(result.binary, new TextEncoder().encode('{}'), { ...versions, sha256: result.hash }, csrLimits));
  await assert.rejects(decodeCsr(result.binary, result.metadata, { ...versions, graphVersion: 'another', sha256: result.hash }, csrLimits));
  await assert.rejects(encodeCsr(importOsm(osmFixture(), importLimits).graph, versions, { ...csrLimits, bytes: 64 }));
});
