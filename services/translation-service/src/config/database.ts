import sql from 'mssql';
import { config } from './index.js';
let pending: Promise<sql.ConnectionPool> | undefined;
export function get_pool() {
  if (!config.database.password) throw new Error('Translation database password is required');
  pending ??= new sql.ConnectionPool(config.database).connect().then(pool => {
    pool.on('error', () => console.error('Translation database pool error'));
    return pool;
  }).catch(error => { pending = undefined; throw error; });
  return pending;
}
export async function close_pool() { if (pending) await (await pending).close(); pending = undefined; }
