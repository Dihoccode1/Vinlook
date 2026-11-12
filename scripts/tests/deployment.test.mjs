import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from 'yaml';

const root = new URL('../../', import.meta.url);
test('untrusted pull requests cannot enter the production deployment job', async () => {
  const pipeline = parse(await readFile(new URL('.github/workflows/ci-cd.yml', root), 'utf8'));
  assert.equal(pipeline.permissions.contents, 'read');
  assert(!Object.hasOwn(pipeline.on, 'pull_request_target'));
  assert.match(pipeline.jobs.deploy.if, /github\.event_name != 'pull_request'/);
  assert.match(pipeline.jobs.deploy.if, /github\.ref == 'refs\/heads\/main'/);
  assert.deepEqual(pipeline.jobs.deploy.needs.sort(), [
    'containers',
    'postgres-integration',
    'quality',
    'sql-integration',
  ]);
  assert.equal(pipeline.jobs.deploy.concurrency['cancel-in-progress'], false);
  for (const [name, job] of Object.entries(pipeline.jobs)) {
    if (name !== 'deploy-local') assert.equal(job['runs-on'], 'ubuntu-24.04');
  }
  assert.match(pipeline.jobs.deploy.if, /VINLOOK_DEPLOY_TARGET == 'cloud'/);
  assert.match(pipeline.jobs['deploy-local'].if, /VINLOOK_DEPLOY_TARGET != 'cloud'/);
});

test('invalid backend origins fail without replacing existing build output', () => {
  for (const origin of [
    'http://backend.test',
    'https://user:password@backend.test',
    'https://backend.test/api',
    'https://backend.test/?key=private',
  ]) {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('../build-web.mjs', import.meta.url))],
      {
        env: { ...process.env, VINLOOK_API_ORIGIN: origin },
        encoding: 'utf8',
      },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /HTTPS origin/);
  }
});

test('container configuration includes persistent SQL and never bakes deployment credentials', async () => {
  const ignore = await readFile(new URL('.dockerignore', root), 'utf8');
  for (const folder of ['.env', '.local-runner', '.local-deploy', '.vercel'])
    assert(ignore.split(/\r?\n/).includes(folder));
  const compose = parse(await readFile(new URL('infrastructure/docker/compose.yml', root), 'utf8'));
  assert(compose.services.sqlserver.volumes.some((v) => v.startsWith('sqlserver-data:')));
  const release = await readFile(new URL('../deploy-local.ps1', import.meta.url), 'utf8');
  assert(!/down\s+(?:--volumes|-v)/.test(release));
});
