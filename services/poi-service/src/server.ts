import { createApp } from './app.js';
import { config } from './config/index.js';
import { closePool } from './config/database.js';

const server = createApp().listen(config.port, () => console.log(`POI service listening on ${config.port}`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(() => { void closePool().finally(() => process.exit(0)); });
  });
}
