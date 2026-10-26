// Synthetic topology near an arbitrary reference coordinate; not streets/OSM/POI evidence.
import { createGraph, distanceMeters } from '../src/core.mjs';
const RAD = Math.PI / 180, R = 6371008.8;
export const p = (x, y = 0) => [106.7 + x / (R * Math.cos(10.7 * RAD)) / RAD, 10.7 + y / R / RAD];
export const limits = Object.freeze({ nodes: 500, edges: 5000, indexEntries: 100000, snapCandidates: 128, queryEdges: 40000, searchSettled: 502 });
export const node = (id, x, y = 0, passable = true) => ({ id, point: p(x, y), passable });
export const edge = (id, from, to, lengthMeters, extra = {}) => ({ id, from, to, lengthMeters, walkable: true, restrictionsResolved: true, ...extra });
export const graph = (nodes, edges, overrides = {}) => createGraph({ nodes, edges }, { ...limits, ...overrides });
export const syntheticConnector = ({ candidate }) => ({ verified: true, lengthMeters: candidate.distanceMeters });

/** Independent O(V²) Dijkstra oracle: no production heap, heuristic or graph storage. */
export function referenceDijkstra(nodes, edges, start, goal) {
  const remaining = new Set(nodes.map(n => n.id)), distances = new Map(nodes.map(n => [n.id, Infinity]));
  distances.set(start, 0);
  for (;;) {
    let current = null;
    for (const id of remaining) if (current === null || distances.get(id) < distances.get(current)) current = id;
    if (current === null || distances.get(current) === Infinity) return Infinity;
    if (current === goal) return distances.get(goal);
    remaining.delete(current);
    for (const e of edges) if (e.from === current && remaining.has(e.to)) distances.set(e.to, Math.min(distances.get(e.to), distances.get(current) + e.lengthMeters));
  }
}
export function generatedGraph(seed, size = 12) {
  let state = seed;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 2 ** 32; };
  const nodes = Array.from({ length: size }, (_, i) => node(`node-${i}`, (i % 4) * 60, Math.floor(i / 4) * 60));
  const edges = [];
  for (const a of nodes) for (const b of nodes) if (a.id !== b.id && random() < 0.18) {
    edges.push(edge(`edge-${edges.length}`, a.id, b.id, distanceMeters(a.point, b.point) + 1 + random() * 100));
  }
  return { nodes, edges };
}
