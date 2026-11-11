import { runNpm } from './lib/commands.mjs';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const staticDir = resolve(root, '.vercel/output/static');
const rawOrigin = process.env.VINLOOK_API_ORIGIN;
if (!rawOrigin) throw new Error('VINLOOK_API_ORIGIN must point to the public HTTPS backend.');
const api = new URL(rawOrigin);
if (
  api.protocol !== 'https:' ||
  api.username ||
  api.password ||
  api.pathname !== '/' ||
  api.search ||
  api.hash
) {
  throw new Error('VINLOOK_API_ORIGIN must be an HTTPS origin without credentials or a path.');
}
// Only the generated Build Output API directory is replaced.
const outputDir = resolve(root, '.vercel/output');
if (!outputDir.startsWith(root + sep) || outputDir === root)
  throw new Error('Invalid output directory');
await rm(outputDir, { recursive: true, force: true });
await mkdir(staticDir, { recursive: true });
for (const [workspace, base] of [
  ['user-web', '/'],
  ['admin-web', '/admin/'],
  ['monitor-web', '/monitor/'],
]) {
  const args = ['run', 'build', '-w', `@tourism/${workspace}`, '--', `--base=${base}`];
  const result = runNpm(args, {
    cwd: root,
    env: { ...process.env, NODE_ENV: 'production' },
  });
  if (result.status !== 0) throw new Error(`Frontend build failed: ${workspace}`);
  await cp(resolve(root, `apps/${workspace}/dist`), resolve(staticDir, '.' + base), {
    recursive: true,
  });
}
await writeFile(
  resolve(staticDir, 'release.json'),
  JSON.stringify({
    revision: process.env.VINLOOK_RELEASE_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
  }) + '\n',
);
await writeFile(
  resolve(root, '.vercel/output/config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: '^/api/(.*)$',
          dest: `${api.origin}/api/$1`,
          headers: { 'cache-control': 'no-store' },
        },
        {
          src: '^/health/(.*)$',
          dest: `${api.origin}/health/$1`,
          headers: { 'cache-control': 'no-store' },
        },
        { src: '^/release.json$', headers: { 'cache-control': 'no-store' }, continue: true },
        { handle: 'filesystem' },
        { src: '^/admin(?:/.*)?$', dest: '/admin/index.html' },
        { src: '^/monitor(?:/.*)?$', dest: '/monitor/index.html' },
        { src: '^/.*$', dest: '/index.html' },
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log('Built customer, admin and monitor apps for one same-origin deployment.');
