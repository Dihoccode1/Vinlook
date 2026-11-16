import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { transaction } from '@vinlook/server/postgres';

const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
const renamed_keys = {
  users: 'user_id',
  pois: 'poi_id',
  poi_translations: 'poi_translation_id',
  poi_narrations: 'poi_narration_id',
};
const photo_metadata = ['image_url', 'image_credit', 'image_source_url', 'image_license_url'];

function fingerprint_sql(columns, source, filter = '') {
  return `SELECT md5(row_to_json(row)::text) AS hash
          FROM (SELECT ${columns.join(',')} FROM ${source} ${filter}) row
          ORDER BY hash`;
}

export async function migrate(folder = new URL('../database/postgres/', import.meta.url)) {
  await transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtext('vinlook-schema-migrations'))");
    await tx.query('CREATE SCHEMA IF NOT EXISTS vinlook');
    await tx.query(
      'CREATE TABLE IF NOT EXISTS vinlook.schema_migrations(name text PRIMARY KEY,sha256 char(64) NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const names = (await readdir(folder)).filter((name) => name.endsWith('.sql')).sort();
    const applied = new Map(
      (await tx.query('SELECT name,sha256 FROM vinlook.schema_migrations')).rows.map((row) => [
        row.name,
        row.sha256,
      ]),
    );
    const drop_slug =
      names.includes('003_drop_poi_slug.sql') && !applied.has('003_drop_poi_slug.sql');
    const unused_migration = '004_drop_unused_usage_schema.sql';
    const drop_unused = names.includes(unused_migration) && !applied.has(unused_migration);
    const poi_migration = '006_apply_poi_schema.sql';
    const apply_poi_schema = names.includes(poi_migration) && !applied.has(poi_migration);
    const retired_tables = ['usage_events', 'visit_sessions'];
    const retired_narration_columns = ['file_path', 'duration_seconds'];
    const existing = (
      await tx.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='vinlook' AND table_type='BASE TABLE' AND table_name<>'schema_migrations' ORDER BY table_name",
      )
    ).rows;
    if (
      (drop_slug || drop_unused || apply_poi_schema) &&
      process.env.VINLOOK_DATASET_ID &&
      existing.some((row) => row.table_name === 'deployment_state')
    ) {
      const identity = (
        await tx.query('SELECT dataset_id FROM vinlook.deployment_state WHERE id=1')
      ).rows[0];
      if (identity?.dataset_id !== process.env.VINLOOK_DATASET_ID)
        throw new Error('Database identity mismatch before schema cleanup');
    }
    const fingerprints = [];
    for (const { table_name: name } of existing) {
      // The cleanup migration locks and verifies these tables are empty before dropping them.
      if (drop_unused && retired_tables.includes(name)) continue;
      // Fixed projection also detects deletion/changes when a migration adds columns.
      const columns = (
        await tx.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema='vinlook' AND table_name=$1 ORDER BY ordinal_position",
          [name],
        )
      ).rows
        .map(({ column_name }) => column_name)
        .filter((column_name) => {
          if (drop_slug && name === 'pois' && column_name === 'slug') return false;
          return !(
            drop_unused &&
            name === 'poi_narrations' &&
            retired_narration_columns.includes(column_name)
          );
        });
      const table = 'vinlook.' + quote(name);
      await tx.query(`LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`);
      const before_sql = fingerprint_sql(columns.map(quote), table);
      let after_sql = before_sql;
      if (apply_poi_schema && Object.hasOwn(renamed_keys, name)) {
        const after_columns = columns.map((column) => {
          if (column === 'id') return `p.${quote(renamed_keys[name])} AS "id"`;
          if (name === 'pois' && photo_metadata.includes(column)) return `f.${quote(column)}`;
          return `p.${quote(column)}`;
        });
        const source =
          name === 'pois'
            ? `${table} p LEFT JOIN vinlook_runtime.poi_photos f ON f.poi_id=p.poi_id`
            : `${table} p`;
        after_sql = fingerprint_sql(after_columns, source);
      }
      if (apply_poi_schema && name === 'poi_images') {
        // Some legacy POIs have URL metadata only. Existing binary rows must match exactly.
        after_sql = fingerprint_sql(columns.map(quote), table, 'WHERE content IS NOT NULL');
      }
      fingerprints.push({ after_sql, before: JSON.stringify((await tx.query(before_sql)).rows) });
    }
    for (const name of names) {
      const source = await readFile(new URL(name, folder), 'utf8');
      const hash = createHash('sha256').update(source).digest('hex');
      const previous = applied.get(name);
      if (previous) {
        if (previous !== hash) throw new Error(`Applied migration was edited: ${name}`);
        continue;
      }
      // Existing application tables are never replaced or silently initialized as another dataset.
      await tx.query(source);
      await tx.query('INSERT INTO vinlook.schema_migrations(name,sha256) VALUES($1,$2)', [
        name,
        hash,
      ]);
    }
    for (const saved of fingerprints)
      if (JSON.stringify((await tx.query(saved.after_sql)).rows) !== saved.before)
        throw new Error(
          'Migration changed existing data. Transaction rolled back; review and back up before a data migration.',
        );
    if (
      drop_slug &&
      (
        await tx.query(
          "SELECT 1 FROM information_schema.columns WHERE table_schema='vinlook' AND table_name='pois' AND column_name='slug'",
        )
      ).rowCount
    )
      throw new Error('Expected migration to remove vinlook.pois.slug');
    if (
      drop_unused &&
      (
        await tx.query(
          `SELECT 1 FROM information_schema.tables WHERE table_schema='vinlook' AND table_name = ANY($1::text[])
         UNION ALL
         SELECT 1 FROM information_schema.columns WHERE table_schema='vinlook' AND table_name='poi_narrations' AND column_name = ANY($2::text[])`,
          [retired_tables, retired_narration_columns],
        )
      ).rowCount
    )
      throw new Error('Expected removal of retired usage tables and narration columns');
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { close_postgres } = await import('@vinlook/server/postgres');
  try {
    await migrate();
    console.log('PostgreSQL migrations complete. No seed was run.');
  } finally {
    await close_postgres();
  }
}
