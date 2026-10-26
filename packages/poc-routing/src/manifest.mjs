import { sha256 } from './csr.mjs';
import { validPoint } from './core.mjs';
import { buildFail } from './importer.mjs';
const kinds = [
  'shell',
  'style',
  'glyphs',
  'sprite',
  'pmtiles',
  'boundary',
  'graph',
  'spatial-index',
  'poi',
  'thumbnail',
  'audio',
];
const version = (value) => typeof value === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(value);
const id = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
const integer = (value) => Number.isSafeInteger(value) && value > 0;
const exact = (value, keys) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key));
const iso = (value) =>
  typeof value === 'string' &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString() === value;
const invalid = () => buildFail('MANIFEST_INVALID');
async function readFile(loader, id) {
  try {
    return await loader(id);
  } catch {
    buildFail('PACKAGE_FILE_UNAVAILABLE');
  }
}
function https(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
function checkLimits(limits) {
  if (
    !limits ||
    ['files', 'fileBytes', 'totalBytes'].some((key) => !integer(limits[key])) ||
    limits.files > 10000 ||
    limits.fileBytes > 16 * 1024 * 1024
  )
    buildFail('INVALID_MANIFEST_BUDGET');
}
function url(value, packageVersion) {
  return (
    typeof value === 'string' &&
    value.startsWith(`/offline/${packageVersion}/`) &&
    /^\/offline\/[A-Za-z0-9._-]+\/[A-Za-z0-9_./-]+$/.test(value) &&
    value
      .slice(1)
      .split('/')
      .every((part) => part && part !== '.' && part !== '..')
  );
}
function metadata(m, published, appBuild, limits) {
  checkLimits(limits);
  if (
    !exact(m, [
      'schemaVersion',
      'packageVersion',
      'createdAt',
      'language',
      'appCompatibility',
      'coverageVersion',
      'boundaryFileId',
      'graph',
      'provenance',
      'files',
      'pois',
    ]) ||
    m.schemaVersion !== 1 ||
    m.language !== 'en' ||
    !version(m.packageVersion) ||
    !iso(m.createdAt) ||
    !version(m.coverageVersion) ||
    !exact(m.appCompatibility, ['minBuild', 'maxBuild']) ||
    !integer(appBuild) ||
    !integer(m.appCompatibility.minBuild) ||
    !integer(m.appCompatibility.maxBuild) ||
    appBuild < m.appCompatibility.minBuild ||
    appBuild > m.appCompatibility.maxBuild
  )
    buildFail('PACKAGE_INCOMPATIBLE');
  if (
    !exact(m.provenance, ['kind', 'sourceSnapshot', 'license', 'attribution']) ||
    m.provenance.kind !== 'osm' ||
    !https(m.provenance.sourceSnapshot) ||
    m.provenance.license !== 'ODbL-1.0' ||
    typeof m.provenance.attribution !== 'string' ||
    !m.provenance.attribution.trim() ||
    m.provenance.attribution.length > 4096
  )
    invalid();
  if (!Array.isArray(m.files) || !m.files.length || m.files.length > limits.files) invalid();
  const files = new Map(),
    urls = new Set();
  let totalBytes = 0;
  for (const file of m.files) {
    if (
      !exact(file, ['id', 'kind', 'url', 'byteLength', 'sha256']) ||
      !version(file.id) ||
      files.has(file.id) ||
      !kinds.includes(file.kind) ||
      !url(file.url, m.packageVersion) ||
      urls.has(file.url) ||
      !integer(file.byteLength) ||
      file.byteLength > limits.fileBytes ||
      typeof file.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(file.sha256)
    )
      invalid();
    totalBytes += file.byteLength;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > limits.totalBytes)
      buildFail('PACKAGE_BYTE_BUDGET_EXCEEDED');
    files.set(file.id, file);
    urls.add(file.url);
  }
  for (const kind of kinds)
    if (!m.files.some((file) => file.kind === kind)) buildFail('PACKAGE_COMPONENT_MISSING');
  const ref = (key, kind) => {
    if (files.get(key)?.kind !== kind) buildFail('PACKAGE_REFERENCE_INVALID');
  };
  ref(m.boundaryFileId, 'boundary');
  const g = m.graph;
  if (
    !exact(g, [
      'graphVersion',
      'schemaVersion',
      'format',
      'profileVersion',
      'chunkFileIds',
      'spatialIndexFileId',
    ]) ||
    !version(g.graphVersion) ||
    !version(g.profileVersion) ||
    g.schemaVersion !== 1 ||
    g.format !== 'vinlook-csr-v1' ||
    !Array.isArray(g.chunkFileIds) ||
    !g.chunkFileIds.length ||
    new Set(g.chunkFileIds).size !== g.chunkFileIds.length
  )
    buildFail('GRAPH_INCOMPATIBLE');
  for (const key of g.chunkFileIds) ref(key, 'graph');
  ref(g.spatialIndexFileId, 'spatial-index');
  if (
    !Array.isArray(m.pois) ||
    m.pois.length !== 15 ||
    !Array.isArray(published) ||
    published.length !== 15
  )
    buildFail('PUBLICATION_SNAPSHOT_REQUIRED');
  const snapshot = new Map();
  for (const poi of published) {
    if (
      !exact(poi, [
        'id',
        'revisionId',
        'nameEN',
        'location',
        'entrance',
        'thumbnail',
        'languageCode',
        'text',
        'audio',
      ]) ||
      !id(poi.id) ||
      snapshot.has(poi.id) ||
      !id(poi.revisionId) ||
      poi.languageCode !== 'en' ||
      typeof poi.nameEN !== 'string' ||
      !poi.nameEN.trim() ||
      poi.nameEN.length > 200 ||
      !exact(poi.location, ['type', 'coordinates']) ||
      poi.location.type !== 'Point' ||
      !validPoint(poi.location.coordinates) ||
      !exact(poi.entrance, ['type', 'coordinates']) ||
      poi.entrance.type !== 'Point' ||
      !validPoint(poi.entrance.coordinates) ||
      typeof poi.text !== 'string' ||
      !poi.text.trim() ||
      poi.text.length > 20000 ||
      typeof poi.audio?.url !== 'string' ||
      !exact(poi.audio, ['url', 'durationSeconds']) ||
      !https(poi.audio.url) ||
      !exact(poi.thumbnail, ['url']) ||
      !https(poi.thumbnail.url) ||
      !Number.isFinite(poi.audio.durationSeconds) ||
      poi.audio.durationSeconds < 90 ||
      poi.audio.durationSeconds > 150
    )
      buildFail('PUBLICATION_SNAPSHOT_REQUIRED');
    snapshot.set(poi.id, poi);
  }
  const seen = new Set(),
    audio = new Set();
  for (const poi of m.pois) {
    if (
      !exact(poi, [
        'id',
        'revisionId',
        'entrance',
        'englishText',
        'thumbnailFileId',
        'audioFileId',
      ]) ||
      !id(poi.id) ||
      seen.has(poi.id) ||
      !id(poi.revisionId) ||
      !validPoint(poi.entrance)
    )
      invalid();
    const current = snapshot.get(poi.id);
    if (
      !current ||
      current.revisionId !== poi.revisionId ||
      current.text !== poi.englishText ||
      current.entrance.coordinates.some((value, index) => value !== poi.entrance[index])
    )
      buildFail('PUBLICATION_BINDING_MISMATCH');
    ref(poi.thumbnailFileId, 'thumbnail');
    ref(poi.audioFileId, 'audio');
    const hash = files.get(poi.audioFileId).sha256;
    if (audio.has(hash)) buildFail('DUPLICATE_AUDIO_BINDING');
    seen.add(poi.id);
    audio.add(hash);
  }
  return { totalBytes, files };
}

/** Structural/reference/byte integrity only: never certifies rights, coverage, media codecs or shell closure. */
export async function verifyManifest(manifest, { publishedPois, appBuild, loadFile, limits } = {}) {
  // Own the JSON snapshot before awaiting file I/O; it must contain no credentials/staff/draft data.
  let m, published;
  try {
    m = structuredClone(manifest);
    published = structuredClone(publishedPois);
  } catch {
    invalid();
  }
  const checked = metadata(m, published, appBuild, limits);
  if (typeof loadFile !== 'function') invalid();
  for (const file of checked.files.values()) {
    const value = await readFile(loadFile, file.id);
    if (
      !(value instanceof Uint8Array) ||
      !(value.buffer instanceof ArrayBuffer) ||
      value.byteLength !== file.byteLength
    )
      buildFail('PACKAGE_CHECKSUM_MISMATCH');
    if ((await sha256(new Uint8Array(value))) !== file.sha256)
      buildFail('PACKAGE_CHECKSUM_MISMATCH');
  }
  return {
    status: 'verified_manifest_bytes',
    packageVersion: m.packageVersion,
    fileCount: m.files.length,
    totalBytes: checked.totalBytes,
    publicSnapshotSha256: await sha256(new TextEncoder().encode(JSON.stringify(published))),
    coverageVerified: false,
    graphFormatVerified: false,
    shellClosureVerified: false,
    mediaCodecsVerified: false,
    rightsVerified: false,
    releaseReady: false,
  };
}
export async function buildManifest(base, entries, options) {
  let capturedBase, capturedEntries, captured;
  try {
    capturedBase = structuredClone(base);
    capturedEntries = structuredClone(entries);
    captured = {
      ...options,
      publishedPois: structuredClone(options.publishedPois),
      limits: { ...options.limits },
    };
  } catch {
    invalid();
  }
  checkLimits(captured.limits);
  if (
    !Array.isArray(capturedEntries) ||
    capturedEntries.length > captured.limits.files ||
    typeof captured.loadFile !== 'function' ||
    Object.hasOwn(capturedBase, 'files')
  )
    invalid();
  const files = [];
  let totalBytes = 0;
  for (const entry of capturedEntries) {
    if (!exact(entry, ['id', 'kind', 'url'])) invalid();
    const value = await readFile(captured.loadFile, entry.id);
    if (
      !(value instanceof Uint8Array) ||
      !(value.buffer instanceof ArrayBuffer) ||
      value.byteLength < 1 ||
      value.byteLength > captured.limits.fileBytes
    )
      buildFail('PACKAGE_BYTE_BUDGET_EXCEEDED');
    totalBytes += value.byteLength;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > captured.limits.totalBytes)
      buildFail('PACKAGE_BYTE_BUDGET_EXCEEDED');
    files.push({
      ...entry,
      byteLength: value.byteLength,
      sha256: await sha256(new Uint8Array(value)),
    });
  }
  const manifest = { ...capturedBase, files };
  const report = await verifyManifest(manifest, captured);
  return { manifest, report };
}
