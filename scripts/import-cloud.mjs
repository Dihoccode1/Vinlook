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
  'system_logs',
  'admin_sessions',
  'poi_translations',
  'poi_narrations',
];
const code_columns = {
  users: 'user_id',
  pois: 'poi_id',
  poi_images: 'poi_image_id',
  poi_translations: 'poi_translation_id',
  poi_narrations: 'poi_narration_id',
};
const photo_columns = ['image_url', 'image_credit', 'image_source_url', 'image_license_url'];
for (const name of Object.keys(tables)) {
  if (order.includes(name)) continue;
  if (name !== 'visit_sessions' && name !== 'usage_events')
    throw new Error(`Unmapped source table: ${name}`);
  if (tables[name].length) throw new Error(`Cannot import records from retired table: ${name}`);
}
for (const [name, column] of Object.entries(code_columns)) {
  for (const row of tables[name] ?? []) {
    if (!Object.hasOwn(row, 'id')) continue;
    if (Object.hasOwn(row, column) && row.id !== row[column])
      throw new Error(`Conflicting identifiers in backup: ${name}.${column}`);
    row[column] = row.id;
    delete row.id;
  }
}

const images = (tables.poi_images ??= []);
const images_by_poi = Map.groupBy(images, (row) => row.poi_id.toUpperCase());
for (const row of tables.pois ?? []) {
  const metadata = {};
  for (const column of photo_columns) {
    if (Object.hasOwn(row, column)) {
      metadata[column] = row[column];
      delete row[column];
    }
  }
  if (!Object.values(metadata).some((value) => value != null)) continue;
  const existing = images_by_poi.get(row.poi_id.toUpperCase()) ?? [];
  if (existing.length > 1) throw new Error(`Ambiguous photo metadata for POI ${row.poi_id}`);
  if (!existing.length) {
    images.push({ poi_id: row.poi_id, updated_at: row.updated_at, ...metadata });
    continue;
  }
  for (const [column, value] of Object.entries(metadata)) {
    if (Object.hasOwn(existing[0], column) && existing[0][column] !== value)
      throw new Error(`Conflicting photo metadata for POI ${row.poi_id}.${column}`);
    existing[0][column] = value;
  }
}

let maximum_image_id = 0n;
for (const row of images) {
  const code = /^IMG(\d+)$/i.exec(row.poi_image_id ?? '')?.[1];
  if (code && BigInt(code) > maximum_image_id) maximum_image_id = BigInt(code);
}
for (const row of images) {
  if (!Object.hasOwn(row, 'poi_image_id'))
    row.poi_image_id = 'IMG' + String(++maximum_image_id).padStart(3, '0');
}

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
        const columns = Object.keys(row).filter((col) => {
          if (available.has(col)) return true;
          if (name === 'pois' && col === 'slug') return false;
          if (name === 'poi_narrations' && (col === 'file_path' || col === 'duration_seconds')) {
            if (row[col] !== null)
              throw new Error(`Cannot import value from retired column: ${name}.${col}`);
            return false;
          }
          return true;
        });
        for (const col of columns)
          if (!available.has(col)) throw new Error(`Unmapped column: ${name}.${col}`);
        const values = columns.map((col) => decode(row[col]));
        await tx.query(
          `INSERT INTO ${quote(name)}(${columns.map(quote).join(',')}) VALUES(${columns.map((_, i) => '$' + (i + 1)).join(',')})`,
          values,
        );
        // Compare all imported values, including images, audio, and password hashes.
        const primary =
          name === 'admin_sessions'
            ? ['token_hash']
            : name === 'poi_translations' || name === 'poi_narrations'
              ? ['poi_id', 'language_code']
              : [code_columns[name] ?? 'id'];
        const saved = (
          await tx.query(
            `SELECT ${columns.map(quote).join(',')} FROM ${quote(name)}
             WHERE ${primary.map((column, i) => `${quote(column)}=$${i + 1}`).join(' AND ')}`,
            primary.map((column) => row[column]),
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
    for (const [name, column] of Object.entries(code_columns)) {
      const maximum = (
        await tx.query(
          `SELECT COALESCE(max(substring(${quote(column)} COLLATE "C" from '[0-9]+$')::bigint),0)::text AS n FROM ${quote(name)}`,
        )
      ).rows[0].n;
      await tx.query('SELECT setval($1::regclass,$2::bigint,false)', [
        name + '_id_seq',
        String(BigInt(maximum) + 1n),
      ]);
    }
    await tx.query(
      `SELECT setval(pg_get_serial_sequence('vinlook.system_logs','id'),COALESCE((SELECT max(id) FROM system_logs),0)+1,false)`,
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
