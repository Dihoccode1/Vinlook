import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

/** Invoke npm without a command shell, including on Windows paths containing spaces. */
export function runNpm(args, options = {}) {
  const cli =
    process.env.npm_execpath ??
    resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  return existsSync(cli)
    ? spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit', ...options })
    : spawnSync('npm', args, { stdio: 'inherit', ...options });
}
