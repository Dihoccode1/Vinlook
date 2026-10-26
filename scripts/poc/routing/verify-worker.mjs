import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const required = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')).engines.node;
if (process.versions.node !== required) throw new Error(`Use repository-pinned Node ${required}`);
for (const file of ['worker-runtime', 'worker-client', 'worker', 'guidance', 'route-worker-runtime', 'route-client', 'route-worker']) {
  execFileSync(process.execPath, ['--check', `packages/poc-routing/src/${file}.mjs`], { cwd: root, stdio: 'inherit', windowsHide: true, timeout: 15000 });
}
execFileSync(process.execPath, ['--test', ...['core', 'navigation', 'poc-routing-contract', 'worker', 'route-worker'].map(name => `packages/poc-routing/test/${name}.test.mjs`)],
  { cwd: root, stdio: 'inherit', windowsHide: true, timeout: 60000 });
