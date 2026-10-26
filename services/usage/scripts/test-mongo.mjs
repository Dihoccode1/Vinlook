// Only this invocation's fresh uniquely labelled container is created/removed. Never accepts a URI.
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const image = 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907';
const name = `vinlook-poc-usage-mongo-${randomUUID()}`;
const docker = args => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 120000 });
let created = false;
try {
  docker(['run', '-d', '--rm', '--name', name, '--label', 'vinlook.poc=usage-test', '--publish', '127.0.0.1::27017',
    '--memory', '768m', '--cpus', '1', image, '--replSet', 'vinlook_usage_poc', '--bind_ip_all']); created = true;
  let primary = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      docker(['exec', name, 'mongosh', '--quiet', '--eval', "if(!db.hello().setName)rs.initiate({_id:'vinlook_usage_poc',members:[{_id:0,host:'127.0.0.1:27017'}]})"]);
      primary = docker(['exec', name, 'mongosh', '--quiet', '--eval', 'db.hello().isWritablePrimary']).trim() === 'true';
      if (primary) break;
    } catch { /* Fresh fixture may still be starting. */ }
    await delay(500);
  }
  if (!primary) throw Error('Usage disposable replica set did not become primary');
  const environment = Object.fromEntries(['PATH', 'SystemRoot', 'TEMP', 'TMP'].filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
  const child = spawnSync(process.execPath, ['--test', 'services/usage/test/mongo.integration.test.mjs'], { cwd: root, stdio: 'inherit', windowsHide: true,
    timeout: 180000, env: { ...environment, VINLOOK_TEST_MONGO_CONTAINER: name } });
  if (child.error || child.status !== 0) throw Error('Usage disposable Mongo integration failed');
} finally { if (created) docker(['rm', '-f', name]); }
