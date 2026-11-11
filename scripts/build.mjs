import { runNpm } from './lib/commands.mjs';

// A developer's .env must not turn production React builds into development bundles.
const result = runNpm(['run', 'build', '--workspaces', '--if-present'], {
  env: { ...process.env, NODE_ENV: 'production' },
});
process.exitCode = result.status ?? 1;
