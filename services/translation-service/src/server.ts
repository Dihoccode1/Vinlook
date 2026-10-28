import { config } from './config/index.js';
import { closePool } from './config/database.js';
import { createApp } from './app.js';
const server = createApp().listen(config.port, () => console.log(`Translation service listening on ${config.port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  setTimeout(() => process.exit(1), 10000).unref();
  server.close(() => { void closePool().finally(() => process.exit(0)); });
});
