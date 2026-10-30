import { config } from './config/index.js';
import { close_pool } from './config/database.js';
import { create_app } from './app.js';
const server = create_app().listen(config.port, () => console.log(`Translation service listening on ${config.port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  setTimeout(() => process.exit(1), 10000).unref();
  server.close(() => { void close_pool().finally(() => process.exit(0)); });
});
