import { readFile, readdir } from 'node:fs/promises';
import sql from 'mssql';
import { config } from './config/index.js';
async function main() {
  if (!config.database.password) throw new Error('SQLSERVER_PASSWORD is required');
  const database = config.database.database;
  if (!/^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(database)) throw new Error('Invalid database name');
  const master = await new sql.ConnectionPool({ ...config.database, database: 'master' }).connect();
  try {
    await master.request().input('name', sql.NVarChar(128), database)
      .query(`IF DB_ID(@name) IS NULL EXEC(N'CREATE DATABASE [${database}]')`);
  } finally { await master.close(); }
  const pool = await new sql.ConnectionPool(config.database).connect();
  try {
    await pool.request().batch(await readFile(new URL('../../../database/migration-history.sql', import.meta.url), 'utf8'));
    const folder = new URL('../database/migrations/', import.meta.url);
    const files = (await readdir(folder)).filter(name => name.endsWith('.sql')).sort();
    for (const file of files) {
      if (file.length > 110) throw new Error('Migration filename too long');
      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        await new sql.Request(tx).query(`DECLARE @result INT;
          EXEC @result = sp_getapplock @Resource = N'vinlook-schema-migrations', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
          IF @result < 0 THROW 51000, 'Migration lock unavailable', 1;`);
        const applied = await new sql.Request(tx).input('name', sql.NVarChar(128), `Vinlook.Migration.${file}`)
          .query('SELECT name FROM sys.extended_properties WHERE class=0 AND name=@name');
        if (!applied.recordset.length) {
          await new sql.Request(tx).batch(await readFile(new URL(file, folder), 'utf8'));
          await new sql.Request(tx).input('name', sql.NVarChar(128), `Vinlook.Migration.${file}`)
            .query("DECLARE @stamp NVARCHAR(40)=CONVERT(NVARCHAR(40),SYSUTCDATETIME(),126); EXEC sys.sp_addextendedproperty @name=@name,@value=@stamp;");
          console.log(`Applied ${file}`);
        }
        await tx.commit();
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    }
  } finally { await pool.close(); }
}
main().catch(error => { console.error('Translation migration failed:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
