import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const orgId = process.env.VERCEL_ORG_ID;
const projectId = process.env.VERCEL_PROJECT_ID;
if (!process.env.VERCEL_TOKEN) delete process.env.VERCEL_TOKEN;
if (!/^team_[A-Za-z0-9]+$/.test(orgId ?? '') || !/^prj_[A-Za-z0-9]+$/.test(projectId ?? '')) {
  throw new Error('Set VERCEL_ORG_ID and VERCEL_PROJECT_ID to the intended Hobby project.');
}
await mkdir(resolve(root, '.vercel'), { recursive: true });
await writeFile(resolve(root, '.vercel/project.json'), JSON.stringify({ orgId, projectId }));
const cli = resolve(root, 'node_modules/vercel/dist/vc.js');
function vercel(args, capture = false) {
  const result = spawnSync(process.execPath, [cli, '--scope', orgId, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
  if (result.status !== 0)
    throw new Error(`Vercel ${args[0]} failed; production was not promoted.`);
  return result.stdout?.trim();
}
// CI tokens, when used, are inherited as VERCEL_TOKEN; never read or print them.
vercel(['whoami']);
async function assertCurrentMain() {
  if (!process.env.GITHUB_ACTIONS) return;
  if (process.env.GITHUB_REPOSITORY !== 'Dihoccode1/Vinlook')
    throw new Error('Unexpected deployment repository');
  const response = await fetch('https://api.github.com/repos/Dihoccode1/Vinlook/commits/main', {
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok || (await response.json()).sha !== process.env.GITHUB_SHA) {
    throw new Error('main changed during this release; the newer commit must be deployed instead.');
  }
}
await assertCurrentMain();
const output = vercel(['deploy', '--prebuilt', '--prod', '--skip-domain', '--yes'], true);
const urls = [...new Set(output.match(/https:\/\/[a-z0-9-]+\.vercel\.app/g) ?? [])];
const staged = urls.length === 1 ? urls[0] : undefined;
if (!staged) throw new Error('Vercel did not return a valid staged deployment URL.');
for (const endpoint of [
  '/',
  '/admin/',
  '/monitor/',
  '/release.json',
  '/health/ready',
  '/api/pois?limit=1',
]) {
  // Authenticate to the exact protected deployment; leave Deployment Protection enabled.
  const body = vercel(
    ['curl', `${staged}${endpoint}`, '--', '--fail', '--silent', '--show-error'],
    true,
  );
  if (endpoint === '/health/ready' && JSON.parse(body).status !== 'ok')
    throw new Error('Staged API is not ready');
  if (endpoint.startsWith('/api/pois') && !Array.isArray(JSON.parse(body).data))
    throw new Error('Staged POI API is invalid');
  if (endpoint === '/release.json' && JSON.parse(body).revision !== process.env.VINLOOK_RELEASE_SHA)
    throw new Error('Staged release revision does not match');
  if (['/', '/admin/', '/monitor/'].includes(endpoint) && !body.includes('id="root"'))
    throw new Error(`Staged frontend is invalid: ${endpoint}`);
}
await assertCurrentMain();
vercel(['promote', staged, '--yes']);
console.log(`Frontend release promoted: ${staged}`);
