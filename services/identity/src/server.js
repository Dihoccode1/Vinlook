import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';

export function startServer({ port = 3001, host = '127.0.0.1' } = {}) {
  return createApp().listen(port, host);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = startServer();
  server.on('listening', () => console.log('identity scaffold listening on http://127.0.0.1:3001'));
  server.on('error', () => { console.error('identity failed to start'); process.exitCode = 1; });
  const shutdown = () => server.close((error) => { process.exitCode = error ? 1 : 0; });
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
