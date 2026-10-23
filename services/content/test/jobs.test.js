import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomBytes,randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
import {requestHash} from '../src/durability/validation.js';
import {createJobModel} from '../src/jobs/model.js';
import {manifest,claimInput,resultInput} from '../src/jobs/validation.js';
import {workerConfig,workerPrincipal} from '../src/jobs/credentials.js';
import {languageCodes} from '../src/models/index.js';
const key=()=>randomBytes(32).toString('base64url');
export const registry=()=>({registryVersion:'fixture-v1',languages:Object.fromEntries(languageCodes.map(c=>[c,{audio:{execution:'local_worker',modelId:'synthetic-audio'},translation:c==='en'?null:{execution:'server_adapter',modelId:'synthetic-translation'}}]))});
test('strict manifest captures all16 execution/model routes, excludes English translation and freezes copy',()=>{
 const input=registry(),parsed=manifest(input);assert.ok(parsed);input.languages.en.audio.modelId='changed';assert.equal(parsed.languages.en.audio.modelId,'synthetic-audio');assert.ok(Object.isFrozen(parsed.languages.en));delete input.languages.vi;assert.equal(manifest(input),null);assert.equal(manifest(undefined),null);
});
test('worker credentials require full distinct canonical configuration; old credential has absolute cutoff',()=>{
 const time=Date.parse('2026-10-24T00:00:00Z'),current=key(),old=key(),env={CONTENT_WORKER_ID:'fixture-worker',CONTENT_WORKER_KEY_B64URL:current,CONTENT_WORKER_OLD_KEY_B64URL:old,CONTENT_WORKER_OLD_KEY_EXPIRES_AT:new Date(time+3600000).toISOString()};const config=workerConfig(env,time);
 assert.equal(workerConfig({},time),null);assert.equal(workerPrincipal(config,'fixture-worker',current,time).execution,'local_worker');assert.ok(workerPrincipal(config,'fixture-worker',old,time));assert.throws(()=>workerPrincipal(config,'fixture-worker',old,time+3600000),e=>e.status===401);
 for(const value of [{CONTENT_WORKER_ID:'x'},{...env,CONTENT_IDENTITY_SERVICE_KEY_B64URL:current},{...env,CONTENT_PUBLIC_CURSOR_KEY_B64URL:old},{...env,CONTENT_WORKER_OLD_KEY_EXPIRES_AT:new Date(time+86400001).toISOString()}])assert.throws(()=>workerConfig(value,time),{message:'Invalid worker configuration'});
 assert.throws(()=>workerPrincipal(config,'other',current,time),e=>e.status===401);
});
test('result and claim inputs forbid raw URLs, caller privilege injection and duplicate capabilities',()=>{
 assert.ok(claimInput.safeParse({workerId:'worker',capabilities:['en']}).success);assert.equal(claimInput.safeParse({workerId:'worker',capabilities:['en','en']}).success,false);
 const input={attemptId:randomUUID(),inputVersion:{sourceVersion:1,textVersion:null,targetTextVersion:null,targetSourceVersion:null},outcome:{status:'succeeded',text:'Synthetic'}};assert.ok(resultInput.safeParse(input).success);
 assert.equal(resultInput.safeParse({...input,outcome:{status:'succeeded',url:'https://evil.invalid/a.mp3'}}).success,false);assert.equal(resultInput.safeParse({...input,actorId:'spoof'}).success,false);
});
test('ProcessingJob schema has strict snapshots, single working index and paired state without TTL',async()=>{
 const connection=mongoose.createConnection(),Job=createJobModel(connection),id=()=>new mongoose.Types.ObjectId();
 const value={poiId:id(),revisionId:id(),requestedBy:id(),workSessionId:id(),languageCode:'en',taskType:'audio',status:'queued',inputVersion:{sourceVersion:1,textVersion:1,targetTextVersion:null,targetSourceVersion:null},inputSnapshot:{text:'Synthetic',registryVersion:'fixture-v1',modelId:'synthetic-audio',execution:'local_worker'},inputHash:'a'.repeat(64),reclaimCount:0,retryCount:0};
 value.inputHash=requestHash({taskType:value.taskType,languageCode:value.languageCode,inputVersion:value.inputVersion,inputSnapshot:value.inputSnapshot});await new Job(value).validate();for(const patch of [{reclaimCount:4},{status:'running'},{inputVersion:{...value.inputVersion,textVersion:null}},{status:'succeeded'}])await assert.rejects(new Job({...value,...patch}).validate());
 assert.throws(()=>new Job({...value,secret:'not allowed'}));const indexes=Job.schema.indexes();assert.equal(indexes.length,4);assert.ok(indexes.every(([,v])=>v.expireAfterSeconds===undefined));assert.deepEqual(indexes.find(([,v])=>v.unique)[1].partialFilterExpression,{status:{$in:['queued','running']}});await connection.close();
});
