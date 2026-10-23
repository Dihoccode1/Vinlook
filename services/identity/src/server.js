import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { loadConfig, ConfigurationError } from './config.js';

export function startServer(config = loadConfig()) {
  return createApp().listen(config.port, config.host);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = loadConfig();
    const server = startServer(config);
    server.on('listening', () => console.log('identity process listening'));
    server.on('error', () => { console.error('identity failed to start'); process.exitCode = 1; });
    const shutdown = () => server.close((error) => { process.exitCode = error ? 1 : 0; });
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    console.error(error instanceof ConfigurationError ? error.message : 'identity failed to start');
    process.exitCode = 1;
  }
}
