/** One-time, verified import into an EMPTY target. Source SQL/backup is never modified. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { query, transaction, close_postgres } from '@vinlook/server/postgres';
import { migrate } from './cloud-migrate.mjs';

const folder = resolve(process.argv[2] || '');
if (!process.argv[2]) throw new Error('Pass the source backup folder');
const snapshot = JSON.parse(await readFile(resolve(folder, 'snapshot.json'), 'utf8'));
const manifest = JSON.parse(await readFile(resolve(folder, 'manifest.json'), 'utf8'));
const hash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
if (hash !== manifest.snapshot_sha256) throw new Error('Source snapshot checksum does not match');
const tables = Object.assign({}, ...snapshot.databases.map((db) => db.tables));
const order = [
  'users',
  'pois',
  'poi_images',
  'visit_sessions',
  'usage_events',
  'system_logs',
  'admin_sessions',
  'poi_translations',
  'poi_narrations',
];
for (const name of Object.keys(tables))
  if (!order.includes(name)) throw new Error(`Unmapped source table: ${name}`);
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
const decode = (value) =>
  value?.type === 'Buffer' && Array.isArray(value.data) ? Buffer.from(value.data) : value;
function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return { type: 'Buffer', data: [...value] };
  return value;
}
try {
  await migrate();
  const dataset = randomUUID();
  await transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtext('vinlook-cloud-import'))");
    if ((await tx.query('SELECT id FROM deployment_state')).rows.length)
      throw new Error('Target dataset already exists. Import refused.');
    for (const name of order)
      if ((await tx.query(`SELECT 1 FROM ${quote(name)} LIMIT 1`)).rows.length)
        throw new Error(`Target is not empty: ${name}`);
    for (const name of order) {
      const available = new Set(
        (
          await tx.query(
            'SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',
            ['vinlook', name],
          )
        ).rows.map((row) => row.column_name),
      );
      for (const row of tables[name] || []) {
        const columns = Object.keys(row);
        for (const col of columns)
          if (!available.has(col)) throw new Error(`Unmapped column: ${name}.${col}`);
        const values = columns.map((col) => decode(row[col]));
        await tx.query(
          `INSERT INTO ${quote(name)}(${columns.map(quote).join(',')}) VALUES(${columns.map((_, i) => '$' + (i + 1)).join(',')})`,
          values,
        );
        // Compare every source column, not just the count; includes binary images/audio and password hashes.
        const primary =
          name === 'poi_images'
            ? ['poi_id']
            : name === 'admin_sessions'
              ? ['token_hash']
              : ['poi_translations', 'poi_narrations'].includes(name)
                ? ['poi_id', 'language_code']
                : ['id'];
        const saved = (
          await tx.query(
            `SELECT ${columns.map(quote).join(',')} FROM ${quote(name)} WHERE ${primary.map((col, i) => quote(col) + '=$' + (i + 1)).join(' AND ')}`,
            primary.map((col) => row[col]),
          )
        ).rows[0];
        for (const col of columns) {
          const actual = canonical(saved[col]),
            expected = row[col];
          // pg returns bigint as a string to preserve precision.
          if (
            typeof expected === 'number' &&
            typeof actual === 'string' &&
            actual === String(expected)
          )
            continue;
          if (JSON.stringify(actual) !== JSON.stringify(expected))
            throw new Error(`Imported value mismatch: ${name}.${col}`);
        }
      }
      const count = (await tx.query(`SELECT count(*)::int AS total FROM ${quote(name)}`)).rows[0]
        .total;
      if (count !== (tables[name] || []).length)
        throw new Error(`Imported row count mismatch: ${name}`);
    }
    for (const name of ['users', 'pois', 'visit_sessions', 'poi_translations', 'poi_narrations']) {
      const maximum = (
        await tx.query(
          `SELECT COALESCE(max(substring(id COLLATE "C" from '[0-9]+$')::bigint),0)::text AS n FROM ${quote(name)}`,
        )
      ).rows[0].n;
      await tx.query('SELECT setval($1::regclass,$2::bigint,false)', [
        name + '_id_seq',
        String(BigInt(maximum) + 1n),
      ]);
    }
    for (const name of ['usage_events', 'system_logs'])
      await tx.query(
        `SELECT setval(pg_get_serial_sequence($1,'id'),COALESCE((SELECT max(id) FROM ${quote(name)}),0)+1,false)`,
        ['vinlook.' + name],
      );
    await tx.query('INSERT INTO deployment_state(id,dataset_id,source_sha256) VALUES(1,$1,$2)', [
      dataset,
      hash,
    ]);
  });
  if (!process.argv.includes('--check-local')) {
    const envFile = resolve(import.meta.dirname, '../.env.cloud');
    const env = await readFile(envFile, 'utf8');
    await writeFile(
      envFile,
      env.replace(/^VINLOOK_DATASET_ID=.*$/m, `VINLOOK_DATASET_ID=${dataset}`),
      { mode: 0o600 },
    );
  }
  await writeFile(
    resolve(
      folder,
      process.argv.includes('--check-local') ? 'local-test-receipt.json' : 'import-receipt.json',
    ),
    JSON.stringify(
      {
        dataset_id: dataset,
        source_sha256: hash,
        verified_at: new Date().toISOString(),
        tables: manifest.databases,
      },
      null,
      2,
    ),
    { flag: 'wx' },
  );
  console.log(
    process.argv.includes('--check-local')
      ? 'All source tables and values verified locally. Cloud env was not changed.'
      : 'All source tables and values verified. Dataset identity saved to ignored .env.cloud.',
  );
} finally {
  await close_postgres();
}
