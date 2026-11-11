import { create_app } from './app.js';
import { config } from './config/index.js';
import { close_pool } from './config/database.js';
import { start_server } from '@vinlook/server/runtime';

start_server({ app: create_app(), port: config.port, name: 'POI service', onClose: close_pool });
