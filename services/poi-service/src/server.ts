import { create_app } from './app.js';
import { config } from './config/index.js';
import { close_pool } from './config/database.js';

const server = create_app().listen(config.port, () => console.log(`POI service listening on ${config.port}`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(() => { void close_pool().finally(() => process.exit(0)); });
  });
}
