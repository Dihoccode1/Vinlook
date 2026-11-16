import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { transaction } from '@vinlook/server/postgres';

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
    const retired_tables = ['usage_events', 'visit_sessions'];
    const retired_narration_columns = ['file_path', 'duration_seconds'];
    const existing = (
      await tx.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='vinlook' AND table_type='BASE TABLE' AND table_name<>'schema_migrations' ORDER BY table_name",
      )
    ).rows;
    if (
      (drop_slug || drop_unused) &&
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
        .filter(({ column_name }) => {
          if (drop_slug && name === 'pois' && column_name === 'slug') return false;
          return !(
            drop_unused &&
            name === 'poi_narrations' &&
            retired_narration_columns.includes(column_name)
          );
        })
        .map((row) => '"' + row.column_name.replaceAll('"', '""') + '"')
        .join(',');
      const table = 'vinlook."' + name.replaceAll('"', '""') + '"';
      await tx.query(`LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`);
      const sql = `SELECT md5(row_to_json(row)::text) AS hash FROM (SELECT ${columns} FROM ${table}) row ORDER BY hash`;
      fingerprints.push({ sql, before: JSON.stringify((await tx.query(sql)).rows) });
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
      if (JSON.stringify((await tx.query(saved.sql)).rows) !== saved.before)
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
