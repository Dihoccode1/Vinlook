import sql from 'mssql';
import {mkdir,writeFile,cp} from 'node:fs/promises';
import {config as poi} from '../services/poi-service/src/config/index.js';
import {config as translation} from '../services/translation-service/src/config/index.js';

// Coordinated migration: foreign keys and cross-database POI references move together.
const quote=(s:string)=>'['+s.replaceAll(']',']]')+']';
async function main(){
  const pool=await new sql.ConnectionPool({...poi.database,requestTimeout:120000}).connect();
  const tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
  const request=()=>new sql.Request(tx);
  const run=async(db:string,q:string)=>request().batch(`USE ${quote(db)}; ${q}`);
  const dbs=[poi.database.database,translation.database.database];
  const maps=new Map<string,Map<string,string>>();
  const entities=[{db:dbs[0],table:'pois',prefix:'POI'},{db:dbs[0],table:'users',prefix:'USR'},{db:dbs[0],table:'visit_sessions',prefix:'VST'},{db:dbs[1],table:'poi_translations',prefix:'TRN'},{db:dbs[1],table:'poi_narrations',prefix:'AUD'}];
  try{
    await request().query("DECLARE @r INT; EXEC @r=sp_getapplock @Resource='vinlook-short-ids',@LockMode='Exclusive',@LockOwner='Transaction'; IF @r<0 THROW 51000,'Migration lock unavailable',1;");
    const pending=(await run(dbs[0],"SELECT TYPE_NAME(user_type_id) AS type FROM sys.columns WHERE object_id=OBJECT_ID('dbo.pois') AND name='id'")).recordset[0]?.type;
    if(pending==='varchar'){await tx.commit();console.log('Short IDs already applied');return;}
    if(pending!=='uniqueidentifier')throw Error('Unexpected ID schema');
    for(const e of entities){
      const rows=(await run(e.db,`SELECT CONVERT(VARCHAR(36),id) AS id FROM dbo.${quote(e.table)} WITH(TABLOCKX,HOLDLOCK) ORDER BY id`)).recordset;
      maps.set(e.table,new Map(rows.map((r:{id:string},i:number)=>[r.id.toLowerCase(),e.prefix+String(i+1).padStart(3,'0')])));
    }
    const folder=`.local-backups/short-ids-${Date.now()}`;await mkdir(folder,{recursive:true});
    await writeFile(`${folder}/mapping.json`,JSON.stringify(Object.fromEntries([...maps].map(([t,m])=>[t,Object.fromEntries(m)])),null,2));
    // Keep the filesystem audio fallback available under the new public POI code.
    for(const [old_id,new_id] of maps.get('pois')!){
      await cp(`services/translation-service/storage/narrations/${old_id}`,`services/translation-service/storage/narrations/${new_id.toLowerCase()}`,{recursive:true,errorOnExist:false,force:false}).catch(e=>{if(e.code!=='ENOENT')throw e;});
    }
    const restores:{db:string;sql:string}[]=[];
    for(const db of dbs){
      const fks=(await run(db,`SELECT fk.name,t.name AS parent,rt.name AS target,fk.delete_referential_action_desc AS del,fk.update_referential_action_desc AS upd,
        STRING_AGG(CONVERT(NVARCHAR(MAX),QUOTENAME(c.name)),',') WITHIN GROUP(ORDER BY fkc.constraint_column_id) AS cols,
        STRING_AGG(CONVERT(NVARCHAR(MAX),QUOTENAME(rc.name)),',') WITHIN GROUP(ORDER BY fkc.constraint_column_id) AS refs
        FROM sys.foreign_keys fk JOIN sys.tables t ON t.object_id=fk.parent_object_id JOIN sys.tables rt ON rt.object_id=fk.referenced_object_id
        JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id=fk.object_id JOIN sys.columns c ON c.object_id=t.object_id AND c.column_id=fkc.parent_column_id
        JOIN sys.columns rc ON rc.object_id=rt.object_id AND rc.column_id=fkc.referenced_column_id
        GROUP BY fk.name,t.name,rt.name,fk.delete_referential_action_desc,fk.update_referential_action_desc`)).recordset;
      for(const f of fks){await run(db,`ALTER TABLE dbo.${quote(f.parent)} DROP CONSTRAINT ${quote(f.name)}`);restores.push({db,sql:`ALTER TABLE dbo.${quote(f.parent)} WITH CHECK ADD CONSTRAINT ${quote(f.name)} FOREIGN KEY(${f.cols}) REFERENCES dbo.${quote(f.target)}(${f.refs}) ON DELETE ${f.del.replaceAll('_',' ')} ON UPDATE ${f.upd.replaceAll('_',' ')}`});}
    }
    const index_restores:{db:string;sql:string}[]=[];
    for(const db of dbs){
      const indexes=(await run(db,`SELECT t.name AS tbl,i.name,i.is_primary_key,i.is_unique_constraint,i.is_unique,i.type_desc,i.filter_definition,
        STRING_AGG(CONVERT(NVARCHAR(MAX),CASE WHEN ic.is_included_column=0 THEN QUOTENAME(c.name)+CASE WHEN ic.is_descending_key=1 THEN ' DESC' ELSE ' ASC' END END),',') WITHIN GROUP(ORDER BY ic.key_ordinal,ic.index_column_id) AS keys,
        STRING_AGG(CONVERT(NVARCHAR(MAX),CASE WHEN ic.is_included_column=1 THEN QUOTENAME(c.name) END),',') AS included
        FROM sys.tables t JOIN sys.indexes i ON i.object_id=t.object_id JOIN sys.index_columns ic ON ic.object_id=i.object_id AND ic.index_id=i.index_id JOIN sys.columns c ON c.object_id=t.object_id AND c.column_id=ic.column_id
        WHERE i.index_id>0 AND t.is_ms_shipped=0 GROUP BY t.name,i.name,i.is_primary_key,i.is_unique_constraint,i.is_unique,i.type_desc,i.filter_definition`)).recordset;
      for(const i of indexes){
        const table=`dbo.${quote(i.tbl)}`,constraint=i.is_primary_key||i.is_unique_constraint;
        await run(db,constraint?`ALTER TABLE ${table} DROP CONSTRAINT ${quote(i.name)}`:`DROP INDEX ${quote(i.name)} ON ${table}`);
        index_restores.push({db,sql:constraint?`ALTER TABLE ${table} ADD CONSTRAINT ${quote(i.name)} ${i.is_primary_key?'PRIMARY KEY':'UNIQUE'} ${i.type_desc} (${i.keys})`:`CREATE ${i.is_unique?'UNIQUE ':''}${i.type_desc} INDEX ${quote(i.name)} ON ${table}(${i.keys})${i.included?` INCLUDE(${i.included})`:''}${i.filter_definition?` WHERE ${i.filter_definition}`:''}`});
      }
      const columns=(await run(db,`SELECT t.name AS tbl,c.name,c.is_nullable,dc.name AS def FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id LEFT JOIN sys.default_constraints dc ON dc.object_id=c.default_object_id WHERE c.system_type_id=36`)).recordset;
      for(const c of columns){
        if(c.def)await run(db,`ALTER TABLE dbo.${quote(c.tbl)} DROP CONSTRAINT ${quote(c.def)}`);
        await run(db,`ALTER TABLE dbo.${quote(c.tbl)} ALTER COLUMN ${quote(c.name)} VARCHAR(36) ${c.is_nullable?'NULL':'NOT NULL'}`);
        const target=c.name==='id'?c.tbl:c.name==='session_id'?'visit_sessions':['user_id','created_by','updated_by'].includes(c.name)?'users':c.name==='poi_id'?'pois':null;
        const map=target&&maps.get(target);if(!map)throw Error(`Unmapped ID ${c.tbl}.${c.name}`);
        for(const [old_id,new_id] of map){await request().input('old',sql.NVarChar(36),old_id).input('new',sql.NVarChar(36),new_id).batch(`USE ${quote(db)}; UPDATE dbo.${quote(c.tbl)} SET ${quote(c.name)}=@new WHERE ${quote(c.name)}=@old`);}
        const invalid=(await run(db,`SELECT COUNT(*) AS n FROM dbo.${quote(c.tbl)} WHERE ${quote(c.name)} IS NOT NULL AND ${quote(c.name)} LIKE '%-%'`)).recordset[0].n;
        if(invalid)throw Error(`Unmapped rows in ${c.tbl}.${c.name}`);
      }
    }
    for(const e of entities){
      const start=maps.get(e.table)!.size+1;
      await run(e.db,`CREATE SEQUENCE dbo.${quote(e.table+'_id_seq')} AS BIGINT START WITH ${start} INCREMENT BY 1 NO CYCLE;
        ALTER TABLE dbo.${quote(e.table)} ADD CONSTRAINT ${quote('df_'+e.table+'_short_id')} DEFAULT ('${e.prefix}'+FORMAT(NEXT VALUE FOR dbo.${quote(e.table+'_id_seq')},'000')) FOR id;`);
    }
    for(const r of [...index_restores,...restores])await run(r.db,r.sql);
    await run(dbs[0],"UPDATE p SET image_url='/api/pois/'+p.id+'/image' FROM dbo.pois p JOIN dbo.poi_images i ON i.poi_id=p.id");
    await tx.commit();console.log(`Short IDs migrated atomically; mapping: ${folder}/mapping.json`);
  }catch(e){await tx.rollback();throw e;}finally{await pool.close();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Short ID migration failed');process.exitCode=1;});


