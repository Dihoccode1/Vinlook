import 'dotenv/config';
import { createApp } from './app.js';

const port = Number(process.env.GATEWAY_PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid GATEWAY_PORT');
const server = createApp().listen(port, () => console.log(`API Gateway listening on ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    setTimeout(() => process.exit(1), 10000).unref();
    server.close(() => process.exit(0));
  });
}
