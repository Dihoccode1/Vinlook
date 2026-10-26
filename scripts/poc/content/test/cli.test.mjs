import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { repositoryRoot } from '../inventory.mjs';
import { ids, fixtureOrigin, makeSnapshot } from './fixtures.mjs';
const command = args => spawnSync(process.execPath, ['scripts/poc/content/cli.mjs', ...args], {
  cwd: repositoryRoot, encoding: 'utf8', timeout: 10000,
});
async function temp(t) {
  const directory = await mkdtemp(join(tmpdir(), 'vinlook-tu03-cli-'));
  t.after(() => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('vinlook-tu03-cli-'));
    return rm(directory, { recursive: true, force: true });
  });
  return directory;
}
test('real inventory CLI checks deterministic committed metadata with zero live verification', () => {
  const result = command(['inventory', '--check']);
  assert.equal(result.status, 0); assert.equal(JSON.parse(result.stdout).pairs, 240);
  assert.equal(JSON.parse(result.stdout).liveVerifiedByThisRun, 0);
});
test('real dry-run CLI writes a private exclusive plan, prints no source/IDs/origin and never executes a mutation', async t => {
  const directory = await temp(t), snapshot = join(directory, 'snapshot.json'), out = join(directory, 'plan.json');
  await writeFile(snapshot, JSON.stringify(makeSnapshot()));
  const args = ['plan', '--snapshot', snapshot, '--content-origin', fixtureOrigin, '--poi-ref', 'POI-001', '--locale', 'zh-Hant', '--operation', 'queue', '--out', out];
  const result = command(args);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).mutationExecuted, false);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(`${ids.poi}|content\\.example|Synthetic source`));
  const stored = JSON.parse(await readFile(out, 'utf8'));
  assert.equal(stored.selection.locale, 'zh-Hant'); assert.deepEqual(JSON.parse(stored.request.bodyText).languages, ['zh-Hant']);
  const duplicate = command(args); assert.equal(duplicate.status, 1);
  assert.deepEqual(JSON.parse(await readFile(out, 'utf8')), stored);
});
test('execute/token/body-locale flags and malformed private inputs fail without echoing values', async t => {
  const directory = await temp(t), snapshot = join(directory, 'invalid.json');
  await writeFile(snapshot, 'synthetic-private-input-not-json');
  for (const args of [['execute', '--token', 'synthetic-private-value'],
    ['plan', '--body-locale', 'vi'],
    ['plan', '--snapshot', snapshot, '--content-origin', fixtureOrigin, '--poi-ref', 'POI-001', '--locale', 'zh-Hant', '--operation', 'queue', '--out', join(directory, 'plan.json')]]) {
    const result = command(args); assert.equal(result.status, 1);
    assert.doesNotMatch(result.stdout + result.stderr, /synthetic-private|content\.example|Bearer|SyntaxError/);
    assert.ok(JSON.parse(result.stderr).error);
  }
});
