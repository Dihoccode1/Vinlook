import sql from 'mssql';
import { config } from './index.js';

let pending: Promise<sql.ConnectionPool> | undefined;

export function getPool(): Promise<sql.ConnectionPool> {
  if (!config.database.password) throw new Error('SQLSERVER_PASSWORD is required');
  pending ??= new sql.ConnectionPool(config.database).connect().then(pool => {
    pool.on('error', () => console.error('SQL Server pool error'));
    return pool;
  }).catch(error => {
    pending = undefined;
    throw error;
  });
  return pending;
}

export async function closePool(): Promise<void> {
  if (pending) await (await pending).close();
  pending = undefined;
}
