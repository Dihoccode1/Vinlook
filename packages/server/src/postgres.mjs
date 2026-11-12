import pg from 'pg';
import { readFileSync } from 'node:fs';

let pool;
export const uses_postgres = () => Boolean(process.env.DATABASE_URL);
export function get_postgres() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!pool) {
    const url = new URL(process.env.DATABASE_URL);
    const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
    pool = new pg.Pool({
      connectionString: url.toString(),
      max: 5,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 15000,
      statement_timeout: 30000,
      ssl: local
        ? false
        : {
            rejectUnauthorized: true,
            ca: readFileSync(new URL('../certs/supabase-ca-2021.crt', import.meta.url), 'utf8'),
          },
      options: '-c search_path=vinlook,public',
    });
    pool.on('error', () => console.error('PostgreSQL connection error'));
  }
  return pool;
}
export async function query(text, values = []) {
  return get_postgres().query(text, values);
}
export async function transaction(action) {
  const client = await get_postgres().connect();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
export async function close_postgres() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
