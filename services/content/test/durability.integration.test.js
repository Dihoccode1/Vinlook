import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {randomUUID,randomBytes} from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import {createDurabilityModels} from '../src/durability/models.js';
import {executeMutation} from '../src/durability/transaction.js';
import {createOutboxSender} from '../src/durability/sender.js';
import {createContentModels} from '../src/models/index.js';
import {createIdentityModels} from '../../identity/src/models/index.js';
import {auditHistoryRouter} from '../../identity/src/audit-history.js';
import {loadServiceCredentials} from '../../identity/src/authorization.js';
let connection,models,business,identity,identityModels,uri,server,base,context;
let clock=Date.parse('2026-10-23T12:00:00.000Z');const now=()=>clock;
const key=randomBytes(32).toString('base64url');const id=()=>String(new mongoose.Types.ObjectId());
const envelope=()=>({actorId:context.actorId,workSessionId:context.workSessionId,operation:'poi.create',key:randomUUID(),targetId:null,input:{name:'Synthetic'}});
const event=poiId=>({poiId,action:'poi.create',result:{status:'succeeded',errorCode:null}});
const mutation=async session=>{const [poi]=await business.POI.create([{}],{session});return{status:201,body:{data:{poiId:String(poi._id),status:'draft'}},events:[event(String(poi._id))]};};
async function listen(app){const s=app.listen(0,'127.0.0.1');await once(s,'listening');return s;}
async function close(s){s.closeAllConnections();await new Promise(r=>s.close(r));}
async function isolateRow(row,fn){await models.AuditOutbox.updateMany({deliveredAt:null},{$set:{nextAttemptAt:new Date(clock+100000)}});await models.AuditOutbox.updateOne({_id:row._id},{$set:{nextAttemptAt:new Date(clock)}});return fn();}
before(async()=>{
 const name=process.env.VINLOOK_TEST_MONGO_CONTAINER;assert.match(name??'',/^vinlook-task015-mongo-[A-Za-z0-9_-]+$/);
 const [c]=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}));assert.equal(c.Config.Labels['vinlook.task'],'TASK-015');assert.equal(c.Config.Image,'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');
 const [binding]=c.NetworkSettings.Ports['27017/tcp'];assert.equal(binding.HostIp,'127.0.0.1');assert.match(binding.HostPort,/^[0-9]+$/);
 uri=`mongodb://127.0.0.1:${binding.HostPort}/vinlook_content_task015?replicaSet=vinlook_task015&directConnection=true`;
 connection=await mongoose.createConnection(uri,{autoCreate:false,autoIndex:false,serverSelectionTimeoutMS:3000}).asPromise();assert.equal((await connection.db.listCollections().toArray()).length,0);assert.equal((await connection.db.admin().command({hello:1})).setName,'vinlook_task015');
 models=createDurabilityModels(connection);business=createContentModels(connection);for(const m of [...Object.values(models),...Object.values(business)]){await m.createCollection();await m.createIndexes();}
 identity=await mongoose.createConnection(uri.replace('/vinlook_content_task015?','/vinlook_identity_task015?'),{autoCreate:false,autoIndex:false}).asPromise();assert.equal((await identity.db.listCollections().toArray()).length,0);
 identityModels=createIdentityModels(identity);for(const m of Object.values(identityModels)){await m.createCollection();await m.createIndexes();}
 const staff=await identityModels.StaffAccount.create({fullName:'Synthetic sender',email:'sender@example.invalid',role:'Staff',status:'locked',authVersion:0,passwordHash:'$2b$12$'+'A'.repeat(53)});
 const session=await identityModels.WorkSession.create({staffId:staff._id,workDateVN:'2026-10-22',status:'closed',openedAt:new Date('2026-10-22T01:00:00Z'),closedAt:new Date('2026-10-22T02:00:00Z')});
 context={actorId:String(staff._id),workSessionId:String(session._id)};
 const runtime={models:identityModels,now,config:{origins:[],rateKey:randomBytes(32)},callers:loadServiceCredentials({jwtKey:randomBytes(32),rateKey:randomBytes(32)}, {IDENTITY_CONTENT_SERVICE_KEY_B64URL:key,IDENTITY_USAGE_SERVICE_KEY_B64URL:randomBytes(32).toString('base64url')},clock)};
 const app=express();app.use('/api/v1',auditHistoryRouter(runtime));server=await listen(app);base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{if(server)await close(server);if(identity)await identity.close();if(connection)await connection.close();});
test('actual unique/outbox due indexes and no TTL',async()=>{
 for(const m of Object.values(models)){const indexes=await m.collection.indexes();assert.equal(indexes.length,m.schema.indexes().length+1);assert.ok(indexes.every(i=>i.expireAfterSeconds===undefined));for(const [key,opt]of m.schema.indexes()){const found=indexes.find(i=>JSON.stringify(i.key)===JSON.stringify(key));assert.ok(found);assert.equal(Boolean(found.unique),Boolean(opt.unique));}}
});
test('atomic mutation/event/replay, original session and changed hash conflict',async()=>{
 const input=envelope();const first=await executeMutation(connection,models,input,mutation,now);const second=await executeMutation(connection,models,{...input,workSessionId:id()},()=>{throw Error('Must not rerun');},now);
 assert.equal(first.status,201);assert.equal(second.replayed,true);assert.deepEqual(second.body,first.body);
 const row=await models.AuditOutbox.findOne({'payload.poiId':first.body.data.poiId}).lean();assert.equal(row.payload.workSessionId,input.workSessionId);
 await assert.rejects(executeMutation(connection,models,{...input,input:{name:'changed'}},mutation,now),{code:'IDEMPOTENCY_CONFLICT',status:409});
 assert.equal(await business.POI.countDocuments({_id:first.body.data.poiId}),1);
});
test('callback/outbox validation failure rolls back all records',async()=>{
 for(const invalid of [false,true]){const input=envelope();const before=await business.POI.countDocuments({});
 await assert.rejects(executeMutation(connection,models,input,async s=>{const r=await mutation(s);if(!invalid)throw Error('synthetic rollback');r.events[0].action='operator.reset';return r;},now));
 assert.equal(await business.POI.countDocuments({}),before);assert.equal(await models.IdempotencyRecord.countDocuments({key:input.key}),0);}
});
test('six concurrent same-key requests have one winner; actor scopes differ',async()=>{
 const input=envelope();const results=await Promise.all(Array.from({length:6},()=>executeMutation(connection,models,input,mutation,now)));
 assert.equal(new Set(results.map(r=>r.body.data.poiId)).size,1);assert.equal(await models.IdempotencyRecord.countDocuments({key:input.key}),1);assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':results[0].body.data.poiId}),1);
 const other=await executeMutation(connection,models,{...input,actorId:id()},mutation,now);assert.notEqual(other.body.data.poiId,results[0].body.data.poiId);
});
test('new connection lost-response replay and exact 24h expiry',async()=>{
 const input=envelope();const first=await executeMutation(connection,models,input,mutation,now);
 const fresh=await mongoose.createConnection(uri,{autoCreate:false,autoIndex:false}).asPromise();try{const result=await executeMutation(fresh,createDurabilityModels(fresh),input,()=>{throw Error('rerun');},now);assert.deepEqual(result.body,first.body);}finally{await fresh.close();}
 const start=clock;clock+=86400000-1;assert.equal((await executeMutation(connection,models,input,mutation,now)).replayed,true);clock++;
 const next=await executeMutation(connection,models,{...input,input:{name:'new after expiry'}},mutation,now);assert.equal(next.replayed,false);assert.notEqual(next.body.data.poiId,first.body.data.poiId);clock=start;
});
test('expired durable in_progress quarantines across new connections',async()=>{
 const input=envelope();await models.IdempotencyRecord.create({actorId:input.actorId,operation:input.operation,key:input.key,requestHash:'a'.repeat(64),status:'in_progress',createdAt:new Date(clock-172800000),expiresAt:new Date(clock-86400000)});
 for(let n=0;n<2;n++){const fresh=await mongoose.createConnection(uri,{autoCreate:false,autoIndex:false}).asPromise();try{await assert.rejects(executeMutation(fresh,createDurabilityModels(fresh),input,()=>{assert.fail('Unsafe rerun');},now),{code:'IDEMPOTENCY_RECONCILIATION_REQUIRED'});}finally{await fresh.close();}}
 assert.equal(await models.IdempotencyRecord.countDocuments({key:input.key}),1);
});

test('actual TASK008 receiver accepts delayed locked-actor/closed-session event; lost ack replay has one effect',async()=>{
 const r=await executeMutation(connection,models,envelope(),mutation,now);const row=await models.AuditOutbox.findOne({'payload.poiId':r.body.data.poiId}).lean();const config={baseUrl:base,key};
 await isolateRow(row,()=>createOutboxSender(models.AuditOutbox,config,{now,random:()=>0}).tick());assert.ok((await models.AuditOutbox.findById(row._id)).deliveredAt);assert.equal(await identityModels.AuditLog.countDocuments({eventId:row.eventId}),1);
 await models.AuditOutbox.updateOne({_id:row._id},{$set:{deliveredAt:null,nextAttemptAt:new Date(clock)}});
 await isolateRow(row,()=>createOutboxSender(models.AuditOutbox,config,{now,random:()=>0}).tick());assert.equal(await identityModels.AuditLog.countDocuments({eventId:row.eventId}),1);assert.ok((await models.AuditOutbox.findById(row._id)).deliveredAt);
});
test('HTTP errors/malformed/wrongID/oversize/redirect/timeout stay pending',async()=>{
 let mode='503';const app=express();app.use(express.json());app.post('/api/v1/internal/audit-events',(req,res)=>{
 if(mode==='hang')return;if(mode==='redirect')return res.redirect(307,base+'/api/v1/internal/audit-events');
 if(mode==='oversize')return res.json({x:'x'.repeat(17000)});if(mode==='malformed')return res.type('json').send('{');
 if(mode==='wrong')return res.status(201).json({data:{eventId:randomUUID(),receivedAt:new Date(clock).toISOString()},requestId:randomUUID()});
 return res.status(Number(mode)).json({error:{code:'SAFE',message:'safe',requestId:randomUUID()}});
 });const s=await listen(app);const config={baseUrl:`http://127.0.0.1:${s.address().port}`,key};
 try{for(const variant of ['401','403','409','422','429','503','malformed','wrong','oversize','redirect','hang']){mode=variant;
 const r=await executeMutation(connection,models,envelope(),mutation,now);const row=await models.AuditOutbox.findOne({'payload.poiId':r.body.data.poiId}).lean();
 await isolateRow(row,()=>createOutboxSender(models.AuditOutbox,config,{now,random:()=>0}).tick());const stored=await models.AuditOutbox.findById(row._id).lean();assert.equal(stored.deliveredAt,null);assert.equal(stored.attemptCount,1);assert.equal(+stored.nextAttemptAt,clock+5000);assert.deepEqual(stored.payload,row.payload);
 }}finally{await close(s);}
});
test('backoff/jitter cap and concurrent ack/failure never revert delivered state',async()=>{
 const r=await executeMutation(connection,models,envelope(),mutation,now);const row=await models.AuditOutbox.findOne({'payload.poiId':r.body.data.poiId}).lean();
 const failed=()=>new Response('{}',{status:503,headers:{'content-type':'application/json'}});
 for(let i=1;i<=6;i++){await isolateRow(row,()=>createOutboxSender(models.AuditOutbox,{baseUrl:base,key},{now,random:()=>0.5,fetchImpl:failed}).tick());const stored=await models.AuditOutbox.findById(row._id).lean();assert.equal(+stored.nextAttemptAt,clock+[5000,10000,20000,40000,60000,60000][i-1]*1.1);}
 let release;const wait=new Promise(r=>release=r);let started;const seen=new Promise(r=>started=r);
 await isolateRow(row,async()=>{const pending=createOutboxSender(models.AuditOutbox,{baseUrl:base,key},{now,random:()=>0,fetchImpl:async()=>{started();await wait;return failed();}}).tick();await seen;
 await createOutboxSender(models.AuditOutbox,{baseUrl:base,key},{now,random:()=>0}).tick();release();await pending;});
 assert.ok((await models.AuditOutbox.findById(row._id)).deliveredAt);
});

test('actual fresh Node process replays committed response and quarantines ambiguous state',async()=>{
 const input=envelope();const first=await executeMutation(connection,models,input,mutation,now);
 const child=input=>JSON.parse(execFileSync(process.execPath,[fileURLToPath(new URL('./durability-replay-child.js',import.meta.url)),JSON.stringify({input,clock})],{encoding:'utf8',timeout:15000}));
 const replay=child(input);assert.equal(replay.replayed,true);assert.deepEqual(replay.body,first.body);
 const pending=await models.IdempotencyRecord.findOne({status:'in_progress'}).lean();assert.ok(pending);
 assert.equal(child({...input,key:pending.key}).code,'IDEMPOTENCY_RECONCILIATION_REQUIRED');
});
test('commit succeeded but driver reports unknown outcome replays durable result without duplication',async()=>{
 const input=envelope();let calls=0;
 const wrapper={async startSession(){const s=await connection.startSession();const original=s.withTransaction.bind(s);s.withTransaction=async(...args)=>{await original(...args);const e=new Error('synthetic lost commit acknowledgement');e.hasErrorLabel=label=>label==='UnknownTransactionCommitResult';throw e;};return s;}};
 const result=await executeMutation(wrapper,models,input,async s=>{calls++;return mutation(s);},now);
 assert.equal(result.replayed,true);assert.equal(calls,1);assert.equal(await models.IdempotencyRecord.countDocuments({key:input.key}),1);assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':result.body.data.poiId}),1);
});
test('exhausted counter cannot starve a later due event',async()=>{
 const first=await executeMutation(connection,models,envelope(),mutation,now);const poison=await models.AuditOutbox.findOne({'payload.poiId':first.body.data.poiId});
 await models.AuditOutbox.updateMany({deliveredAt:null},{$set:{nextAttemptAt:new Date(clock+100000)}});
 await models.AuditOutbox.updateOne({_id:poison._id},{$set:{attemptCount:Number.MAX_SAFE_INTEGER,nextAttemptAt:new Date(clock-1)}});
 const second=await executeMutation(connection,models,envelope(),mutation,now);const next=await models.AuditOutbox.findOne({'payload.poiId':second.body.data.poiId});
 const diagnostics=[];await createOutboxSender(models.AuditOutbox,{baseUrl:base,key},{now,random:()=>0,diagnostic:v=>diagnostics.push(v)}).tick();
 assert.ok(diagnostics.some(v=>v.code==='OUTBOX_COUNTER_EXHAUSTED'));assert.ok((await models.AuditOutbox.findById(next._id)).deliveredAt);assert.equal((await models.AuditOutbox.findById(poison._id)).deliveredAt,null);
});
