// Process-scoped workaround for the observed local Node resolver issue.
// Only plan/help; live apply requires a separately reviewed actual plan and approval.
import { setServers } from 'node:dns';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
if (args.length && !(args.length === 1 && args[0] === '--help')) {
  process.stderr.write(`${JSON.stringify({ error: 'CATALOG_READ_ONLY_LAUNCHER', completed: 0, status: 'incomplete' })}\n`);
  process.exitCode = 1;
} else {
  setServers(['8.8.8.8']);
  process.argv[1] = fileURLToPath(new URL('./catalog.js', import.meta.url));
  await import('./catalog.js');
}
