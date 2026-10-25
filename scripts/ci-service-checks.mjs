import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const service = process.argv[2];
if (!['identity', 'content'].includes(service)) throw new Error('Select identity or content');
const run = args => execFileSync(process.execPath, args, { stdio: 'inherit', windowsHide: true });
for (const file of await readdir(`services/${service}/src`, { recursive: true })) {
  if (file.endsWith('.js')) run(['--check', `services/${service}/src/${file}`]);
}
const tests = (await readdir(`services/${service}/test`))
  .filter(name => name.endsWith('.test.js') && !name.endsWith('.integration.test.js') && name !== 'adapters.ffmpeg.test.js')
  .map(name => `services/${service}/test/${name}`);
if (!tests.length) throw new Error('No unit tests discovered');
run(['--test', ...tests]);
run(['--test', 'tests/runtime-health.test.mjs', 'tests/authorization.test.mjs']);
