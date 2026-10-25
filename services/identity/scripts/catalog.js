import { pathToFileURL } from 'node:url';
import { ttyPrompt } from './operator.js';
import { runCatalog, CatalogError } from '../src/catalog.js';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runCatalog(process.argv.slice(2), { prompt: ttyPrompt, output: line => process.stdout.write(`${line}\n`) });
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: error instanceof CatalogError ? error.code : 'CATALOG_INPUT_FAILED',
      completed: error instanceof CatalogError ? error.completed : 0, status: 'incomplete',
      ...(error instanceof CatalogError && error.hint ? { hint: error.hint } : {}) })}\n`);
    process.exitCode = 1;
  }
}
