import { readFile, readdir } from 'node:fs/promises';
import sql from 'mssql';
import { createHash } from 'node:crypto';
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
      await pool.request().batch(await readFile(new URL('../database/seeds/narrations.sql', import.meta.url), 'utf8'));
      for (const fixture of [
        { slug: 'cho-ben-thanh', file: 'ben-thanh.jpg' },
        { slug: 'dinh-doc-lap', file: 'independence-palace.jpg' },
        { slug: 'buu-dien-trung-tam', file: 'central-post-office.jpg' },
      ]) {
        const content = await readFile(new URL(`../database/seeds/images/${fixture.file}`, import.meta.url));
        if (content.length > 5242880 || content[0] !== 0xff || content[1] !== 0xd8 || content[2] !== 0xff) {
          throw new Error(`Invalid JPEG fixture: ${fixture.file}`);
        }
        await pool.request()
          .input('slug', sql.NVarChar(160), fixture.slug)
          .input('legacy', sql.NVarChar(2048), `/images/pois/${fixture.file}`)
          .input('content', sql.VarBinary(sql.MAX), content)
          .input('hash', sql.Char(64), createHash('sha256').update(content).digest('hex'))
          .query(`INSERT INTO dbo.PoiImages (PoiId, Content, ContentType, Sha256)
            SELECT p.Id, @content, 'image/jpeg', @hash FROM dbo.Pois p
            WHERE p.Slug = @slug AND (p.ImageUrl = @legacy OR p.ImageUrl IS NULL)
              AND NOT EXISTS (SELECT 1 FROM dbo.PoiImages WHERE PoiId = p.Id);
            UPDATE p SET ImageUrl = '/api/pois/' + CONVERT(VARCHAR(36), p.Id) + '/image'
            FROM dbo.Pois p INNER JOIN dbo.PoiImages i ON i.PoiId = p.Id
            WHERE p.Slug = @slug AND (p.ImageUrl = @legacy OR p.ImageUrl IS NULL);`);
      }
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
    // Seed only when absent: rerunning migrations must never reset a password.
    const passwordHash = process.env.ADMIN_PASSWORD_HASH;
    if (passwordHash && /^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(passwordHash)) {
      await pool.request().input('username', sql.NVarChar(100), process.env.ADMIN_USERNAME ?? 'admin')
        .input('hash', sql.VarChar(200), passwordHash).query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username=@username)
            INSERT INTO dbo.Users(Username,PasswordHash,FullName) VALUES(@username,@hash,N'Quản trị viên Vinlook');`);
    }
  } finally { await pool.close(); }
}

main().catch(error => {
  console.error('Database command failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
