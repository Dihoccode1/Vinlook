// Synthetic restart probe; validates exact task container and loopback provider before any I/O.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import mongoose from 'mongoose';
import {createContentModels} from '../src/models/index.js';
import {createDurabilityModels} from '../src/durability/models.js';
import {createMediaModel} from '../src/media/model.js';
import {createCloudinaryAdapter} from '../src/media/provider.js';
import {createMediaService} from '../src/media/service.js';
const name=process.env.VINLOOK_TEST_MONGO_CONTAINER;assert.match(name??'',/^vinlook-task019-mongo-[A-Za-z0-9_-]+$/);
const[c]=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}));assert.equal(c.Config.Labels['vinlook.task'],'TASK-019');assert.equal(c.Config.Image,'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');const[b]=c.NetworkSettings.Ports['27017/tcp'];assert.equal(b.HostIp,'127.0.0.1');assert.match(b.HostPort,/^[0-9]+$/);
const {fixtureBase,id,principal,clock}=JSON.parse(process.argv[2]);const origin=new URL(fixtureBase);assert.equal(origin.origin,fixtureBase);assert.equal(origin.protocol,'http:');assert.equal(origin.hostname,'127.0.0.1');
const uri=`mongodb://127.0.0.1:${b.HostPort}/vinlook_content_task019?replicaSet=vinlook_task019&directConnection=true`;
const connection=await mongoose.createConnection(uri,{autoCreate:false,autoIndex:false,serverSelectionTimeoutMS:3000}).asPromise();
try{assert.equal((await connection.db.admin().command({hello:1})).setName,'vinlook_task019');const models={...createContentModels(connection),...createDurabilityModels(connection),MediaUpload:createMediaModel(connection)};
 const provider=createCloudinaryAdapter({cloud:'fixture_cloud',key:'synthetic-key',secret:'synthetic-secret'},{fetchImpl:(url,options)=>{const u=new URL(url);assert.ok(['api.cloudinary.com','res.cloudinary.com'].includes(u.hostname));return fetch(fixtureBase+u.pathname,options);}});
 const media=createMediaService({models,now:()=>clock},provider,{mode:'test'});const result=await media.reconcile(id,principal);process.stdout.write(JSON.stringify({status:result.status,asset:result.asset}));
}finally{await connection.close();}
