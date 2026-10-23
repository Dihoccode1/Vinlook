import assert from 'node:assert/strict';
import { once } from 'node:events';

// Start all service apps concurrently on OS-assigned ports, then close/rebind.
const servers = [];
try {
  for (const name of ['identity', 'content', 'usage']) {
    const { createApp } = await import(`../services/${name}/src/app.js`);
    const server = createApp().listen(0, '127.0.0.1');
    servers.push(server);
    await once(server, 'listening');
    const port = server.address().port;
    const response = await fetch(`http://127.0.0.1:${port}/not-implemented`, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('x-powered-by'), null);
    await response.arrayBuffer();
    console.log(`${name}: independent HTTP listener, unimplemented route returns 404`);
  }
  assert.equal(new Set(servers.map(server => server.address().port)).size, 3);
} finally {
  await Promise.all(servers.map(server => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  })));
}
console.log('All listeners closed. No database/provider requests were made.');
