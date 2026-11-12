/** One-time setup using ignored .env.cloud; never prints credentials or enables paid plans. */
import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { query, close_postgres } from '@vinlook/server/postgres';
const ownerId = 'tea-db7j3qivcj2c73dri49g';
const repo = 'Dihoccode1/Vinlook';
if (!process.env.RENDER_API_KEY) throw new Error('Add RENDER_API_KEY to ignored .env.cloud');
const required = [
  'DATABASE_URL',
  'VINLOOK_DATASET_ID',
  'ADMIN_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'BACKUP_ENCRYPTION_KEY',
];
for (const key of required)
  if (!process.env[key]) throw new Error(`Configure ${key} before provisioning`);
try {
  const row = (await query('SELECT dataset_id FROM deployment_state WHERE id=1')).rows[0];
  if (row?.dataset_id !== process.env.VINLOOK_DATASET_ID)
    throw new Error('Target database identity mismatch');
} finally {
  await close_postgres();
}
async function render(path, method = 'GET', body) {
  const response = await fetch('https://api.render.com/v1' + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(`Render ${method} ${path.split('?')[0]} failed (${response.status})`);
  return response.json();
}
const owner = await render('/owners/' + ownerId);
if (owner.id !== ownerId) throw new Error('Unexpected Render workspace');
const matches = await render('/services?ownerId=' + ownerId + '&name=vinlook-api&limit=20');
let service = matches.map((entry) => entry.service).find((entry) => entry?.name === 'vinlook-api');
const envKeys = [
  'DATABASE_URL',
  'VINLOOK_DATASET_ID',
  'ADMIN_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_STORAGE_BUCKET',
  'TRANSLATION_PROVIDERS',
];
const envVars = envKeys.map((key) => ({
  key,
  value:
    process.env[key] ||
    (key === 'SUPABASE_STORAGE_BUCKET'
      ? 'vinlook-media'
      : key === 'TRANSLATION_PROVIDERS'
        ? 'mymemory'
        : ''),
}));
if (!service) {
  const result = await render('/services', 'POST', {
    type: 'web_service',
    name: 'vinlook-api',
    ownerId,
    repo: 'https://github.com/' + repo,
    branch: 'codex/cloud-free-supabase',
    autoDeploy: 'no',
    autoDeployTrigger: 'off',
    envVars,
    serviceDetails: {
      runtime: 'docker',
      plan: 'free',
      region: 'singapore',
      numInstances: 1,
      healthCheckPath: '/health/ready',
      envSpecificDetails: { dockerfilePath: './Dockerfile.cloud', dockerContext: '.' },
    },
  });
  service = result.service || result;
}
if (
  service.ownerId !== ownerId ||
  service.repo !== 'https://github.com/' + repo ||
  service.serviceDetails?.plan !== 'free'
)
  throw new Error(
    'Existing service is not the expected Free Vinlook service. No settings changed.',
  );
await render('/services/' + service.id + '/env-vars', 'PUT', envVars);
function gh(args, input) {
  const result = spawnSync('gh', args, {
    input,
    encoding: 'utf8',
    stdio: input ? ['pipe', 'pipe', 'pipe'] : 'pipe',
  });
  if (result.status !== 0) throw new Error(`GitHub configuration failed: ${args[0]} ${args[1]}`);
  return result.stdout;
}
for (const key of ['DATABASE_URL', 'BACKUP_ENCRYPTION_KEY', 'RENDER_API_KEY'])
  gh(['secret', 'set', key, '--repo', repo, '--env', 'production'], process.env[key]);
for (const [key, value] of Object.entries({
  VINLOOK_DATASET_ID: process.env.VINLOOK_DATASET_ID,
  RENDER_SERVICE_ID: service.id,
  VINLOOK_API_ORIGIN: service.serviceDetails.url,
}))
  gh(['variable', 'set', key, '--repo', repo, '--body', value]);
await writeFile(
  '.local-deploy/cloud-service.json',
  JSON.stringify(
    { id: service.id, url: service.serviceDetails.url, plan: service.serviceDetails.plan, ownerId },
    null,
    2,
  ),
);
console.log(`Free backend configured: ${service.serviceDetails.url}`);
console.log(
  'Cloud cutover is still disabled. Verify the first backend deployment before activating main CI/CD.',
);
