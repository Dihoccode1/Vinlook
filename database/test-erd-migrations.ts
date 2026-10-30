import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import sql from 'mssql';
import {config} from '../services/poi-service/src/config/index.js';

const run=promisify(execFile);
async function main(){
  const suffix=randomBytes(6).toString('hex');
  const poi=`VinlookErdCheck_${suffix}_Poi`,translation=`VinlookErdCheck_${suffix}_Translation`;
  const env={...process.env,SQLSERVER_DATABASE:poi,TRANSLATION_DATABASE:translation};
  const cli=new URL('../node_modules/tsx/dist/cli.mjs',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1');
  const master=await new sql.ConnectionPool({...config.database,database:'master'}).connect();
  try{
    for(let pass=0;pass<2;pass++){
      for(const [script,args] of [['services/poi-service/src/database.ts',['migrate']],['services/translation-service/src/database.ts',[]]] as const){
        const result=await run(process.execPath,[cli,'--env-file=.env',script,...args],{env});
        if(pass===1)assert.ok(!result.stdout.includes('Applied '),'Second migration run must not reapply scripts');
      }
      await run(process.execPath,[cli,'--env-file=.env','database/short-ids.ts'],{env});
      await run(process.execPath,[cli,'--env-file=.env','services/poi-service/src/database.ts','seed'],{env});
    }
    const result=await run(process.execPath,[cli,'--env-file=.env','database/verify-erd.ts'],{env});
    console.log(result.stdout.trim());
    console.log('Fresh database migrations and repeat run passed.');
  }finally{
    for(const database of [poi,translation]){
      if(!/^VinlookErdCheck_[a-f0-9]{12}_(Poi|Translation)$/.test(database))throw new Error('Invalid temporary database target');
      await master.request().input('name',sql.NVarChar(128),database).query(`IF DB_ID(@name) IS NOT NULL BEGIN ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]; END`);
    }
    await master.close();
  }
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Migration test failed');process.exitCode=1;});
