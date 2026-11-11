import 'dotenv/config';
import { read_port, start_server } from '@vinlook/server/runtime';
import { create_app } from './app.js';

start_server({
  app: create_app(),
  port: read_port(process.env.NAVIGATION_PORT, 4002, 'NAVIGATION_PORT'),
  name: 'Navigation service',
});
