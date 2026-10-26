import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildInventory, inventoryJson, extractNarrations, repositoryRoot } from '../inventory.mjs';
import { join } from 'node:path';

test('inventory has exactly 15×16 unique rows and exact registry profiles with no live acceptance inferred', () => {
  const value = buildInventory();
  assert.equal(value.pois.length, 15); assert.equal(value.rows.length, 240);
  assert.equal(new Set(value.rows.map(row => `${row.poiRef}/${row.languageCode}`)).size, 240);
  for (const poi of value.pois) assert.equal(value.rows.filter(row => row.poiRef === poi.poiRef).length, 16);
  assert.deepEqual([value.summary.translationTasksIfAllMissing, value.summary.serverAudioTasksIfAllMissing, value.summary.localAudioTasksIfAllMissing], [225, 60, 180]);
  assert.equal(value.summary.livePairsVerifiedByThisInventory, 0);
  assert.ok(value.rows.every(row => row.liveVerification === 'not_checked' && row.textVersion === null && row.audioSha256 === null));
  assert.deepEqual(value.rows.filter(row => row.historicalApprovalReported).map(row => row.languageCode).sort(), ['en', 'vi', 'zh-Hant']);
  assert.ok(value.pois.every(poi => poi.thumbnail.license === null && poi.entranceEvidence.fieldwork === 'waived_not_performed'));
});

test('canonical first-five narration hashes agree with previous approved-source batch metadata', () => {
  const old = JSON.parse(readFileSync(join(repositoryRoot, 'docs/planning/task025-batch-plan.json'), 'utf8'));
  const value = buildInventory();
  for (const poi of value.pois.slice(0, 5)) {
    assert.equal(poi.narrationSha256, old.rows.find(row => row.poi === poi.poiRef).sourceTextSha256);
  }
});

test('source extraction is CRLF stable, refuses missing headings, and generated public inventory is reproducible', () => {
  const source = readFileSync(join(repositoryRoot, 'docs/content/poi-006-010-scripts-en.md'), 'utf8').replace(/\r\n/g, '\n');
  assert.deepEqual(extractNarrations(source, 6, 10), extractNarrations(source.replace(/\n/g, '\r\n'), 6, 10));
  assert.throws(() => extractNarrations(source.replace('### Narration EN', '### Removed'), 6, 10), /NARRATION_INVENTORY_INVALID/);
  assert.equal(readFileSync(join(repositoryRoot, 'data/poc/content-inventory.json'), 'utf8').replace(/\r\n/g, '\n'), inventoryJson());
});
