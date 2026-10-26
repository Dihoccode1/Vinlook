import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { loadConfig, ConfigurationError } from './config.js';
import { loadUsageBusinessConfig, UsageConfigurationError } from './business-config.js';
import { connectUsageRuntime } from './business-runtime.js';

export function startServer(config = loadConfig(), runtime = null) {
  const server = createApp({ runtime }).listen(config.port, config.host);
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.setTimeout(15000, (socket) => socket.destroy());
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let runtime;
  try {
    const config = loadConfig();
    const business = loadUsageBusinessConfig(config.mode);
    runtime = business ? await connectUsageRuntime(business) : null;
    const server = startServer(config, runtime);
    server.on('listening', () => console.log('usage process listening'));
    server.on('error', () => {
      console.error('usage failed to start');
      process.exitCode = 1;
      void runtime?.close().catch(() => {});
    });
    const shutdown = () =>
      server.close(async (error) => {
        await runtime?.close().catch(() => {});
        process.exitCode = error ? 1 : 0;
      });
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    await runtime?.close().catch(() => {});
    console.error(
      error instanceof ConfigurationError || error instanceof UsageConfigurationError
        ? error.message
        : 'usage failed to start',
    );
    process.exitCode = 1;
  }
}
