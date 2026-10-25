import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';

const [service, image] = process.argv.slice(2);
if (!['identity', 'content'].includes(service) || !/^vinlook-(identity|content):[a-z0-9-]+$/.test(image ?? '') || !image.startsWith(`vinlook-${service}:`)) throw new Error('Invalid smoke target');
const docker = args => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 60000 });
const config = JSON.parse(docker(['image', 'inspect', image]))[0].Config;
if (config.User !== 'node' || JSON.stringify(config.Cmd) !== JSON.stringify(['node', 'src/server.js'])) throw new Error('Invalid production image command/user');
if (service === 'content') {
  docker(['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', image, 'node', '--input-type=module', '-e', "import {loadContentConfig} from './src/drafts/runtime.js'; if(loadContentConfig('production')!==null)process.exit(1);"]);
}
const name = `vinlook-image-smoke-${randomUUID()}`;
let created = false;
try {
  // Content uses its real default entrypoint; Identity needs private DB configuration,
  // so its smoke remains packaging-only. Neither establishes live dependency readiness.
  const server = "import {createApp} from './src/app.js'; createApp().listen(10000,'127.0.0.1');";
  docker(['run', '-d', '--rm', '--name', name, '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', image, ...(service === 'content' ? [] : ['node', '--input-type=module', '-e', server])]);
  created = true;
  const probe = "const l=await fetch('http://127.0.0.1:10000/health/live'); const r=await fetch('http://127.0.0.1:10000/health/ready'); if(l.status!==200 || r.status!==503 || (await l.json()).data.status!=='up' || (await r.json()).error.code!=='DEPENDENCIES_UNVERIFIED')process.exit(1);";
  let passed = false;
  for (let i = 0; i < 20; i++) {
    try { docker(['exec', name, 'node', '--input-type=module', '-e', probe]); passed = true; break; } catch { await delay(250); }
  }
  if (!passed) throw new Error('Packaging health smoke failed');
  if (service === 'content') {
    docker(['exec', name, 'node', '--input-type=module', '-e', "import {verifyBinaries} from './src/adapters/transcode.js'; await verifyBinaries({ffmpeg:'/usr/bin/ffmpeg',ffprobe:'/usr/bin/ffprobe'});"]);
    const output = docker(['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:size=64m,mode=1777', '--mount', `type=bind,source=${resolve('services/content/test')},target=/app/services/content/test,readonly`, image, 'node', '--test', 'test/adapters.ffmpeg.test.js']);
    console.log(output);
  }
  console.log(`${service}: nonroot/read-only image, liveness200, readiness503; dependency readiness not claimed`);
} finally {
  if (created) docker(['rm', '-f', name]);
}
