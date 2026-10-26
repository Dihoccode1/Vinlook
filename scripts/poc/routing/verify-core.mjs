import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const required = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')).engines.node;
if (process.versions.node !== required) throw new Error(`Use repository-pinned Node ${required}`);
for (const path of ['packages/poc-routing/src/core.mjs', 'packages/poc-routing/src/navigation.mjs',
  'packages/poc-routing/src/importer.mjs', 'packages/poc-routing/src/csr.mjs', 'packages/poc-routing/src/manifest.mjs', 'scripts/poc/routing/build.mjs']) {
  execFileSync(process.execPath, ['--check', path], { cwd: root, stdio: 'inherit', windowsHide: true, timeout: 15000 });
}
const result = spawnSync(process.execPath, ['--test', 'packages/poc-routing/test/core.test.mjs', 'packages/poc-routing/test/navigation.test.mjs',
  'packages/poc-routing/test/poc-routing-contract.test.mjs', 'packages/poc-routing/test/importer-csr.test.mjs',
  'packages/poc-routing/test/manifest-build.test.mjs', 'packages/poc-routing/test/build-cli.test.mjs'], {
  cwd: root, stdio: 'inherit', windowsHide: true, timeout: 60000,
});
if (result.error || result.status !== 0) process.exitCode = 1;
