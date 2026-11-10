/**
 * @file server.ts
 * @description Điểm khởi động HTTP server cho Navigation Service (cổng mặc định 4002).
 */

import 'dotenv/config';
import { create_app } from './app.js';

const port = Number(process.env.NAVIGATION_PORT ?? 4002);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid NAVIGATION_PORT');
const server = create_app().listen(port, () => console.log(`Navigation service listening on ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    setTimeout(() => process.exit(1), 10000).unref();
    server.close(() => process.exit(0));
  });
}
