import { pathToFileURL } from 'node:url';
import { createApp } from './app.js';
import { loadContentConfig, connectContentRuntime } from './drafts/runtime.js';
import { loadConfig, ConfigurationError } from './config.js';

export function startServer(config = loadConfig(), runtime) {
  return createApp(runtime).listen(config.port, config.host);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = loadConfig();
    const contentConfig = loadContentConfig(config.mode);
    const runtime = contentConfig ? await connectContentRuntime(contentConfig) : null;
    const server = startServer(config, runtime);
    server.on('listening', () => {
      runtime?.start();
      console.log('content process listening');
    });
    server.on('error', () => {
      runtime?.close().catch(() => {});
      console.error('content failed to start');
      process.exitCode = 1;
    });
    let stopping = false;
    const shutdown = () => {
      if (stopping) return;
      stopping = true;
      server.close(async (error) => {
        try {
          await runtime?.close();
          process.exitCode = error ? 1 : 0;
        } catch {
          process.exitCode = 1;
        }
      });
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    console.error(error instanceof ConfigurationError ? error.message : 'content failed to start');
    process.exitCode = 1;
  }
}
