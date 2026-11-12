import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { transaction } from '@vinlook/server/postgres';

export async function migrate(folder = new URL('../database/postgres/', import.meta.url)) {
  await transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock(hashtext('vinlook-schema-migrations'))");
    const existing = (
      await tx.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='vinlook' AND table_type='BASE TABLE' AND table_name<>'schema_migrations' ORDER BY table_name",
      )
    ).rows;
    const fingerprints = [];
    for (const { table_name: name } of existing) {
      // Fixed projection also detects deletion/changes when a migration adds columns.
      const columns = (
        await tx.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema='vinlook' AND table_name=$1 ORDER BY ordinal_position",
          [name],
        )
      ).rows
        .map((row) => '"' + row.column_name.replaceAll('"', '""') + '"')
        .join(',');
      const table = 'vinlook."' + name.replaceAll('"', '""') + '"';
      await tx.query(`LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`);
      const sql = `SELECT md5(row_to_json(row)::text) AS hash FROM (SELECT ${columns} FROM ${table}) row ORDER BY hash`;
      fingerprints.push({ sql, before: JSON.stringify((await tx.query(sql)).rows) });
    }
    await tx.query('CREATE SCHEMA IF NOT EXISTS vinlook');
    await tx.query(
      'CREATE TABLE IF NOT EXISTS vinlook.schema_migrations(name text PRIMARY KEY,sha256 char(64) NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())',
    );
    for (const name of (await readdir(folder)).filter((name) => name.endsWith('.sql')).sort()) {
      const source = await readFile(new URL(name, folder), 'utf8');
      const hash = createHash('sha256').update(source).digest('hex');
      const previous = (
        await tx.query('SELECT sha256 FROM vinlook.schema_migrations WHERE name=$1', [name])
      ).rows[0];
      if (previous) {
        if (previous.sha256 !== hash) throw new Error(`Applied migration was edited: ${name}`);
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
