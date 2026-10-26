import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { buildReadiness, readinessMarkdown } from '../readiness.mjs';
import { repositoryRoot } from '../inventory.mjs';

test('historical reports never reduce current readback scope or become completion/call approval', () => {
  const value = buildReadiness(), cells = value.matrix.flatMap(row => row.cells);
  assert.equal(cells.length, 240);
  assert.equal(value.freshPairsVerified, 0);
  assert.equal(value.exactRemainingJobs, null); assert.equal(value.providerCallBudget, null);
  assert.equal(value.liveExecutionImplemented, false);
  const preserve = value.matrix.flatMap(row => row.cells.filter(cell => cell.action === 'preserve_report_and_revalidate')
    .map(cell => `${row.poiRef}:${cell.languageCode}`));
  assert.deepEqual(preserve.sort(), ['POI-001:en', 'POI-001:vi', 'POI-001:zh-Hant']);
  assert.equal(cells.filter(cell => cell.action === 'read_current_state').length, 237);
  assert.equal(new Set(value.matrix.flatMap(row => row.cells.map(cell => `${row.poiRef}:${cell.languageCode}`))).size, 240);
  assert.equal(value.byLocale.reduce((sum, row) => sum + row.translationTasksIfAllMissing, 0), 225);
  assert.equal(value.byLocale.filter(row => row.execution === 'server_adapter').reduce((sum, row) => sum + row.audioTasksIfAllMissing, 0), 60);
  assert.equal(value.byLocale.filter(row => row.execution === 'local_worker').reduce((sum, row) => sum + row.audioTasksIfAllMissing, 0), 180);
  assert.deepEqual(value.fullListeningSeconds, { minimum: 21600, maximum: 36000 });
});

test('committed readiness report is reproducible; CLI check cannot accept execute/token arguments', async () => {
  const report = resolve(repositoryRoot, 'docs/poc/tu/content/readiness.md');
  const before = await readFile(report, 'utf8');
  assert.equal(before.replace(/\r\n/g, '\n'), readinessMarkdown());
  for (const [args, status, code] of [[['--check'], 0, null], [['execute'], 1, 'INVALID_COMMAND'],
    [['--token', 'synthetic-private-value'], 1, 'INVALID_COMMAND']]) {
    const child = spawnSync(process.execPath, ['scripts/poc/content/readiness.mjs', ...args], { cwd: repositoryRoot, encoding: 'utf8', timeout: 5000 });
    assert.equal(child.status, status); assert.ok(!child.stdout.includes('synthetic-private-value')); assert.ok(!child.stderr.includes('synthetic-private-value'));
    if (code) assert.equal(JSON.parse(child.stderr).error, code);
  }
  assert.equal(await readFile(report, 'utf8'), before);
});
