/** Hosted Actions: deploy exact backend SHA, verify public APIs, then release FE. */
import { spawnSync } from 'node:child_process';
const sha = process.env.GITHUB_SHA;
const origin = process.env.VINLOOK_API_ORIGIN;
const serviceId = process.env.RENDER_SERVICE_ID;
const renderKey = process.env.RENDER_API_KEY;
if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Expected a Git commit SHA');
const api = new URL(origin);
if (
  api.protocol !== 'https:' ||
  !api.hostname.endsWith('.onrender.com') ||
  api.pathname !== '/' ||
  api.search ||
  api.username
)
  throw new Error('Expected a Render HTTPS origin');
if (!/^srv-[a-z0-9]+$/.test(serviceId ?? '') || !renderKey)
  throw new Error('Configure the Render service ID and API key');
const renderHeaders = { Authorization: `Bearer ${renderKey}`, 'Content-Type': 'application/json' };
const serviceResponse = await fetch(`https://api.render.com/v1/services/${serviceId}`, {
  headers: renderHeaders,
  signal: AbortSignal.timeout(20000),
});
if (!serviceResponse.ok) throw new Error('Cannot verify the Render service plan');
const service = await serviceResponse.json();
if (
  service.serviceDetails?.plan !== 'free' ||
  service.ownerId !== 'tea-db7j3qivcj2c73dri49g' ||
  service.repo !== 'https://github.com/Dihoccode1/Vinlook' ||
  service.serviceDetails?.url !== api.origin
)
  throw new Error('Render target or free plan verification failed. No release was started.');
async function currentMain() {
  const response = await fetch('https://api.github.com/repos/Dihoccode1/Vinlook/commits/main', {
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok || (await response.json()).sha !== sha)
    throw new Error('This commit is no longer main; wait for the newer release.');
}
await currentMain();
const response = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
  method: 'POST',
  headers: renderHeaders,
  body: JSON.stringify({ commitId: sha, clearCache: 'do_not_clear' }),
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Render refused deployment (${response.status})`);
const deployment = await response.json();
console.log('Render deployment requested. Waiting for exact backend revision.');
let ready = false;
for (let attempt = 0; attempt < 120; attempt++) {
  const state = await fetch(
    `https://api.render.com/v1/services/${serviceId}/deploys/${deployment.id}`,
    { headers: renderHeaders, signal: AbortSignal.timeout(20000) },
  );
  if (!state.ok) throw new Error('Cannot read Render deployment status');
  if (
    ['build_failed', 'update_failed', 'pre_deploy_failed', 'canceled', 'deactivated'].includes(
      (await state.json()).status,
    )
  )
    throw new Error('Render deployment failed. Inspect its build log; frontend was not promoted.');
  try {
    const version = await fetch(new URL('/health/release', api), {
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    if (version.ok && (await version.json()).revision === sha) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 10000));
}
if (!ready)
  throw new Error('Render did not serve the expected revision. Frontend was not promoted.');
function node(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: 'inherit',
    env: { ...process.env, VINLOOK_RELEASE_SHA: sha },
  });
  if (result.status !== 0) throw new Error(`Release step failed: ${script}`);
}
node('scripts/smoke.mjs', [api.origin]);
await currentMain();
node('scripts/build-web.mjs');
node('scripts/release-frontend.mjs');
const publicRelease = await fetch('https://vinlook-poc-web.vercel.app/release.json', {
  cache: 'no-store',
  signal: AbortSignal.timeout(20000),
});
if (!publicRelease.ok || (await publicRelease.json()).revision !== sha)
  throw new Error('Production frontend revision check failed');
node('scripts/smoke.mjs', ['https://vinlook-poc-web.vercel.app']);
console.log(`Cloud FE and BE verified: ${sha}`);
