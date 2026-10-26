#!/usr/bin/env node
// HCMC OSM acquisition for #74: `query` prints the Overpass request, `fetch` downloads it only with
// --confirm-download, `convert` turns the saved Overpass JSON into build.mjs graph input offline.
import { createHash } from 'node:crypto';
import { open, readFile, stat, realpath } from 'node:fs/promises';
import { dirname, join, resolve, basename } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { highways } from '../../../packages/poc-routing/src/importer.mjs';

const OVERPASS = 'https://overpass-api.de/api/interpreter';
const MAX_DOWNLOAD = 1024 * 1024 * 1024;
// VN-SG is Ho Chi Minh City; the admin area includes the 2025 merged provinces and Con Dao.
export function overpassQuery() {
  const pattern = [...highways].sort().join('|');
  return `[out:json][timeout:1800][maxsize:${MAX_DOWNLOAD}];
area["ISO3166-2"="VN-SG"]["boundary"="administrative"]->.hcm;
way(area.hcm)["highway"~"^(${pattern})$"]->.w;
(.w; node(w.w); relation(bw.w)["type"="restriction"];)->.all;
.all out body;`;
}

async function outsideGit(path) {
  for (let current = await realpath(dirname(resolve(path))); ; current = dirname(current)) {
    try { await stat(join(current, '.git')); throw new Error('OUTPUT_INSIDE_GIT'); }
    catch (error) { if (error.message === 'OUTPUT_INSIDE_GIT') throw error; }
    if (dirname(current) === current) return;
  }
}

async function fetchOsm(out) {
  await outsideGit(out);
  const startedAt = new Date().toISOString(), hash = createHash('sha256');
  const response = await fetch(OVERPASS, { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: overpassQuery() }) });
  if (!response.ok) throw new Error(`OVERPASS_HTTP_${response.status}`);
  const file = await open(out, 'wx', 0o600); let bytes = 0;
  try {
    for await (const chunk of response.body) {
      bytes += chunk.byteLength; if (bytes > MAX_DOWNLOAD) throw new Error('DOWNLOAD_BYTE_BUDGET_EXCEEDED');
      hash.update(chunk); await file.write(chunk);
    }
    await file.sync();
  } finally { await file.close(); }
  const provenance = { endpoint: OVERPASS, query: overpassQuery(), startedAt, finishedAt: new Date().toISOString(), bytes,
    sha256: hash.digest('hex'), license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors' };
  const sidecar = await open(`${out}.provenance.json`, 'wx', 0o600);
  try { await sidecar.writeFile(JSON.stringify(provenance, null, 2)); } finally { await sidecar.close(); }
  return provenance;
}

/** Overpass `out body` elements → importer document; restriction members outside the extract are reported, never invented. */
export function convertOverpass(overpass, { graphVersion, snapshot, sha256 }) {
  if (!overpass || !Array.isArray(overpass.elements)) throw new Error('INVALID_OVERPASS_JSON');
  if (overpass.remark) throw new Error('OVERPASS_REMARK_PRESENT'); // Timeouts/maxsize truncation surface as remarks.
  const nodes = [], ways = [], relations = [], nodeIds = new Set(), wayIds = new Set();
  for (const element of overpass.elements) {
    if (element.type === 'node') { nodes.push({ id: element.id, lon: element.lon, lat: element.lat, ...(element.tags ? { tags: element.tags } : {}) }); nodeIds.add(element.id); }
    else if (element.type === 'way') { ways.push({ id: element.id, nodes: element.nodes, ...(element.tags ? { tags: element.tags } : {}) }); wayIds.add(element.id); }
  }
  let droppedRelations = 0, trimmedMembers = 0;
  for (const element of overpass.elements) {
    if (element.type !== 'relation') continue;
    const members = (element.members ?? []).filter(member => member.type === 'way' ? wayIds.has(member.ref) : member.type === 'node' && nodeIds.has(member.ref));
    trimmedMembers += (element.members?.length ?? 0) - members.length;
    // Kept members are quarantined by the importer; a relation with nothing inside the extract cannot affect it.
    if (!members.length) { droppedRelations++; continue; }
    relations.push({ id: element.id, members: members.map(({ type, ref }) => ({ type, ref })), ...(element.tags ? { tags: element.tags } : {}) });
  }
  const missingNodeRefs = ways.reduce((count, way) => count + way.nodes.filter(id => !nodeIds.has(id)).length, 0);
  if (missingNodeRefs) throw new Error('INCOMPLETE_EXTRACT_MISSING_NODES');
  return { input: { graphVersion, source: { kind: 'osm', snapshot, sha256, license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors' },
    osm: { complete: true, nodes, ways, relations } },
    report: { nodes: nodes.length, ways: ways.length, relations: relations.length, droppedRelations, trimmedMembers,
      taggedFoot: ways.filter(way => ['yes', 'designated', 'permissive'].includes(way.tags?.foot ?? way.tags?.access)).length } };
}

async function main() {
const { positionals, values } = parseArgs({ allowPositionals: true, strict: true, options: { out: { type: 'string' }, input: { type: 'string' },
  'graph-version': { type: 'string' }, 'confirm-download': { type: 'boolean' } } });
const command = positionals[0];
try {
  if (command === 'query') console.log(overpassQuery());
  else if (command === 'fetch') {
    if (!values['confirm-download'] || !values.out) throw new Error('USAGE: fetch --out FILE_OUTSIDE_GIT --confirm-download');
    console.log(JSON.stringify(await fetchOsm(values.out), null, 2));
  } else if (command === 'convert') {
    if (!values.input || !values.out || !/^[A-Za-z0-9._-]{1,100}$/.test(values['graph-version'] ?? '')) throw new Error('USAGE: convert --input OVERPASS_JSON --graph-version V --out FILE_OUTSIDE_GIT');
    await outsideGit(values.out);
    const provenance = JSON.parse(await readFile(`${values.input}.provenance.json`, 'utf8'));
    const raw = await readFile(values.input);
    if (createHash('sha256').update(raw).digest('hex') !== provenance.sha256) throw new Error('DOWNLOAD_CHECKSUM_MISMATCH');
    const { input, report } = convertOverpass(JSON.parse(raw.toString('utf8')),
      { graphVersion: values['graph-version'], snapshot: provenance.endpoint, sha256: provenance.sha256 });
    const file = await open(values.out, 'wx', 0o600);
    try { await file.writeFile(JSON.stringify(input)); } finally { await file.close(); }
    console.log(JSON.stringify({ out: basename(values.out), downloadedAt: provenance.finishedAt, ...report }, null, 2));
  } else throw new Error('USAGE: fetch-osm.mjs query | fetch --out F --confirm-download | convert --input F --graph-version V --out F');
} catch (error) { console.error(error.message); process.exitCode = 1; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
