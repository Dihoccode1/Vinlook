// Test-only process restart probe; accepts only a verified TASK-015 loopback container.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import mongoose from 'mongoose';
import {createDurabilityModels} from '../src/durability/models.js';
import {executeMutation} from '../src/durability/transaction.js';
const name=process.env.VINLOOK_TEST_MONGO_CONTAINER;
assert.match(name??'',/^vinlook-task015-mongo-[A-Za-z0-9_-]+$/);
const [c]=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}));
assert.equal(c.Config.Labels['vinlook.task'],'TASK-015');
assert.equal(c.Config.Image,'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');
const [binding]=c.NetworkSettings.Ports['27017/tcp'];assert.equal(binding.HostIp,'127.0.0.1');assert.match(binding.HostPort,/^[0-9]+$/);
const uri=`mongodb://127.0.0.1:${binding.HostPort}/vinlook_content_task015?replicaSet=vinlook_task015&directConnection=true`;
const connection=await mongoose.createConnection(uri,{autoCreate:false,autoIndex:false,serverSelectionTimeoutMS:3000}).asPromise();
try{
 assert.equal((await connection.db.admin().command({hello:1})).setName,'vinlook_task015');
 const {input,clock}=JSON.parse(process.argv[2]);
 try{const result=await executeMutation(connection,createDurabilityModels(connection),input,()=>{throw Error('Restart must not execute mutation');},()=>clock);process.stdout.write(JSON.stringify(result));}
 catch(error){if(error.code!=='IDEMPOTENCY_RECONCILIATION_REQUIRED')throw error;process.stdout.write(JSON.stringify({code:error.code}));}
}finally{await connection.close();}
