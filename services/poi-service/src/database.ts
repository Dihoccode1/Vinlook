import { readFile, readdir } from 'node:fs/promises';
import sql from 'mssql';
import { config } from './config/index.js';

async function main() {
  if (!config.database.password) throw new Error('SQLSERVER_PASSWORD is required');
  const command = process.argv[2];
  if (command !== 'migrate' && command !== 'seed') throw new Error('Use migrate or seed');
  const database = config.database.database;
  if (!/^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(database)) throw new Error('Invalid database name');
  if (command === 'migrate') {
    const master = await new sql.ConnectionPool({ ...config.database, database: 'master' }).connect();
    try {
      await master.request().input('name', sql.NVarChar(128), database)
        .query(`IF DB_ID(@name) IS NULL EXEC(N'CREATE DATABASE [${database}]')`);
    } finally { await master.close(); }
  }
  const pool = await new sql.ConnectionPool(config.database).connect();
  try {
    if (command === 'seed') {
      await pool.request().batch(await readFile(new URL('../database/seeds/pois.sql', import.meta.url), 'utf8'));
      console.log('Development POIs seeded');
      return;
    }
    await pool.request().query(`IF OBJECT_ID(N'dbo.SchemaMigrations', N'U') IS NULL
      CREATE TABLE dbo.SchemaMigrations (Name NVARCHAR(255) NOT NULL PRIMARY KEY, AppliedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());`);
    const folder = new URL('../database/migrations/', import.meta.url);
    const files = (await readdir(folder)).filter(name => name.endsWith('.sql')).sort();
    for (const file of files) {
      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        await new sql.Request(tx).query(`DECLARE @result INT;
          EXEC @result = sp_getapplock @Resource = N'poi-schema-migrations', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
          IF @result < 0 THROW 51000, 'Migration lock unavailable', 1;`);
        const applied = await new sql.Request(tx).input('name', sql.NVarChar(255), file)
          .query('SELECT Name FROM dbo.SchemaMigrations WHERE Name = @name');
        if (!applied.recordset.length) {
          await new sql.Request(tx).batch(await readFile(new URL(file, folder), 'utf8'));
          await new sql.Request(tx).input('name', sql.NVarChar(255), file)
            .query('INSERT INTO dbo.SchemaMigrations (Name) VALUES (@name)');
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

main().catch(error => {
  console.error('Database command failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
