// Dependency-free internal routing core. Not an OSM importer, binary format or Worker wire API.
const R = 6371008.8, RAD = Math.PI / 180, CELL = 0.001;
// Sub-micrometre tolerance for coordinate arithmetic, not a new GPS/snap product threshold.
export const GEOMETRY_EPSILON_METERS = 1e-7;
const states = new WeakMap();
export class RoutingFailure extends Error {
  constructor(code) { super(code); this.code = code; }
}
const fail = code => { throw new RoutingFailure(code); };
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 128;
export function validPoint(value) {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
}
function point(value) { if (!validPoint(value)) fail('INVALID_POSITION'); return value; }
export function distanceMeters(a, b) {
  point(a); point(b);
  const dLat = (b[1] - a[1]) * RAD, dLon = (b[0] - a[0]) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, h))), Math.sqrt(Math.max(0, 1 - h)));
}
export function project(position, a, b) {
  // Local projection for candidate geometry only; final offsets use great-circle distance.
  const scale = Math.cos(position[1] * RAD), x = lon => (lon - position[0]) * RAD * R * scale;
  const y = lat => (lat - position[1]) * RAD * R;
  const ax = x(a[0]), ay = y(a[1]), dx = x(b[0]) - ax, dy = y(b[1]) - ay, length2 = dx * dx + dy * dy;
  const fraction = length2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / length2));
  const snapped = [a[0] + fraction * (b[0] - a[0]), a[1] + fraction * (b[1] - a[1])];
  return { point: snapped, fraction, distanceMeters: distanceMeters(position, snapped) };
}
export function distanceToPolyline(position, geometry) {
  point(position);
  if (!Array.isArray(geometry) || !geometry.length || !geometry.every(validPoint)) fail('INVALID_GEOMETRY');
  if (geometry.length === 1) return distanceMeters(position, geometry[0]);
  let best = Infinity;
  for (let index = 1; index < geometry.length; index++) best = Math.min(best, project(position, geometry[index - 1], geometry[index]).distanceMeters);
  return best;
}
function state(graph) { const value = states.get(graph); if (!value) fail('INVALID_GRAPH'); return value; }

/** Caller declares memory/query budgets; exceeding them fails, never truncates coverage/results. */
export function createGraph(input, limits) {
  if (!limits || ['nodes', 'edges', 'indexEntries', 'snapCandidates', 'queryEdges', 'searchSettled'].some(key => !positiveInteger(limits[key]))
    || !input || !Array.isArray(input.nodes) || !input.nodes.length || !Array.isArray(input.edges)
    || input.nodes.length > limits.nodes || input.edges.length > limits.edges) fail('INVALID_GRAPH_BUDGET');
  const nodes = [], ids = new Map(), edges = [], edgeIds = new Set(), edgeById = new Map(), adjacency = [], grid = new Map();
  for (const value of input.nodes) {
    if (!value || !identifier(value.id) || ids.has(value.id) || !validPoint(value.point)
      || ![true, false, null, undefined].includes(value.passable)) fail('INVALID_GRAPH');
    ids.set(value.id, nodes.length);
    nodes.push(Object.freeze({ id: value.id, point: Object.freeze([...value.point]), passable: value.passable === true }));
    adjacency.push([]);
  }
  let indexEntries = 0;
  for (const value of input.edges) {
    if (!value || !identifier(value.id) || edgeIds.has(value.id) || !ids.has(value.from) || !ids.has(value.to)
      || !Number.isFinite(value.lengthMeters) || value.lengthMeters <= 0 || value.lengthMeters > Number.MAX_SAFE_INTEGER
      || ![true, false, null, undefined].includes(value.walkable)
      || ![true, false, null, undefined].includes(value.restrictionsResolved)
      || value.streetName !== undefined && value.streetName !== null && (typeof value.streetName !== 'string' || value.streetName.length > 1024)) fail('INVALID_GRAPH');
    edgeIds.add(value.id);
    const from = ids.get(value.from), to = ids.get(value.to), a = nodes[from], b = nodes[to];
    // Proves the straight-line A* heuristic is a lower bound for this distance-cost graph.
    if (value.lengthMeters < distanceMeters(a.point, b.point)) fail('INVALID_METRIC_EDGE');
    if (!a.passable || !b.passable || value.walkable !== true || value.restrictionsResolved !== true) continue;
    if (Math.abs(a.point[0] - b.point[0]) > 180) fail('UNSUPPORTED_SEGMENT');
    const edge = Object.freeze({ id: value.id, from, to, cost: value.lengthMeters, streetName: value.streetName || null });
    const index = edges.length; edges.push(edge); edgeById.set(edge.id, edge); adjacency[from].push(index);
    const x0 = Math.floor(Math.min(a.point[0], b.point[0]) / CELL), x1 = Math.floor(Math.max(a.point[0], b.point[0]) / CELL);
    const y0 = Math.floor(Math.min(a.point[1], b.point[1]) / CELL), y1 = Math.floor(Math.max(a.point[1], b.point[1]) / CELL);
    const entries = (x1 - x0 + 1) * (y1 - y0 + 1);
    if (!Number.isSafeInteger(entries) || entries + indexEntries > limits.indexEntries) fail('SPATIAL_INDEX_BUDGET_EXCEEDED');
    indexEntries += entries;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      const key = `${x}/${y}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(index);
    }
  }
  for (const list of adjacency) list.sort((a, b) => edges[a].id < edges[b].id ? -1 : edges[a].id > edges[b].id ? 1 : 0);
  const graph = Object.freeze({ nodeCount: nodes.length, declaredEdgeCount: input.edges.length, eligibleEdgeCount: edges.length, spatialIndexEntries: indexEntries });
  states.set(graph, { nodes, ids, edges, edgeById, adjacency, grid, limits: Object.freeze({ ...limits }) });
  return graph;
}

class Heap {
  values = [];
  less(a, b) { return a.priority < b.priority || a.priority === b.priority && a.node < b.node; }
  push(value) {
    const a = this.values; a.push(value);
    let index = a.length - 1;
    while (index) { const parent = (index - 1) >> 1; if (!this.less(a[index], a[parent])) break; [a[index], a[parent]] = [a[parent], a[index]]; index = parent; }
  }
  pop() {
    const a = this.values, first = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let index = 0;
      for (;;) {
        let child = index * 2 + 1;
        if (child >= a.length) break;
        if (child + 1 < a.length && this.less(a[child + 1], a[child])) child++;
        if (!this.less(a[child], a[index])) break;
        [a[child], a[index]] = [a[index], a[child]]; index = child;
      }
    }
    return first;
  }
}
function search(size, start, goal, neighbors, heuristic, budget, signal) {
  const dist = new Float64Array(size); dist.fill(Infinity); dist[start] = 0;
  const previous = new Array(size), closed = new Uint8Array(size), heap = new Heap();
  heap.push({ node: start, cost: 0, priority: heuristic(start) });
  let settled = 0;
  while (heap.values.length) {
    if (signal?.aborted) fail('CALCULATION_ABORTED');
    const current = heap.pop();
    if (closed[current.node] || current.cost !== dist[current.node]) continue;
    if (++settled > budget) fail('SEARCH_BUDGET_EXCEEDED');
    closed[current.node] = 1;
    if (current.node === goal) {
      const path = [];
      for (let node = goal; node !== start;) { const edge = previous[node]; path.push(edge); node = edge.from; }
      path.reverse(); return { status: 'found', cost: current.cost, path, settled };
    }
    for (const edge of neighbors(current.node)) {
      const next = current.cost + edge.cost;
      if (!Number.isFinite(next) || next > Number.MAX_SAFE_INTEGER) fail('COST_OVERFLOW');
      if (!closed[edge.to] && next < dist[edge.to]) {
        dist[edge.to] = next; previous[edge.to] = edge;
        heap.push({ node: edge.to, cost: next, priority: next + heuristic(edge.to) });
      }
    }
  }
  return { status: 'no_route', settled };
}

export function aStar(graph, fromId, toId, { signal } = {}) {
  const data = state(graph), from = data.ids.get(fromId), to = data.ids.get(toId);
  if (from === undefined || to === undefined) fail('INVALID_NODE');
  if (!data.nodes[from].passable || !data.nodes[to].passable) return { status: 'no_route', settled: 0 };
  const result = search(data.nodes.length, from, to, node => data.adjacency[node].map(index => data.edges[index]),
    node => distanceMeters(data.nodes[node].point, data.nodes[to].point), data.limits.searchSettled, signal);
  if (result.status !== 'found') return result;
  return { status: 'found', distanceMeters: result.cost, nodeIds: [fromId, ...result.path.map(edge => data.nodes[edge.to].id)],
    edgeIds: result.path.map(edge => edge.id), geometry: [data.nodes[from].point, ...result.path.map(edge => data.nodes[edge.to].point)].map(p => [...p]), settled: result.settled };
}

/** Candidate only. It is not permission to connect GPS/entrance to an edge. */
export function snapCandidates(graph, position, accuracyMeters = 0) {
  const data = state(graph); point(position);
  if (!Number.isFinite(accuracyMeters) || accuracyMeters < 0) fail('INVALID_POSITION');
  if (accuracyMeters > 50) fail('GPS_UNCERTAIN');
  if (Math.abs(position[1]) > 85) fail('UNSUPPORTED_SEGMENT');
  const lat = 50 / R / RAD, lon = lat / Math.cos(position[1] * RAD), candidates = [], indexes = new Set();
  const x0 = Math.floor((position[0] - lon) / CELL), x1 = Math.floor((position[0] + lon) / CELL);
  const y0 = Math.floor((position[1] - lat) / CELL), y1 = Math.floor((position[1] + lat) / CELL);
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (const index of data.grid.get(`${x}/${y}`) ?? []) indexes.add(index);
  for (const index of indexes) {
    const edge = data.edges[index], projected = project(position, data.nodes[edge.from].point, data.nodes[edge.to].point);
    if (projected.distanceMeters > 50 + GEOMETRY_EPSILON_METERS) continue;
    candidates.push({ edgeId: edge.id, ...projected });
    if (candidates.length > data.limits.snapCandidates) fail('SNAP_BUDGET_EXCEEDED');
  }
  candidates.sort((a, b) => a.distanceMeters - b.distanceMeters || (a.edgeId < b.edgeId ? -1 : a.edgeId > b.edgeId ? 1 : 0));
  return candidates;
}

/** Selects reachable directed snaps with explicitly verified connector costs; no straight-line fallback. */
export function routeSnapped(graph, { start, end, accuracyMeters, verifyConnector, signal } = {}) {
  const data = state(graph);
  if (typeof verifyConnector !== 'function') fail('CONNECTOR_VERIFICATION_REQUIRED');
  const candidates = (position, accuracy, kind) => snapCandidates(graph, position, accuracy).flatMap(candidate => {
    let proof;
    try { proof = verifyConnector({ kind, position: [...position], candidate: { ...candidate, point: [...candidate.point] } }); }
    catch { fail('CONNECTOR_VERIFICATION_FAILED'); }
    if (!proof || proof.verified !== true) return [];
    if (!Number.isFinite(proof.lengthMeters) || proof.lengthMeters < candidate.distanceMeters || proof.lengthMeters > Number.MAX_SAFE_INTEGER) fail('INVALID_CONNECTOR');
    return [{ ...candidate, connectorLengthMeters: proof.lengthMeters }];
  });
  const starts = candidates(start, accuracyMeters, 'start'), ends = candidates(end, 0, 'end');
  if (!starts.length || !ends.length) fail('SNAP_NOT_FOUND');
  const byId = data.edgeById;
  const source = data.nodes.length, target = source + 1, extras = new Map();
  let queryEdges = 0;
  const add = edge => {
    if (++queryEdges > data.limits.queryEdges) fail('QUERY_EDGE_BUDGET_EXCEEDED');
    if (!extras.has(edge.from)) extras.set(edge.from, []);
    extras.get(edge.from).push(edge);
  };
  for (const candidate of starts) {
    const edge = byId.get(candidate.edgeId);
    add({ from: source, to: edge.to, cost: candidate.connectorLengthMeters + (1 - candidate.fraction) * edge.cost, startSnap: candidate });
    if (candidate.fraction === 0) add({ from: source, to: edge.from, cost: candidate.connectorLengthMeters, startSnap: candidate });
  }
  for (const candidate of ends) {
    const edge = byId.get(candidate.edgeId);
    add({ from: edge.from, to: target, cost: candidate.connectorLengthMeters + candidate.fraction * edge.cost, endSnap: candidate });
    if (candidate.fraction === 1) add({ from: edge.to, to: target, cost: candidate.connectorLengthMeters, endSnap: candidate });
  }
  for (const a of starts) for (const b of ends) if (a.edgeId === b.edgeId && a.fraction <= b.fraction) {
    const edge = byId.get(a.edgeId);
    add({ from: source, to: target, cost: a.connectorLengthMeters + b.connectorLengthMeters + (b.fraction - a.fraction) * edge.cost, startSnap: a, endSnap: b });
  }
  // Zero heuristic is intentional: projection/connector costs need no unproven geometric bound.
  const result = search(target + 1, source, target,
    node => [...(data.adjacency[node] ?? []).map(index => data.edges[index]), ...(extras.get(node) ?? [])],
    () => 0, data.limits.searchSettled, signal);
  if (result.status !== 'found') return result;
  const startSnap = result.path[0].startSnap, endSnap = result.path.at(-1).endSnap, geometry = [], segmentNames = [];
  // segmentNames[k] names the edge arriving at geometry[k]; virtual snap edges inherit their real edge's name.
  const nameOf = edge => edge.startSnap ? byId.get(edge.startSnap.edgeId).streetName
    : edge.endSnap ? byId.get(edge.endSnap.edgeId).streetName : edge.streetName;
  const append = (p, name) => { const last = geometry.at(-1); if (!last || last[0] !== p[0] || last[1] !== p[1]) { geometry.push([...p]); segmentNames.push(name); } };
  append(startSnap.point, null);
  for (const edge of result.path) if (edge.to < source) append(data.nodes[edge.to].point, nameOf(edge));
  append(endSnap.point, nameOf(result.path.at(-1)));
  return { status: 'found', graphDistanceMeters: Math.max(0, result.cost - startSnap.connectorLengthMeters - endSnap.connectorLengthMeters),
    totalDistanceMeters: result.cost, startSnap, endSnap, geometry, segmentNames, settled: result.settled };
}
