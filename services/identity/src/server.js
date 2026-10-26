import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { loadConfig, ConfigurationError } from './config/env.js';
import { loadAuthConfig, AuthConfigurationError } from './auth/config.js';
import { connectAuthRuntime } from './config/database.js';
import { loadServiceCredentials } from './authorization.js';

export async function startServer(config = loadConfig(), authConfig = loadAuthConfig(config.mode)) {
  const callers = loadServiceCredentials(authConfig);
  const runtime = await connectAuthRuntime(authConfig);
  try {
    const server = createApp({ ...runtime, callers }).listen(config.port, config.host);
    server.once('close', () => {
      runtime.close().catch(() => {
        process.exitCode = 1;
      });
    });
    server.once('error', () => {
      runtime.close().catch(() => {});
    });
    return server;
  } catch (error) {
    await runtime.close();
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = loadConfig();
    const server = await startServer(config);
    server.on('listening', () => console.log('identity process listening'));
    server.on('error', () => {
      console.error('identity failed to start');
      process.exitCode = 1;
    });
    const shutdown = () =>
      server.close((error) => {
        process.exitCode = error ? 1 : 0;
      });
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    console.error(
      error instanceof ConfigurationError || error instanceof AuthConfigurationError
        ? error.message
        : 'identity failed to start',
    );
    process.exitCode = 1;
  }
}
