import 'dotenv/config';

function port(value: string | undefined, fallback: number) {
  const result = Number(value ?? fallback);
  if (!Number.isInteger(result) || result < 1 || result > 65535) throw new Error('Invalid port configuration');
  return result;
}
export const config = {
  port: port(process.env.TRANSLATION_PORT, 4003),
  database: {
    server: process.env.SQLSERVER_HOST ?? 'localhost', port: port(process.env.SQLSERVER_PORT, 1433),
    database: process.env.TRANSLATION_DATABASE ?? 'TranslationDb',
    user: process.env.TRANSLATION_SQLSERVER_USER ?? process.env.SQLSERVER_USER ?? 'sa',
    password: process.env.TRANSLATION_SQLSERVER_PASSWORD ?? process.env.SQLSERVER_PASSWORD ?? '',
    options: { encrypt: process.env.SQLSERVER_ENCRYPT !== 'false', trustServerCertificate: process.env.SQLSERVER_TRUST_CERTIFICATE === 'true' },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }, connectionTimeout: 5000, requestTimeout: 10000,
  },
};
