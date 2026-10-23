import assert from 'node:assert/strict';
import {test} from 'node:test';
import mongoose from 'mongoose';
import {randomUUID,randomBytes} from 'node:crypto';
import {createDurabilityModels} from '../src/durability/models.js';
import {canonical,requestHash,eventSchema,resultSchema} from '../src/durability/validation.js';
import {loadOutboxConfig,createOutboxSender} from '../src/durability/sender.js';
const id=()=>String(new mongoose.Types.ObjectId());
const at=new Date('2026-10-23T12:00:00.000Z');
const event=()=>({eventId:randomUUID(),actorId:id(),workSessionId:id(),poiId:id(),action:'poi.create',occurredAt:at.toISOString(),result:{status:'succeeded',errorCode:null}});
const connection=mongoose.createConnection(); const models=createDurabilityModels(connection);
test('disconnected factories use owned strict schemas/indexes without TTL or implicit connection',()=>{
 assert.equal(connection.readyState,0);assert.equal(createDurabilityModels(connection).AuditOutbox,models.AuditOutbox);
 for(const m of Object.values(models)){assert.equal(m.schema.options.strict,'throw');assert.equal(m.schema.options.autoIndex,false);assert.equal(m.schema.options.versionKey,false);assert.ok(m.schema.indexes().every(([,o])=>o.expireAfterSeconds===undefined));}
 assert.equal(models.AuditOutbox.collection.name,'audit_outboxes');assert.equal(models.IdempotencyRecord.collection.name,'idempotency_records');
});
test('outbox validates exact event, paired result, UUID and noncoerced counter',async()=>{
 const e=event();await new models.AuditOutbox({eventId:e.eventId,payload:e,createdAt:at,nextAttemptAt:at,attemptCount:0}).validate();
 for(const patch of [{eventId:randomUUID()},{attemptCount:'1'},{attemptCount:-1},{payload:{...e,token:'secret'}},{payload:{...e,action:'operator.reset'}},{payload:{...e,result:{status:'succeeded',errorCode:'CONFLICT'}}}])await assert.rejects(new models.AuditOutbox({eventId:e.eventId,payload:e,createdAt:at,nextAttemptAt:at,attemptCount:0,...patch}).validate());
});
test('idempotency state/24h/strict minimal response and safe integers',async()=>{
 const value={actorId:id(),operation:'poi.create',key:randomUUID(),requestHash:'a'.repeat(64),status:'in_progress',createdAt:at,expiresAt:new Date(+at+86400000)};
 await new models.IdempotencyRecord(value).validate();
 await new models.IdempotencyRecord({...value,status:'completed',responseStatus:201,responseBody:{data:{poiId:id(),status:'draft'}}}).validate();
 for(const patch of [{expiresAt:at},{status:'completed'},{responseStatus:200},{status:'completed',responseStatus:200,responseBody:{data:{status:'draft'}}},{operation:'unknown'}])await assert.rejects(new models.IdempotencyRecord({...value,...patch}).validate());
 assert.equal(resultSchema.safeParse({data:{poiId:id(),token:'secret'}}).success,false);
 assert.equal(resultSchema.safeParse({data:{poiId:id(),editVersion:Number.MAX_SAFE_INTEGER+1}}).success,false);
});
test('canonical hash ignores object order, retains arrays/types and rejects nonJSON/cycles',()=>{
 assert.equal(requestHash({b:2,a:[1,'1']}),requestHash({a:[1,'1'],b:2}));assert.notEqual(requestHash([1,2]),requestHash([2,1]));assert.notEqual(requestHash(1),requestHash('1'));
 const cycle={};cycle.self=cycle;for(const v of [undefined,NaN,Infinity,new Date(),cycle,[,1],{x:undefined}])assert.throws(()=>canonical(v),{code:'INVALID_MUTATION_INPUT'});
});
test('sender config reuses scoped key and exact production HTTPS origin',()=>{
 const key=randomBytes(32).toString('base64url');const env={CONTENT_IDENTITY_SERVICE_KEY_B64URL:key,IDENTITY_BASE_URL:'https://identity.example.invalid'};
 assert.equal(loadOutboxConfig('production',env).key,key);
 for(const url of ['http://identity.example.invalid','https://x.invalid/path','https://u:p@x.invalid','https://x.invalid?secret=x'])assert.throws(()=>loadOutboxConfig('production',{...env,IDENTITY_BASE_URL:url}));
});
test('sender import/start/stop lifecycle is explicit and empty polls serialize',async()=>{
 let reads=0;let schedule;let cancelled=false;
 const Model={exists:async()=>null,findOne(){reads++;return{sort(){return{lean:async()=>null};}};}};
 const sender=createOutboxSender(Model,{}, {setTimer(fn){schedule=fn;return 1;},clearTimer(){cancelled=true;}});
 assert.equal(reads,0);sender.start();await new Promise(r=>setImmediate(r));assert.equal(reads,1);assert.equal(typeof schedule,'function');await sender.stop();assert.equal(cancelled,true);schedule();assert.equal(reads,1);
});
