import { TILE_FORMAT, tileId } from './tiles.mjs';
import { validPoint, distanceMeters, RoutingFailure } from './core.mjs';
const fail = () => {
  throw new RoutingFailure('GRAPH_INCOMPATIBLE');
};
const digest = async (bytes) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
const positive = (x) => Number.isSafeInteger(x) && x > 0;
const id = (x) => typeof x === 'string' && x.length > 0 && x.length <= 200;
const hash = (x) => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x);
async function verifiedJson(url, expected, cap, fetcher, timeoutMilliseconds) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), timeoutMilliseconds);
  try {
    const response = await fetcher(url, {
      signal: controller.signal,
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok || !response.body) throw new RoutingFailure('GRAPH_UNAVAILABLE');
    const reader = response.body.getReader(),
      chunks = [];
    let count = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        count += value.byteLength;
        if (count > cap) {
          await reader.cancel();
          fail();
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    if (expected.bytes !== undefined && count !== expected.bytes) fail();
    const bytes = new Uint8Array(count);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    if ((await digest(bytes)) !== expected.sha256) fail();
    return {
      value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)),
      bytes: count,
    };
  } catch (error) {
    if (error instanceof RoutingFailure) throw error;
    throw new RoutingFailure('GRAPH_UNAVAILABLE');
  } finally {
    clearTimeout(timer);
  }
}
/** Candidate R2 reader only. Does not grant coverage/publication acceptance or calculate a route. */
export async function createTileStore({
  manifestUrl,
  manifestSha256,
  graphVersion,
  limits,
  fetcher = fetch,
} = {}) {
  let base;
  try {
    base = new URL(manifestUrl);
  } catch {
    fail();
  }
  if (
    base.protocol !== 'https:' ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    !hash(manifestSha256) ||
    !id(graphVersion) ||
    !limits ||
    ![
      'manifestBytes',
      'tileBytes',
      'cacheBytes',
      'tiles',
      'tileNodes',
      'tileEdges',
      'requests',
      'timeoutMilliseconds',
    ].every((k) => positive(limits[k])) ||
    limits.cacheBytes < limits.tileBytes ||
    limits.timeoutMilliseconds > 60000 ||
    typeof fetcher !== 'function'
  )
    fail();
  limits = Object.freeze({ ...limits });
  let requests = 0,
    closed = false,
    queue = Promise.resolve();
  const cache = new Map();
  let cacheBytes = 0;
  const get = async (url, expected, cap) => {
    if (closed) throw new RoutingFailure('GRAPH_UNAVAILABLE');
    if (++requests > limits.requests) throw new RoutingFailure('CALCULATION_FAILED');
    return verifiedJson(url, expected, cap, fetcher, limits.timeoutMilliseconds);
  };
  const { value: manifest } = await get(
    base.href,
    { sha256: manifestSha256 },
    limits.manifestBytes,
  );
  if (
    manifest?.format !== TILE_FORMAT ||
    manifest.graphVersion !== graphVersion ||
    manifest.profileVersion !== 'vn-foot-v1' ||
    manifest.topology !== 'outgoing-owned-by-source-node' ||
    !Number.isFinite(manifest.degrees) ||
    manifest.degrees < 0.001 ||
    manifest.degrees > 1 ||
    !Array.isArray(manifest.tiles) ||
    !manifest.tiles.length ||
    manifest.tiles.length > limits.tiles
  )
    fail();
  const entries = new Map();
  for (const entry of manifest.tiles) {
    if (
      !entry ||
      !/^[-]?\d+_[-]?\d+$/.test(entry.id) ||
      entries.has(entry.id) ||
      entry.url !== `tiles/${entry.id}.json` ||
      !positive(entry.bytes) ||
      entry.bytes > limits.tileBytes ||
      !hash(entry.sha256) ||
      !positive(entry.nodes) ||
      entry.nodes > limits.tileNodes ||
      !Number.isSafeInteger(entry.edges) ||
      entry.edges < 0 ||
      entry.edges > limits.tileEdges ||
      !Array.isArray(entry.snapBounds) ||
      entry.snapBounds.length !== 4 ||
      !validPoint(entry.snapBounds.slice(0, 2)) ||
      !validPoint(entry.snapBounds.slice(2)) ||
      entry.snapBounds[0] > entry.snapBounds[2] ||
      entry.snapBounds[1] > entry.snapBounds[3]
    )
      fail();
    entries.set(
      entry.id,
      Object.freeze({ ...entry, snapBounds: Object.freeze([...entry.snapBounds]) }),
    );
  }
  const load = async (key) => {
    if (closed) throw new RoutingFailure('GRAPH_UNAVAILABLE');
    if (cache.has(key)) {
      const item = cache.get(key);
      cache.delete(key);
      cache.set(key, item);
      return item.tile;
    }
    const entry = entries.get(key);
    if (!entry) fail();
    const { value: tile } = await get(new URL(entry.url, base).href, entry, limits.tileBytes);
    if (closed) throw new RoutingFailure('GRAPH_UNAVAILABLE');
    if (
      tile?.format !== TILE_FORMAT ||
      tile.graphVersion !== graphVersion ||
      tile.profileVersion !== manifest.profileVersion ||
      tile.id !== key ||
      !Array.isArray(tile.nodes) ||
      tile.nodes.length !== entry.nodes ||
      !Array.isArray(tile.edges) ||
      tile.edges.length !== entry.edges
    )
      fail();
    const nodes = new Map(),
      edges = new Set(),
      within = (p) =>
        p[0] >= entry.snapBounds[0] &&
        p[0] <= entry.snapBounds[2] &&
        p[1] >= entry.snapBounds[1] &&
        p[1] <= entry.snapBounds[3];
    for (const row of tile.nodes) {
      if (
        !Array.isArray(row) ||
        row.length !== 4 ||
        !id(row[0]) ||
        nodes.has(row[0]) ||
        !validPoint(row.slice(1, 3)) ||
        !id(row[3]) ||
        tileId(row.slice(1, 3), manifest.degrees) !== key ||
        !within(row.slice(1, 3))
      )
        fail();
      nodes.set(row[0], row);
      Object.freeze(row);
    }
    for (const row of tile.edges) {
      if (
        !Array.isArray(row) ||
        row.length !== 7 ||
        !id(row[0]) ||
        edges.has(row[0]) ||
        !nodes.has(row[1]) ||
        !id(row[2]) ||
        !validPoint(row.slice(3, 5)) ||
        !within(row.slice(3, 5)) ||
        !Number.isFinite(row[5]) ||
        row[5] <= 0 ||
        row[5] > Number.MAX_SAFE_INTEGER ||
        !(row[6] === null || (typeof row[6] === 'string' && row[6].length <= 512))
      )
        fail();
      const target = nodes.get(row[2]),
        from = nodes.get(row[1]);
      const targetTile = tileId(row.slice(3, 5), manifest.degrees);
      if (
        (target && (target[1] !== row[3] || target[2] !== row[4])) ||
        (targetTile === key && !target) ||
        !entries.has(targetTile) ||
        row[5] < distanceMeters(from.slice(1, 3), row.slice(3, 5))
      )
        fail();
      edges.add(row[0]);
      Object.freeze(row);
    }
    Object.freeze(tile.nodes);
    Object.freeze(tile.edges);
    Object.freeze(tile);
    while (cacheBytes + entry.bytes > limits.cacheBytes) {
      const oldest = cache.keys().next().value;
      cacheBytes -= cache.get(oldest).bytes;
      cache.delete(oldest);
    }
    cache.set(key, { tile, bytes: entry.bytes });
    cacheBytes += entry.bytes;
    return tile;
  };
  return Object.freeze({
    graphVersion,
    profileVersion: manifest.profileVersion,
    degrees: manifest.degrees,
    entries: Object.freeze([...entries.values()]),
    load(key) {
      const task = queue.then(() => load(key));
      queue = task.catch(() => {});
      return task;
    },
    stats: () => ({ requests, cachedTiles: cache.size, cachedEncodedBytes: cacheBytes, closed }),
    close() {
      closed = true;
      cache.clear();
      cacheBytes = 0;
    },
  });
}
