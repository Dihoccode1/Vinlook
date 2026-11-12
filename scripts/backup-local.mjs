/** Copy-only SQL backups plus a portable snapshot. Never changes source rows. */
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const folder = resolve(root, '.local-deploy/backups', `cloud-source-${Date.now()}`);
await mkdir(folder, { recursive: true });
function docker(args, input) {
  const result = spawnSync('docker', args, {
    input,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error(`Source backup failed: docker ${args[0]}`);
  return result.stdout;
}
const source = `
import sql from 'mssql';
const pool = await sql.connect({server:process.env.SQLSERVER_HOST,port:Number(process.env.SQLSERVER_PORT||1433),user:process.env.SQLSERVER_USER,password:process.env.SQLSERVER_PASSWORD,database:'master',options:{encrypt:true,trustServerCertificate:true},requestTimeout:120000});
const names = [process.env.SQLSERVER_DATABASE||'PoiDb',process.env.TRANSLATION_DATABASE||'TranslationDb'];
const quote = name => '['+name.replaceAll(']',']]')+']';
const databases=[];
const tx = new sql.Transaction(pool); await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
try {
for (const name of names) {
 const tables=(await new sql.Request(tx).query('SELECT name FROM '+quote(name)+'.sys.tables WHERE is_ms_shipped=0 ORDER BY name')).recordset;
 const data={};
 for (const table of tables) data[table.name]=(await new sql.Request(tx).query('SELECT * FROM '+quote(name)+'.dbo.'+quote(table.name)+' WITH(TABLOCK,HOLDLOCK)')).recordset;
 databases.push({name,tables:data});
}
await tx.commit();
} catch(error) { await tx.rollback(); throw error; }
for (const db of databases) {
 const path='/var/opt/mssql/data/vinlook-cloud-source-'+Date.now()+'-'+db.name+'.bak';
 await pool.request().input('path',sql.NVarChar(2048),path).query('BACKUP DATABASE '+quote(db.name)+' TO DISK=@path WITH COPY_ONLY,CHECKSUM; RESTORE VERIFYONLY FROM DISK=@path WITH CHECKSUM;');
 db.backup_path=path;
}
console.log(JSON.stringify({created_at:new Date().toISOString(),databases}));
await pool.close();`;
const output = docker(['exec', '-i', 'vinlook-poi-1', 'node', '--input-type=module'], source);
const snapshot = JSON.parse(output);
await writeFile(resolve(folder, 'snapshot.json'), JSON.stringify(snapshot), {
  flag: 'wx',
  mode: 0o600,
});
for (const db of snapshot.databases) {
  docker(['cp', `vinlook-sqlserver-1:${db.backup_path}`, resolve(folder, `${db.name}.bak`)]);
}
await cp(resolve(root, '.local-deploy/narrations'), resolve(folder, 'narrations'), {
  recursive: true,
}).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
});
await cp(
  resolve(root, 'services/translation-service/storage/narrations'),
  resolve(folder, 'legacy-narrations'),
  { recursive: true },
).catch((error) => {
  if (error.code !== 'ENOENT') throw error;
});
const manifest = {
  created_at: snapshot.created_at,
  snapshot_sha256: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),
  databases: snapshot.databases.map((db) => ({
    name: db.name,
    tables: Object.fromEntries(
      Object.entries(db.tables).map(([name, rows]) => [name, rows.length]),
    ),
  })),
};
await writeFile(resolve(folder, 'manifest.json'), JSON.stringify(manifest, null, 2), {
  flag: 'wx',
});
console.log(JSON.stringify({ folder, ...manifest }, null, 2));
