import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { osmFixture, importLimits, csrLimits, coreLimits, indexLimits, packageInputs } from './build-fixtures.mjs';
import { decodeCsr, sha256 } from '../src/csr.mjs';
import { PROFILE_VERSION } from '../src/importer.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const limits = { inputBytes: 500000, importer: importLimits, csr: csrLimits, runtime: coreLimits, index: indexLimits,
  manifest: { files: 100, fileBytes: 10000, totalBytes: 100000 } };
async function workspace(t) {
  const path = await mkdtemp(join(tmpdir(), 'vinlook-tu04-build-'));
  t.after(() => { assert.equal(dirname(resolve(path)), resolve(tmpdir())); assert.ok(basename(path).startsWith('vinlook-tu04-build-')); return rm(path, { recursive: true, force: true }); });
  await writeFile(join(path, 'limits.json'), JSON.stringify(limits)); return path;
}
const run = args => spawnSync(process.execPath, ['scripts/poc/routing/build.mjs', ...args], { cwd: root, encoding: 'utf8', timeout: 10000 });
async function source(path) {
  const input = { graphVersion: 'synthetic-graph-v1', source: { kind: 'fixture', snapshot: 'SYNTHETIC-NOT-OSM', sha256: '0'.repeat(64), license: 'CC0-1.0', attribution: 'Synthetic test only' }, osm: osmFixture() };
  await writeFile(join(path, 'input.json'), JSON.stringify(input)); return input;
}

test('graph CLI writes exclusive checksummed candidate bytes, decodes into real core input and never advertises ready', async t => {
  const path = await workspace(t); await source(path);
  const args = ['graph','--input',join(path,'input.json'),'--limits',join(path,'limits.json'),'--out',join(path,'candidate'),'--fixture'];
  const result = run(args); assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { mode: 'local_candidate', command: 'graph', filesWritten: 4, releaseReady: false });
  const report = JSON.parse(await readFile(join(path,'candidate','build-report.json'),'utf8'));
  assert.equal(report.fixtureOnly, true); assert.equal(report.sourceBytesVerified, false); assert.equal(report.releaseReady, false);
  assert.deepEqual((await readdir(join(path,'candidate'))).sort(), ['build-report.json','graph-meta.json','graph.csr','spatial-index.json']);
  for (const file of report.files) {
    const bytes = await readFile(join(path,'candidate',file.name)); assert.equal(bytes.length, file.byteLength); assert.equal(await sha256(bytes), file.sha256);
  }
  const binary = await readFile(join(path,'candidate','graph.csr')), metadata = await readFile(join(path,'candidate','graph-meta.json'));
  assert.equal((await decodeCsr(binary, metadata, { graphVersion: 'synthetic-graph-v1', profileVersion: PROFILE_VERSION, sha256: await sha256(binary) }, csrLimits)).graph.edges.length, 8);
  assert.equal(run(args).status, 1); assert.deepEqual(await readFile(join(path,'candidate','graph.csr')), binary);
});

test('CLI rejects fixture-as-source, Git output, invalid budgets/commands and private error reflection', async t => {
  const path = await workspace(t), input = await source(path);
  const args = ['graph','--input',join(path,'input.json'),'--limits',join(path,'limits.json'),'--out',join(path,'candidate')];
  assert.equal(JSON.parse(run(args).stderr).error, 'SOURCE_PROVENANCE_REQUIRED');
  const gitOutput = join(root,'data','poc',`refused-${basename(path)}`);
  const refused = run([...args.slice(0,-1),gitOutput,'--fixture']); assert.equal(JSON.parse(refused.stderr).error, 'OUTPUT_INSIDE_GIT');
  await assert.rejects(stat(gitOutput), { code: 'ENOENT' });
  input.osm.complete = false; await writeFile(join(path,'input.json'),JSON.stringify(input)); assert.equal(run([...args,'--fixture']).status, 1);
  assert.equal(run(['execute','--token','synthetic-private']).status, 1);
  assert.equal(JSON.parse(run(['graph','--input','//untrusted.invalid/share/input.json','--limits',join(path,'limits.json'),'--out',join(path,'unc-output')]).stderr).error, 'NONLOCAL_PATH');
  await writeFile(join(path,'input.json'),'synthetic-private'); const malformed = run([...args,'--fixture']);
  assert.equal(malformed.status, 1); assert.ok(!malformed.stderr.includes('synthetic-private')); assert.equal(malformed.stdout,'');
});

test('manifest CLI derives actual local file hashes and emits metadata only, without copying/publishing assets', async t => {
  const path = await workspace(t), fixture = packageInputs(), files = [];
  for (const entry of fixture.entries) { const file = join(path,`${entry.id}.bin`); await writeFile(file,fixture.bytes.get(entry.id)); files.push({ ...entry, path: file }); }
  await writeFile(join(path,'package.json'),JSON.stringify({ manifest: fixture.base, files, publishedPois: fixture.options.publishedPois, appBuild: 1 }));
  const result = run(['manifest','--input',join(path,'package.json'),'--limits',join(path,'limits.json'),'--out',join(path,'package-candidate')]);
  assert.equal(result.status,0,result.stderr);
  const manifest = JSON.parse(await readFile(join(path,'package-candidate','manifest.json'),'utf8'));
  const report = JSON.parse(await readFile(join(path,'package-candidate','build-report.json'),'utf8'));
  assert.equal(manifest.files.length,39); assert.equal(report.assetsCopied,false); assert.equal(report.assetsPublished,false); assert.equal(report.releaseReady,false);
  assert.deepEqual((await readdir(join(path,'package-candidate'))).sort(), ['build-report.json','manifest.json']);
});
