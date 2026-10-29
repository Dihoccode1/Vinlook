import {mkdir,writeFile} from 'node:fs/promises';
import sql from 'mssql';
import {config as poi} from '../services/poi-service/src/config/index.js';
import {config as translation} from '../services/translation-service/src/config/index.js';

async function main(){
  const folder=`.local-backups/erd-${Date.now()}`;await mkdir(folder,{recursive:true});
  const backups=[];
  for(const config of [poi.database,translation.database]){
    if(!/^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(config.database))throw new Error('Invalid database name');
    const pool=await new sql.ConnectionPool({...config,requestTimeout:120000}).connect();
    try{
      const tables=(await pool.request().query(`SELECT t.name AS name, SUM(p.rows) AS rows FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN(0,1) WHERE t.is_ms_shipped=0 GROUP BY t.name ORDER BY t.name`)).recordset;
      const file=`${config.database}-${Date.now()}.bak`,container_path=`/var/opt/mssql/data/${file}`;
      await pool.request().input('path',sql.NVarChar(2048),container_path).query(`BACKUP DATABASE [${config.database}] TO DISK=@path WITH COPY_ONLY,CHECKSUM; RESTORE VERIFYONLY FROM DISK=@path WITH CHECKSUM;`);
      backups.push({database:config.database,file,container_path: container_path,tables});
      console.log(`Verified backup: ${config.database}`);
    }finally{await pool.close();}
  }
  await writeFile(`${folder}/manifest.json`,JSON.stringify({created_at:new Date().toISOString(),backups},null,2));
  console.log(`Backup manifest: ${folder}/manifest.json`);
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Backup failed');process.exitCode=1;});
