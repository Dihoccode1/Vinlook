import { distanceMeters, validPoint } from './core.mjs';
export const PROFILE_VERSION = 'explicit-foot-review-v1';
export const COUNTRY_PROFILE_VERSION = 'vn-foot-v1';
const allow = new Set(['yes', 'designated', 'permissive']);
export const highways = new Set([
  'footway',
  'pedestrian',
  'path',
  'steps',
  'residential',
  'living_street',
  'service',
  'unclassified',
  'tertiary',
  'secondary',
  'primary',
  'cycleway',
  'track',
  'tertiary_link',
  'secondary_link',
  'primary_link',
]);
const barriers = new Set([
  'bollard',
  'block',
  'cycle_barrier',
  'kissing_gate',
  'gate',
  'lift_gate',
  'stile',
]);
export class BuildFailure extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
export const buildFail = (code) => {
  throw new BuildFailure(code);
};
const positive = (value) => Number.isSafeInteger(value) && value > 0;
export function osmId(value) {
  if (typeof value === 'number') {
    if (!positive(value)) buildFail('INVALID_OSM_ID');
    value = String(value);
  }
  if (
    typeof value !== 'string' ||
    !/^[1-9][0-9]{0,19}$/.test(value) ||
    BigInt(value) > 18446744073709551615n
  )
    buildFail('INVALID_OSM_ID');
  return value;
}
function tags(value, limit) {
  if (value === undefined) return Object.create(null);
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
    Object.keys(value).length > limit ||
    Object.entries(value).some(
      ([key, text]) => !key || key.length > 128 || typeof text !== 'string' || text.length > 1024,
    )
  )
    buildFail('INVALID_OSM_TAGS');
  return Object.fromEntries(Object.entries(value));
}
const uncertain = (value) =>
  Object.keys(value).some(
    (key) =>
      key.includes('conditional') ||
      key === 'opening_hours' ||
      /^(construction|proposed|abandoned|disused):/.test(key) ||
      (['construction', 'proposed', 'abandoned', 'disused'].includes(key) && value[key] !== 'no'),
  );
function nodePassable(value) {
  if (
    uncertain(value) ||
    (value.locked !== undefined && value.locked !== 'no') ||
    (value.ford && value.ford !== 'no')
  )
    return false;
  const permission = value.foot ?? value.access;
  if (permission !== undefined && !allow.has(permission)) return false;
  if (value.barrier && value.barrier !== 'no')
    return barriers.has(value.barrier) && allow.has(value.foot);
  return true; // Way permission is checked separately; absent barriers are not field verification.
}
function directions(value, profileVersion) {
  if (!highways.has(value.highway)) return { reason: 'UNSUPPORTED_HIGHWAY' };
  if (
    uncertain(value) ||
    value.area === 'yes' ||
    value.route === 'ferry' ||
    (value.ford && value.ford !== 'no') ||
    (value.conveying && value.conveying !== 'no')
  )
    return { reason: 'UNRESOLVED_CONDITION' };
  const permission = value.foot ?? value.access;
  if (
    !allow.has(permission) &&
    !(permission === undefined && profileVersion === COUNTRY_PROFILE_VERSION)
  )
    return { reason: 'FOOT_PERMISSION_NOT_EXPLICIT' };
  let forward = true,
    backward = true;
  if (value['oneway:foot'] !== undefined) {
    if (!['yes', 'no', '-1'].includes(value['oneway:foot']))
      return { reason: 'UNRESOLVED_DIRECTION' };
    forward = value['oneway:foot'] !== '-1';
    backward = value['oneway:foot'] !== 'yes';
  } else if (
    ['footway', 'pedestrian', 'path', 'steps'].includes(value.highway) &&
    value.oneway &&
    value.oneway !== 'no'
  )
    return { reason: 'AMBIGUOUS_FOOT_DIRECTION' };
  for (const direction of ['forward', 'backward']) {
    const permission = value[`foot:${direction}`];
    if (permission !== undefined && permission !== 'no' && !allow.has(permission))
      return { reason: 'UNRESOLVED_DIRECTION' };
    if (permission === 'no') {
      if (direction === 'forward') forward = false;
      else backward = false;
    }
  }
  return forward || backward ? { forward, backward } : { reason: 'NO_ALLOWED_DIRECTION' };
}

/** Complete normalized OSM JSON extract, not PBF/Overpass decoding or country-default access. */
export function importOsm(document, limits, { profileVersion = PROFILE_VERSION } = {}) {
  if (![PROFILE_VERSION, COUNTRY_PROFILE_VERSION].includes(profileVersion))
    buildFail('INVALID_FOOT_PROFILE');
  const fields = [
    'nodes',
    'ways',
    'relations',
    'edges',
    'tags',
    'wayRefs',
    'relationMembers',
    'totalRefs',
  ];
  if (
    !limits ||
    fields.some((key) => !positive(limits[key])) ||
    !document ||
    document.complete !== true ||
    !Array.isArray(document.nodes) ||
    !Array.isArray(document.ways) ||
    !Array.isArray(document.relations) ||
    !document.nodes.length ||
    document.nodes.length > limits.nodes ||
    document.ways.length > limits.ways ||
    document.relations.length > limits.relations
  )
    buildFail('INVALID_IMPORT_BUDGET_OR_COMPLETENESS');
  const nodes = new Map(),
    ways = new Map(),
    relations = new Map();
  let totalRefs = 0;
  for (const node of document.nodes) {
    const id = osmId(node.id),
      point = [node.lon, node.lat];
    if (nodes.has(id) || !validPoint(point)) buildFail('INVALID_OSM_NODE');
    nodes.set(id, { id: `n:${id}`, point, passable: nodePassable(tags(node.tags, limits.tags)) });
  }
  for (const way of document.ways) {
    const id = osmId(way.id);
    if (
      ways.has(id) ||
      !Array.isArray(way.nodes) ||
      way.nodes.length < 2 ||
      way.nodes.length > limits.wayRefs
    )
      buildFail('INVALID_OSM_WAY');
    totalRefs += way.nodes.length;
    if (!Number.isSafeInteger(totalRefs) || totalRefs > limits.totalRefs)
      buildFail('REFERENCE_BUDGET_EXCEEDED');
    const refs = way.nodes.map(osmId);
    if (refs.some((ref) => !nodes.has(ref))) buildFail('MISSING_OSM_NODE');
    ways.set(id, { refs, tags: tags(way.tags, limits.tags) });
  }
  const blockedWays = new Set(),
    blockedNodes = new Set();
  for (const relation of document.relations) {
    const id = osmId(relation.id),
      value = tags(relation.tags, limits.tags);
    if (
      relations.has(id) ||
      !Array.isArray(relation.members) ||
      relation.members.length > limits.relationMembers
    )
      buildFail('INVALID_OSM_RELATION');
    relations.set(id, true);
    totalRefs += relation.members.length;
    if (!Number.isSafeInteger(totalRefs) || totalRefs > limits.totalRefs)
      buildFail('REFERENCE_BUDGET_EXCEEDED');
    if (
      value.type !== 'restriction' &&
      !uncertain(value) &&
      !Object.keys(value).some((key) => key.startsWith('restriction'))
    )
      continue;
    if (!relation.members.length) buildFail('UNRESOLVED_RESTRICTION');
    // No turn-state expansion yet: quarantine all member ways/nodes, even vehicle-only exceptions.
    for (const member of relation.members) {
      const ref = osmId(member.ref);
      if (member.type === 'way' && ways.has(ref)) blockedWays.add(ref);
      else if (member.type === 'node' && nodes.has(ref)) blockedNodes.add(ref);
      else buildFail('UNRESOLVED_RESTRICTION');
    }
  }
  for (const id of blockedNodes) nodes.get(id).passable = false;
  const edges = [],
    excluded = Object.create(null);
  let zeroSegments = 0;
  const reject = (reason) => {
    excluded[reason] = (excluded[reason] ?? 0) + 1;
  };
  for (const [id, way] of [...ways].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (blockedWays.has(id)) {
      reject('RESTRICTION_QUARANTINE');
      continue;
    }
    const policy = directions(way.tags, profileVersion);
    if (policy.reason) {
      reject(policy.reason);
      continue;
    }
    for (let index = 1; index < way.refs.length; index++) {
      const a = nodes.get(way.refs[index - 1]),
        b = nodes.get(way.refs[index]);
      if (!a.passable || !b.passable) {
        reject('BLOCKED_NODE_SEGMENT');
        continue;
      }
      const lengthMeters = distanceMeters(a.point, b.point);
      if (!lengthMeters) {
        zeroSegments++;
        continue;
      }
      const add = (from, to, suffix) => {
        if (edges.length >= limits.edges) buildFail('EDGE_BUDGET_EXCEEDED');
        edges.push({
          id: `w:${id}:${index - 1}:${suffix}`,
          from: from.id,
          to: to.id,
          lengthMeters,
          walkable: true,
          restrictionsResolved: true,
          streetName: way.tags.name ?? null,
        });
      };
      if (policy.forward) add(a, b, 'f');
      if (policy.backward) add(b, a, 'b');
    }
  }
  const sortedNodes = [...nodes.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const positions = new Map(sortedNodes.map((node, index) => [node.id, index]));
  const parents = sortedNodes.map((_, index) => index),
    linked = new Set();
  const root = (index) => {
    while (parents[index] !== index) {
      parents[index] = parents[parents[index]];
      index = parents[index];
    }
    return index;
  };
  for (const edge of edges) {
    const a = positions.get(edge.from),
      b = positions.get(edge.to);
    parents[root(a)] = root(b);
    linked.add(a);
    linked.add(b);
  }
  const sizes = new Map();
  for (let index = 0; index < parents.length; index++) {
    const id = root(index);
    sizes.set(id, (sizes.get(id) ?? 0) + 1);
  }
  let largestWeakComponentNodes = 0;
  for (const size of sizes.values())
    largestWeakComponentNodes = Math.max(largestWeakComponentNodes, size);
  return {
    graph: { nodes: sortedNodes, edges },
    report: {
      profileVersion,
      inputNodes: nodes.size,
      inputWays: ways.size,
      inputRelations: relations.size,
      admittedDirectedEdges: edges.length,
      quarantinedWays: blockedWays.size,
      quarantinedNodes: blockedNodes.size,
      zeroSegments,
      weakComponentCount: sizes.size,
      largestWeakComponentNodes,
      isolatedNodes: nodes.size - linked.size,
      excluded: Object.fromEntries(Object.entries(excluded).sort()),
      coverageVerified: false,
      releaseReady: false,
    },
  };
}
