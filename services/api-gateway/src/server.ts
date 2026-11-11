import 'dotenv/config';
import { read_port, start_server } from '@vinlook/server/runtime';
import { create_app } from './app.js';
import { close_auth_pool } from './modules/auth/auth-store.js';

start_server({
  app: create_app(),
  port: read_port(process.env.GATEWAY_PORT, 4000, 'GATEWAY_PORT'),
  name: 'API Gateway',
  onClose: close_auth_pool,
});
