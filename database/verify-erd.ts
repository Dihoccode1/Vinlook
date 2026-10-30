import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sql from 'mssql';
import {config as poi} from '../services/poi-service/src/config/index.js';
import {config as translation} from '../services/translation-service/src/config/index.js';

export const expected_poi_tables=['admin_sessions','poi_images','poi_qr_codes','pois','system_logs','usage_events','users','visit_sessions'];
export const expected_translation_tables=['poi_narrations','poi_translations'];
async function main(){
  const manifest=process.argv[2]?JSON.parse(await readFile(process.argv[2],'utf8')):null;
  for(const [config,expected] of [[poi.database,expected_poi_tables],[translation.database,expected_translation_tables]] as const){
    const pool=await new sql.ConnectionPool(config).connect();
    try{
      const rows=(await pool.request().query<{name:string;rows:string}>(`SELECT t.name AS name,CONVERT(VARCHAR(30),SUM(p.rows)) AS rows FROM sys.tables t JOIN sys.partitions p ON p.object_id=t.object_id AND p.index_id IN(0,1) WHERE t.is_ms_shipped=0 GROUP BY t.name ORDER BY t.name`)).recordset;
      assert.deepEqual(rows.map(r=>r.name),expected);
      const before=manifest?.backups.find((b:{database:string})=>b.database===config.database);
      for(const row of rows){
        const old=before?.tables.find((t:{name:string})=>t.name.replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase()===row.name);
        if(old)assert.ok(BigInt(row.rows)>=BigInt(old.rows),`${row.name}: lost rows`);
      }
      const columns=(await pool.request().query('SELECT name FROM sys.columns WHERE object_id IN(SELECT object_id FROM sys.tables WHERE is_ms_shipped=0)')).recordset;
      assert.ok(columns.every(c=>/^[a-z][a-z0-9_]*$/.test(c.name)),'All columns must use snake_case');
      const legacy_ids=(await pool.request().query('SELECT COUNT(*) AS total FROM sys.columns WHERE system_type_id=36 AND object_id IN(SELECT object_id FROM sys.tables WHERE is_ms_shipped=0)')).recordset[0].total;
      assert.equal(legacy_ids,0,'Database IDs must use short codes');
      const entities=config.database===poi.database.database?[['pois','POI'],['users','USR'],['visit_sessions','VST']]:[['poi_translations','TRN'],['poi_narrations','AUD']];
      for(const [table,prefix] of entities){
        const ids=(await pool.request().query(`SELECT id FROM dbo.[${table}]`)).recordset;
        assert.ok(ids.every(row=>new RegExp(`^${prefix}[0-9]{3,20}$`).test(row.id)),`${table}: invalid short ID`);
      }
      const history=(await pool.request().query("SELECT COUNT(*) AS total FROM sys.extended_properties WHERE class=0 AND name LIKE N'Vinlook.Migration.%'")).recordset[0].total;
      assert.equal(history,config.database===poi.database.database?10:4);
      console.log(JSON.stringify({database:config.database,tables:rows,migrations_in_metadata:history}));
    }finally{await pool.close();}
  }
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Verification failed');process.exitCode=1;});
