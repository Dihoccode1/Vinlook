import { distanceMeters, validPoint } from './core.mjs';
import { buildFail } from './importer.mjs';
const FORMAT = 'vinlook-csr-review-v1', MAGIC = new TextEncoder().encode('VLRCSR01'), HEADER = 64;
const version = value => typeof value === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(value);
const id = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const hash = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', value));
export const sha256 = async value => [...await hash(value)].map(byte => byte.toString(16).padStart(2, '0')).join('');
function budgets(limits) {
  if (!limits || ['nodes', 'edges', 'bytes', 'metadataBytes'].some(key => !Number.isSafeInteger(limits[key]) || limits[key] < 1)
    || limits.bytes > 16 * 1024 * 1024 || limits.metadataBytes > 16 * 1024 * 1024) buildFail('INVALID_CSR_BUDGET');
}
function layout(n, e, limits) {
  if (!Number.isSafeInteger(n) || n < 1 || n > limits.nodes || !Number.isSafeInteger(e) || e < 0 || e > limits.edges) buildFail('CSR_COUNT_BUDGET_EXCEEDED');
  const coordinates = HEADER, flags = coordinates + n * 16, offsets = flags + n,
    targets = offsets + (n + 1) * 4, costs = targets + e * 4, names = costs + e * 8, total = names + e * 4;
  if (!Number.isSafeInteger(total) || total > limits.bytes || total > 0xffffffff) buildFail('CSR_BYTE_BUDGET_EXCEEDED');
  return { coordinates, flags, offsets, targets, costs, names, total };
}
function metric(edge, nodes) {
  const a = nodes.get(edge.from), b = nodes.get(edge.to);
  if (!id(edge.id) || !a || !b || a.passable !== true || b.passable !== true
    || edge.walkable !== true || edge.restrictionsResolved !== true || !Number.isFinite(edge.lengthMeters) || edge.lengthMeters <= 0
    || edge.lengthMeters < distanceMeters(a.point, b.point) || Math.abs(a.point[0] - b.point[0]) > 180
    || edge.streetName !== null && edge.streetName !== undefined && (typeof edge.streetName !== 'string' || edge.streetName.length > 1024)) buildFail('UNSAFE_CSR_EDGE');
}
export async function encodeCsr(graph, versions, limits) {
  budgets(limits);
  if (!version(versions?.graphVersion) || !version(versions?.profileVersion) || !Array.isArray(graph?.nodes) || !Array.isArray(graph?.edges)) buildFail('INVALID_CSR_INPUT');
  const positions = layout(graph.nodes.length, graph.edges.length, limits);
  const nodes = graph.nodes.map(node => {
    if (!node || !validPoint(node.point)) buildFail('INVALID_CSR_NODE');
    return { id: node.id, point: [...node.point], passable: node.passable };
  }).sort((a, b) => compare(a.id, b.id)), byId = new Map();
  for (const node of nodes) {
    if (!id(node.id) || byId.has(node.id) || !validPoint(node.point) || ![true, false].includes(node.passable)) buildFail('INVALID_CSR_NODE');
    byId.set(node.id, node);
  }
  const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const edges = graph.edges.map(edge => ({ ...edge })).sort((a, b) => nodeIndex.get(a.from) - nodeIndex.get(b.from) || compare(a.id, b.id));
  const edgeIds = new Set(); for (const edge of edges) { metric(edge, byId); if (edgeIds.has(edge.id)) buildFail('DUPLICATE_CSR_EDGE'); edgeIds.add(edge.id); }
  const names = [null, ...new Set(edges.map(edge => edge.streetName ?? null).filter(value => value !== null))].sort((a, b) => a === null ? -1 : b === null ? 1 : compare(a, b));
  const nameIndex = new Map(names.map((name, index) => [name, index]));
  const metadata = new TextEncoder().encode(JSON.stringify({ format: FORMAT, graphVersion: versions.graphVersion, profileVersion: versions.profileVersion,
    nodeIds: nodes.map(node => node.id), edgeIds: edges.map(edge => edge.id), names }));
  if (metadata.byteLength > limits.metadataBytes) buildFail('CSR_METADATA_BUDGET_EXCEEDED');
  const binary = new Uint8Array(positions.total), view = new DataView(binary.buffer); binary.set(MAGIC);
  for (const [offset, value] of [[8, 1], [12, nodes.length], [16, edges.length], [20, 0], [24, binary.length], [28, 0]]) view.setUint32(offset, value, true);
  binary.set(await hash(metadata), 32);
  for (let index = 0; index < nodes.length; index++) {
    view.setFloat64(positions.coordinates + index * 16, nodes[index].point[0], true);
    view.setFloat64(positions.coordinates + index * 16 + 8, nodes[index].point[1], true);
    view.setUint8(positions.flags + index, Number(nodes[index].passable));
  }
  let cursor = 0;
  for (let node = 0; node < nodes.length; node++) {
    view.setUint32(positions.offsets + node * 4, cursor, true);
    while (cursor < edges.length && edges[cursor].from === nodes[node].id) {
      const edge = edges[cursor]; view.setUint32(positions.targets + cursor * 4, nodeIndex.get(edge.to), true);
      view.setFloat64(positions.costs + cursor * 8, edge.lengthMeters, true);
      view.setUint32(positions.names + cursor * 4, nameIndex.get(edge.streetName ?? null), true); cursor++;
    }
  }
  view.setUint32(positions.offsets + nodes.length * 4, cursor, true);
  return { binary, metadata };
}
export async function decodeCsr(inputBinary, inputMetadata, expectedInput, requestedLimits) {
  const expected = { ...expectedInput }, limits = { ...requestedLimits };
  budgets(limits);
  if (!(inputBinary instanceof Uint8Array) || !(inputMetadata instanceof Uint8Array)
    || !(inputBinary.buffer instanceof ArrayBuffer) || !(inputMetadata.buffer instanceof ArrayBuffer)
    || inputBinary.byteLength < HEADER || inputBinary.byteLength > limits.bytes || inputMetadata.byteLength > limits.metadataBytes) buildFail('INVALID_CSR_BYTES');
  const binary = new Uint8Array(inputBinary), metadata = new Uint8Array(inputMetadata), view = new DataView(binary.buffer);
  if (!/^[a-f0-9]{64}$/.test(expected?.sha256 ?? '') || await sha256(binary) !== expected.sha256) buildFail('CSR_CHECKSUM_MISMATCH');
  if (MAGIC.some((byte, index) => binary[index] !== byte) || view.getUint32(8, true) !== 1 || view.getUint32(20, true) !== 0
    || view.getUint32(28, true) !== 0 || view.getUint32(24, true) !== binary.length) buildFail('CSR_HEADER_INVALID');
  const n = view.getUint32(12, true), e = view.getUint32(16, true), positions = layout(n, e, limits);
  if (positions.total !== binary.length || (await hash(metadata)).some((byte, index) => binary[32 + index] !== byte)) buildFail('CSR_BINDING_INVALID');
  let info; try { info = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(metadata)); } catch { buildFail('CSR_METADATA_INVALID'); }
  if (!info || Object.keys(info).length !== 6 || info.format !== FORMAT || !version(info.graphVersion) || !version(info.profileVersion)
    || info.graphVersion !== expected?.graphVersion || info.profileVersion !== expected?.profileVersion
    || !Array.isArray(info.nodeIds) || info.nodeIds.length !== n || !info.nodeIds.every(id) || new Set(info.nodeIds).size !== n
    || !Array.isArray(info.edgeIds) || info.edgeIds.length !== e || !info.edgeIds.every(id) || new Set(info.edgeIds).size !== e
    || !Array.isArray(info.names) || info.names.length < 1 || info.names.length > e + 1 || info.names[0] !== null
    || info.names.slice(1).some(name => typeof name !== 'string' || name.length > 1024) || new Set(info.names).size !== info.names.length) buildFail('CSR_METADATA_INVALID');
  const nodes = info.nodeIds.map((id, index) => ({ id, point: [view.getFloat64(positions.coordinates + index * 16, true), view.getFloat64(positions.coordinates + index * 16 + 8, true)], passable: view.getUint8(positions.flags + index) === 1 }));
  if (nodes.some((node, index) => !validPoint(node.point) || view.getUint8(positions.flags + index) > 1)) buildFail('CSR_NODE_INVALID');
  const offsets = Array.from({ length: n + 1 }, (_, index) => view.getUint32(positions.offsets + index * 4, true));
  if (offsets[0] !== 0 || offsets[n] !== e || offsets.some((value, index) => value > e || index && value < offsets[index - 1])) buildFail('CSR_OFFSETS_INVALID');
  const edges = [], byId = new Map(nodes.map(node => [node.id, node]));
  for (let from = 0; from < n; from++) for (let edge = offsets[from]; edge < offsets[from + 1]; edge++) {
    const to = view.getUint32(positions.targets + edge * 4, true), name = view.getUint32(positions.names + edge * 4, true);
    if (to >= n || name >= info.names.length) buildFail('CSR_TARGET_INVALID');
    const row = { id: info.edgeIds[edge], from: nodes[from].id, to: nodes[to].id, lengthMeters: view.getFloat64(positions.costs + edge * 8, true),
      streetName: info.names[name], walkable: true, restrictionsResolved: true }; metric(row, byId); edges.push(row);
  }
  return { graph: { nodes, edges }, graphVersion: info.graphVersion, profileVersion: info.profileVersion, format: FORMAT, releaseReady: false };
}

export async function buildSpatialIndex(graph, graphHash, { entries, cells } = {}) {
  if (!Number.isSafeInteger(entries) || entries < 1 || !Number.isSafeInteger(cells) || cells < 1 || !/^[a-f0-9]{64}$/.test(graphHash)) buildFail('INVALID_INDEX_BUDGET');
  const nodes = new Map(graph.nodes.map(node => [node.id, node])), grid = new Map(); let count = 0;
  for (let index = 0; index < graph.edges.length; index++) {
    const edge = graph.edges[index]; metric(edge, nodes); const a = nodes.get(edge.from).point, b = nodes.get(edge.to).point;
    const x0 = Math.floor(Math.min(a[0], b[0]) / .001), x1 = Math.floor(Math.max(a[0], b[0]) / .001), y0 = Math.floor(Math.min(a[1], b[1]) / .001), y1 = Math.floor(Math.max(a[1], b[1]) / .001);
    const added = (x1 - x0 + 1) * (y1 - y0 + 1); if (!Number.isSafeInteger(added) || added + count > entries) buildFail('INDEX_BUDGET_EXCEEDED'); count += added;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const key = `${x}/${y}`; if (!grid.has(key)) { if (grid.size >= cells) buildFail('INDEX_BUDGET_EXCEEDED'); grid.set(key, []); } grid.get(key).push(index);
    }
  }
  return { schemaVersion: 1, format: 'vinlook-grid-review-v1', graphSha256: graphHash, cellDegrees: .001,
    entries: count, cells: [...grid].sort(([a], [b]) => compare(a, b)), releaseReady: false };
}

export async function verifySpatialIndex(value, graph, graphHash, limits) {
  const expected = await buildSpatialIndex(graph, graphHash, limits);
  if (JSON.stringify(value) !== JSON.stringify(expected)) buildFail('SPATIAL_INDEX_MISMATCH');
  return true;
}
