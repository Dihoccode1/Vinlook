import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const suites = {
  identity: [['004', 'indexes'], ['005', 'auth'], ['006', 'authorization'], ['007', 'session'], ['008', 'audit'], ['009', 'staff'], ['010', 'operator'], ['025', 'catalog']],
  content: [['011', 'indexes'], ['015', 'durability'], ['012', 'drafts'], ['019', 'media'], ['013', 'publication'], ['014', 'lifecycle'], ['016', 'jobs'], ['017', 'adapters']],
};
const service = process.argv[2];
if (!Object.hasOwn(suites, service)) throw new Error('Select identity or content');
const image = 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907';
const docker = args => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 120000 });
for (const [task, suite] of suites[service]) {
  const name = `vinlook-task${task}-mongo-ci-${randomUUID()}`;
  const set = `vinlook_task${task}`;
  let created = false;
  try {
    docker(['run', '-d', '--rm', '--name', name, '--label', `vinlook.task=TASK-${task}`, '--publish', '127.0.0.1::27017', image, '--replSet', set, '--bind_ip_all']);
    created = true;
    let initialized = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        docker(['exec', name, 'mongosh', '--quiet', '--eval', `rs.initiate({_id:'${set}',members:[{_id:0,host:'127.0.0.1:27017'}]})`]);
        initialized = true; break;
      } catch { await delay(500); }
    }
    if (!initialized) throw new Error('Disposable replica set failed to initialize');
    let primary = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (docker(['exec', name, 'mongosh', '--quiet', '--eval', 'db.hello().isWritablePrimary']).trim() === 'true') { primary = true; break; }
      await delay(500);
    }
    if (!primary) throw new Error('Disposable replica set did not elect a primary');
    const child = spawnSync(process.execPath, ['--test', `services/${service}/test/${suite}.integration.test.js`], {
      stdio: 'inherit', windowsHide: true, timeout: 180000,
      env: { ...process.env, VINLOOK_TEST_MONGO_CONTAINER: name, VINLOOK_TEST_ADAPTERS: task === '017' ? '1' : '0' },
    });
    if (child.error || child.status !== 0) throw new Error(`Integration suite failed: ${service}/${suite}`);
  } finally {
    // Only the fresh, uniquely named container created by this invocation is disposable.
    if (created) docker(['rm', '-f', name]);
  }
}
