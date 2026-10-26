import { open, mkdir, realpath, stat, unlink } from 'node:fs/promises';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importOsm, PROFILE_VERSION, BuildFailure, buildFail } from '../../../packages/poc-routing/src/importer.mjs';
import { encodeCsr, decodeCsr, buildSpatialIndex, sha256 } from '../../../packages/poc-routing/src/csr.mjs';
import { buildManifest } from '../../../packages/poc-routing/src/manifest.mjs';
import { createGraph } from '../../../packages/poc-routing/src/core.mjs';
const utf8 = value => new TextEncoder().encode(JSON.stringify(value));
function localPath(path) {
  if (typeof path !== 'string' || !path || /^(?:[\\/]{2}|[A-Za-z][A-Za-z0-9+.-]*:\/\/)/.test(path)) buildFail('NONLOCAL_PATH');
  return path;
}
async function readBytes(path, cap) {
  localPath(path);
  if (!Number.isSafeInteger(cap) || cap < 1 || cap > 256 * 1024 * 1024) buildFail('INVALID_INPUT_BYTE_BUDGET');
  if (!(await stat(path)).isFile()) buildFail('INVALID_INPUT_FILE');
  const file = await open(path, 'r');
  try {
    const info = await file.stat(); if (!info.isFile() || info.size > cap) buildFail('INPUT_BYTE_BUDGET_EXCEEDED');
    const bytes = new Uint8Array(info.size + 1); let count = 0;
    for (;;) { const { bytesRead } = await file.read(bytes, count, bytes.length - count, null); if (!bytesRead) break; count += bytesRead; if (count > info.size) buildFail('INPUT_CHANGED_DURING_READ'); }
    if (count !== info.size) buildFail('INPUT_CHANGED_DURING_READ');
    return bytes.slice(0, count);
  } finally { await file.close(); }
}
async function readJson(path, cap) {
  const bytes = await readBytes(path, cap);
  try { return { bytes, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) }; } catch { buildFail('INVALID_INPUT_JSON'); }
}
async function outsideGit(path) {
  let current = path;
  for (;;) {
    try { await stat(join(current, '.git')); buildFail('OUTPUT_INSIDE_GIT'); }
    catch (error) { if (error instanceof BuildFailure || error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; }
    const parent = dirname(current); if (parent === current) break; current = parent;
  }
}
async function newOutput(path) {
  localPath(path);
  const parent = await realpath(dirname(resolve(path))); await outsideGit(parent);
  const output = join(parent, basename(resolve(path))); await mkdir(output); // Exclusive new directory; never reuse or delete old output.
  const marker = await open(join(output, '.incomplete'), 'wx', 0o600); await marker.writeFile('candidate files incomplete\n'); await marker.sync(); await marker.close();
  return output;
}
async function write(path, bytes) {
  if (bytes.byteLength > 16 * 1024 * 1024) buildFail('ARTIFACT_FILE_BUDGET_EXCEEDED');
  const file = await open(path, 'wx', 0o600); try { await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
}
function source(value, fixture) {
  if (!value || !['osm', 'fixture'].includes(value.kind) || value.kind === 'fixture' && !fixture
    || typeof value.snapshot !== 'string' || !value.snapshot.trim() || value.snapshot.length > 2048
    || !/^[a-f0-9]{64}$/.test(value.sha256 ?? '') || value.license !== (value.kind === 'osm' ? 'ODbL-1.0' : 'CC0-1.0')
    || typeof value.attribution !== 'string' || !value.attribution.trim() || value.attribution.length > 4096) buildFail('SOURCE_PROVENANCE_REQUIRED');
  if (value.kind === 'osm') {
    let url; try { url = new URL(value.snapshot); } catch { buildFail('SOURCE_PROVENANCE_REQUIRED'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) buildFail('SOURCE_PROVENANCE_REQUIRED');
  }
  return { kind: value.kind, snapshot: value.snapshot, sha256: value.sha256, license: value.license, attribution: value.attribution };
}
export async function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('graph|manifest --input LOCAL_JSON --limits LOCAL_BUDGET_JSON --out NEW_OUTSIDE_GIT_DIRECTORY [--fixture]'); return;
  }
  const command = args[0], options = new Map(); let fixture = false;
  for (let index = 1; index < args.length; index++) {
    if (args[index] === '--fixture' && !fixture) { fixture = true; continue; }
    if (!['--input', '--limits', '--out'].includes(args[index]) || options.has(args[index]) || !args[index + 1] || args[index + 1].startsWith('--')) buildFail('INVALID_COMMAND');
    options.set(args[index], args[++index]);
  }
  if (!['graph', 'manifest'].includes(command) || options.size !== 3 || command === 'manifest' && fixture) buildFail('INVALID_COMMAND');
  for (const value of options.values()) localPath(value);
  const limits = (await readJson(resolve(options.get('--limits')), 16384)).value;
  const inputPath = resolve(options.get('--input')), input = await readJson(inputPath, limits.inputBytes);
  const files = new Map(); let report;
  if (command === 'graph') {
    const provenance = source(input.value.source, fixture), imported = importOsm(input.value.osm, limits.importer);
    const versions = { graphVersion: input.value.graphVersion, profileVersion: PROFILE_VERSION };
    const encoded = await encodeCsr(imported.graph, versions, limits.csr);
    const graphHash = await sha256(encoded.binary);
    const decoded = await decodeCsr(encoded.binary, encoded.metadata, { ...versions, sha256: graphHash }, limits.csr);
    const checked = createGraph(decoded.graph, limits.runtime); // Actual core validates the decoded metric/topology/index budget.
    const index = await buildSpatialIndex(decoded.graph, graphHash, limits.index);
    files.set('graph.csr', encoded.binary); files.set('graph-meta.json', encoded.metadata); files.set('spatial-index.json', utf8(index));
    report = { ...imported.report, format: decoded.format, graphVersion: versions.graphVersion, source: provenance,
      sourceBytesVerified: false, inputJsonSha256: await sha256(input.bytes), eligibleEdges: checked.eligibleEdgeCount,
      spatialIndexEntries: checked.spatialIndexEntries, fixtureOnly: provenance.kind === 'fixture', releaseReady: false };
  } else {
    const spec = input.value, paths = new Map();
    if (!Array.isArray(spec.files)) buildFail('INVALID_MANIFEST_FILES');
    const entries = spec.files.map(file => {
      if (typeof file.path !== 'string' || !file.path || paths.has(file.id) || /(^|[\\/])\.|\.(?:pem|key|env)$/i.test(file.path)) buildFail('INVALID_MANIFEST_FILES');
      localPath(file.path);
      paths.set(file.id, resolve(dirname(inputPath), file.path)); return { id: file.id, kind: file.kind, url: file.url };
    });
    const built = await buildManifest(spec.manifest, entries, { publishedPois: spec.publishedPois, appBuild: spec.appBuild,
      limits: limits.manifest, loadFile: id => readBytes(paths.get(id), limits.manifest.fileBytes) });
    files.set('manifest.json', utf8(built.manifest)); report = { ...built.report, inputJsonSha256: await sha256(input.bytes), assetsCopied: false, assetsPublished: false };
  }
  report.files = [];
  for (const [name, bytes] of files) report.files.push({ name, byteLength: bytes.length, sha256: await sha256(bytes) });
  const output = await newOutput(options.get('--out'));
  for (const [name, bytes] of files) await write(join(output, name), bytes);
  await write(join(output, 'build-report.json'), utf8({ ...report, candidateFilesComplete: true }));
  await unlink(join(output, '.incomplete')); // Only the marker created by this invocation; no recursive cleanup.
  console.log(JSON.stringify({ mode: 'local_candidate', command, filesWritten: files.size + 1, releaseReady: false }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(process.argv.slice(2)); }
  catch (error) { console.error(JSON.stringify({ error: error instanceof BuildFailure ? error.code : 'ROUTING_BUILD_FAILED' })); process.exitCode = 1; }
}
