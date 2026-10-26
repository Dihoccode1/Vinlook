import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildManifest, verifyManifest } from '../src/manifest.mjs';
import { packageInputs } from './build-fixtures.mjs';

test('manifest derives actual lengths/hashes, binds15English public revisions, and never declares release readiness', async () => {
  const f = packageInputs(), result = await buildManifest(f.base, f.entries, f.options);
  assert.equal(result.manifest.pois.length, 15); assert.equal(result.manifest.files.length, 39);
  assert.equal(result.report.totalBytes, [...f.bytes.values()].reduce((sum, bytes) => sum + bytes.length, 0));
  assert.equal(result.report.releaseReady, false); assert.equal(result.report.mediaCodecsVerified, false);
  assert.equal(result.report.rightsVerified, false); assert.equal(result.report.coverageVerified, false);
  assert.deepEqual(await verifyManifest(result.manifest, f.options), result.report);
});

test('unsafe URLs, missing kinds/refs, fixture provenance and incompatible versions cannot pass', async () => {
  const f = packageInputs(), { manifest } = await buildManifest(f.base, f.entries, f.options);
  for (const change of [m => { m.files[0].url = '/offline/synthetic-v1/../secret'; }, m => { m.files[0].url += '?token=synthetic'; },
    m => { m.files[0].url = '/offline/synthetic-v1/%2e%2e/x'; }, m => { m.files[0].url = 'https://other.example.invalid/x'; },
    m => { m.files = m.files.filter(file => file.kind !== 'boundary'); }, m => { m.graph.chunkFileIds = ['audio-0']; },
    m => { m.provenance.kind = 'fixture'; }, m => { m.appCompatibility.minBuild = 2; }, m => { m.graph.schemaVersion = 999; }]) {
    const mutated = structuredClone(manifest); change(mutated); await assert.rejects(verifyManifest(mutated, f.options));
  }
});

test('publication mismatch, fewer POIs, duplicated audio and corrupt/oversized bytes are rejected', async () => {
  const f = packageInputs(), { manifest } = await buildManifest(f.base, f.entries, f.options);
  for (const change of [m => { m.pois[0].revisionId = '000000000000000000009999'; }, m => { m.pois[0].englishText += 'changed'; },
    m => { m.pois[0].entrance[0] += .1; }, m => { m.pois.pop(); }, m => { m.pois[1].audioFileId = m.pois[0].audioFileId; }]) {
    const mutated = structuredClone(manifest); change(mutated); await assert.rejects(verifyManifest(mutated, f.options));
  }
  await assert.rejects(verifyManifest(manifest, { ...f.options, loadFile: () => new Uint8Array([1]) }), { code: 'PACKAGE_CHECKSUM_MISMATCH' });
  await assert.rejects(verifyManifest(manifest, { ...f.options, loadFile: () => { throw Error('synthetic-private-path'); } }), { message: 'PACKAGE_FILE_UNAVAILABLE' });
  await assert.rejects(buildManifest(f.base, f.entries, { ...f.options, limits: { ...f.options.limits, totalBytes: 1 } }), { code: 'PACKAGE_BYTE_BUDGET_EXCEEDED' });
  const privateSnapshot = structuredClone(f.options.publishedPois); privateSnapshot[0].accessToken = 'synthetic-private';
  await assert.rejects(verifyManifest(manifest, { ...f.options, publishedPois: privateSnapshot }));
});

test('manifest captures selected revisions/config before awaited file I/O', async () => {
  const f = packageInputs(); let first = true;
  const expectedText = f.base.pois[0].englishText;
  const result = await buildManifest(f.base, f.entries, { ...f.options, loadFile: async id => {
    if (first) { first = false; f.base.pois[0].englishText = 'changed'; f.options.publishedPois[0].text = 'changed'; f.entries[0].url = '/unsafe'; }
    return f.bytes.get(id);
  } });
  assert.equal(result.manifest.pois[0].englishText, expectedText);
});
