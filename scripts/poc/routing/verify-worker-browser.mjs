// Optional local Chrome verification; no dependency installation and no production server.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
import { node, edge, limits } from '../../../packages/poc-routing/test/core-fixtures.mjs';
const pkg = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8'));
assert.equal(process.versions.node, pkg.engines.node, 'Use repository-pinned Node');
assert.ok(process.env.VINLOOK_PLAYWRIGHT_MODULE_PATH, 'Set VINLOOK_PLAYWRIGHT_MODULE_PATH to an installed Playwright entry');
const { chromium } = await import(pathToFileURL(process.env.VINLOOK_PLAYWRIGHT_MODULE_PATH).href);
const allowed = new Set(['core.mjs', 'worker-runtime.mjs', 'worker-client.mjs', 'worker.mjs']);
const server = createServer(async (req, res) => {
  if (req.url === '/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<!doctype html><title>Labelled synthetic Worker verification</title>'); return; }
  const name = req.url?.slice(1);
  if (!allowed.has(name)) { res.writeHead(404); res.end(); return; }
  try { const bytes = await readFile(new URL(`../../../packages/poc-routing/src/${name}`, import.meta.url)); res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(bytes); }
  catch { res.writeHead(500); res.end(); }
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.goto(origin);
  const results = await page.evaluate(async ({ graph, limits }) => {
    const { createNodeWorkerClient } = await import('/worker-client.mjs');
    const client = createNodeWorkerClient({ graph, config: { graphVersion: 'synthetic-browser-v1', limits, maxRequests: 10, maxResultPoints: 10 }, timeoutMilliseconds: 3000 });
    const query = id => ({ requestId: id, graphVersion: 'synthetic-browser-v1', fromNodeId: 'a', toNodeId: 'b' });
    try {
      const first = await client.calculateNodes(query('one'));
      const reverse = await client.calculateNodes({ ...query('reverse'), fromNodeId: 'b', toNodeId: 'a' });
      client.cancel();
      const reload = await client.calculateNodes(query('reload'));
      const pending = client.calculateNodes(query('cancel')); client.cancel();
      let code; try { await pending; } catch (error) { code = error.code; }
      return { first, reverse, reload, code };
    } finally { client.dispose(); }
  }, { graph: { nodes: [node('a', 0), node('b', 100)], edges: [edge('ab', 'a', 'b', 120)] }, limits });
  assert.equal(results.first.distanceMeters, 120); assert.equal(results.reverse.status, 'no_route');
  assert.equal(results.reload.distanceMeters, 120); assert.equal(results.code, 'CALCULATION_ABORTED');
  console.log('PASS: actual Chrome module Worker, directed path/no-route, terminate/reload and cancellation; synthetic graph only.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
