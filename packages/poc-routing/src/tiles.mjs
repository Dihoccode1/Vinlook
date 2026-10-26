import { validPoint } from './core.mjs';
import { buildFail } from './importer.mjs';
export const TILE_FORMAT = 'vinlook-tiled-r2-review-v1';
export const tileId = (point, degrees) =>
  `${Math.floor(point[0] / degrees)}_${Math.floor(point[1] / degrees)}`;
/** Partition every directed edge by its source node; keep explicit target coordinates across tiles. */
export function partitionGraph(graph, limits) {
  const integer = (value) => Number.isSafeInteger(value) && value > 0;
  if (
    !limits ||
    !Number.isFinite(limits.degrees) ||
    limits.degrees < 0.001 ||
    limits.degrees > 1 ||
    !['nodes', 'edges', 'tiles', 'tileNodes', 'tileEdges'].every((key) => integer(limits[key])) ||
    !Array.isArray(graph?.nodes) ||
    !Array.isArray(graph?.edges) ||
    graph.nodes.length > limits.nodes ||
    graph.edges.length > limits.edges
  )
    buildFail('INVALID_TILE_BUDGET');
  const positions = new Map(),
    parent = new Int32Array(graph.nodes.length),
    tiles = new Map();
  graph.nodes.forEach((node, index) => {
    if (
      typeof node.id !== 'string' ||
      !node.id ||
      positions.has(node.id) ||
      !validPoint(node.point)
    )
      buildFail('INVALID_TILE_NODE');
    positions.set(node.id, index);
    parent[index] = index;
  });
  const root = (index) => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const owner = (point) => {
    const id = tileId(point, limits.degrees);
    let tile = tiles.get(id);
    if (!tile) {
      if (tiles.size >= limits.tiles) buildFail('TILE_COUNT_BUDGET');
      tile = { id, nodes: [], edges: [], snapBounds: [Infinity, Infinity, -Infinity, -Infinity] };
      tiles.set(id, tile);
    }
    return tile;
  };
  for (const edge of graph.edges) {
    const a = positions.get(edge.from),
      b = positions.get(edge.to);
    if (
      a === undefined ||
      b === undefined ||
      typeof edge.id !== 'string' ||
      !edge.id ||
      !Number.isFinite(edge.lengthMeters) ||
      edge.lengthMeters <= 0 ||
      edge.walkable !== true ||
      edge.restrictionsResolved !== true ||
      graph.nodes[a].passable === false ||
      graph.nodes[b].passable === false
    )
      buildFail('INVALID_TILE_EDGE');
    parent[root(b)] = root(a);
  }
  // Canonical component label is the smallest node ID in the component, not union iteration order.
  const labels = new Map();
  graph.nodes.forEach((node, index) => {
    const r = root(index),
      old = labels.get(r);
    if (old === undefined || node.id < old) labels.set(r, node.id);
  });
  for (let index = 0; index < graph.nodes.length; index++) {
    const node = graph.nodes[index],
      tile = owner(node.point);
    if (tile.nodes.length >= limits.tileNodes) buildFail('TILE_NODE_BUDGET');
    tile.nodes.push([node.id, ...node.point, labels.get(root(index))]);
    for (const point of [node.point]) {
      tile.snapBounds[0] = Math.min(tile.snapBounds[0], point[0]);
      tile.snapBounds[1] = Math.min(tile.snapBounds[1], point[1]);
      tile.snapBounds[2] = Math.max(tile.snapBounds[2], point[0]);
      tile.snapBounds[3] = Math.max(tile.snapBounds[3], point[1]);
    }
  }
  const edgeIds = new Set();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) buildFail('DUPLICATE_TILE_EDGE');
    edgeIds.add(edge.id);
    const from = graph.nodes[positions.get(edge.from)].point,
      to = graph.nodes[positions.get(edge.to)].point,
      tile = owner(from);
    if (tile.edges.length >= limits.tileEdges) buildFail('TILE_EDGE_BUDGET');
    tile.edges.push([
      edge.id,
      edge.from,
      edge.to,
      ...to,
      edge.lengthMeters,
      edge.streetName ?? null,
    ]);
    tile.snapBounds[0] = Math.min(tile.snapBounds[0], to[0]);
    tile.snapBounds[1] = Math.min(tile.snapBounds[1], to[1]);
    tile.snapBounds[2] = Math.max(tile.snapBounds[2], to[0]);
    tile.snapBounds[3] = Math.max(tile.snapBounds[3], to[1]);
  }
  for (const tile of tiles.values()) {
    tile.nodes.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    tile.edges.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  }
  return {
    tiles: new Map([...tiles].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    report: {
      format: TILE_FORMAT,
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      tiles: tiles.size,
      weakComponents: labels.size,
      coverageVerified: false,
      releaseReady: false,
    },
  };
}
