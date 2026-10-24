import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import express from 'express';
import {adapterFixture} from './jobs.integration.test.js';
import {processingManifest,publicationRegistry,hybrid} from '../src/adapters/config.js';
import {createAdapterRunner} from '../src/adapters/runner.js';
import {createGeminiProvider,dispatchHash,providerRequest} from '../src/adapters/provider.js';
import {createJobService} from '../src/jobs/service.js';
import {mp3} from './media-fixtures.js';
const fixture=adapterFixture;
const config=()=>({confirmedAt:fixture().now(),caps:{translation:{rpm:100000,rpd:100000},tts:{rpm:100000,rpd:100000}}});
async function setup({mode='normal',audio=false,hold}={}){
 const f=fixture();await f.models.ProviderControl.deleteMany({});f.runtime.processingManifest=processingManifest;f.runtime.publicationRegistry=publicationRegistry;
 const r=await f.draft(),service=createJobService(f.runtime);await service.process(r.revisionId,{expectedEditVersion:0},f.principal,randomUUID());
 let calls=0;const app=express();app.use(express.json({limit:'12mb'}));app.post(/.*/,async(req,res)=>{calls++;assert.equal(req.get('x-goog-api-key'),'synthetic-key');if(hold)await hold();if(mode==='lost'){req.socket.destroy();return;}if(mode==='quota')return res.status(429).json({error:'synthetic secret'});if(mode==='invalid')return res.json({broken:true});
  if(req.path.endsWith('/interactions'))return res.json({status:'completed',steps:[{type:'model_output',content:[{type:'audio',mime_type:'audio/wav',data:Buffer.from('fixture-wav').toString('base64')}]}]});
  const input=JSON.parse(req.body.contents[0].parts[0].text);return res.json({candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:JSON.stringify({languageCode:input.languageCode,text:'Synthetic translated narration'})}]}}]});
 });const base=await f.listen(app),provider=createGeminiProvider({key:'synthetic-key'},{fetchImpl:(url,o)=>{assert.equal(new URL(url).hostname,'generativelanguage.googleapis.com');return fetch(base+new URL(url).pathname,o);}});
 const options={provider,transcode:async()=>mp3()},runner=createAdapterRunner(f.runtime,config(),options);f.runtime.adapters=runner;
 // Leave a single selected server job eligible; other jobs remain durable for subsequent product processing.
 if(audio){const target='ja';await f.models.LocalizedContent.create({revisionId:r.revisionId,languageCode:target,text:'Synthetic translated narration',sourceVersion:1,textVersion:1,reviewStatus:'pending'});await f.models.ProcessingJob.deleteMany({revisionId:r.revisionId});await service.process(r.revisionId,{expectedEditVersion:1},f.principal,randomUUID());}
 const selected=await f.models.ProcessingJob.findOne({revisionId:r.revisionId,taskType:audio?'audio':'translation','inputSnapshot.execution':'server_adapter',...(audio?{languageCode:'ja'}:{})});
 await f.models.ProcessingJob.updateMany({_id:{$ne:selected._id},status:'queued'},{$set:{status:'failed',error:'STALE_INPUT'}});
 return {...f,r,runner,service,selected,options,calls:()=>calls};
}
test('adapter HTTP admission executes translation once, preserves replay and atomically queues locale audio with audit',async()=>{
 const f=await setup(),key=randomUUID();try{
  const a=await f.request('/admin/jobs/run-next','POST',{}, {'Idempotency-Key':key});assert.equal(a.status,202);await f.runner.idle();const replay=await f.request('/admin/jobs/run-next','POST',{}, {'Idempotency-Key':key});assert.equal(replay.status,202);assert.deepEqual(replay.body.data,a.body.data);assert.equal(f.calls(),1);
  const job=await f.models.ProcessingJob.findById(f.selected._id),call=await f.models.ProviderCall.findOne({jobId:job._id});assert.equal(job.status,'succeeded');assert.equal(call.state,'completed');assert.ok(call.resultHash);assert.equal(await f.models.ProcessingJob.countDocuments({revisionId:f.r.revisionId,languageCode:job.languageCode,taskType:'audio',status:'queued'}),1);assert.equal((await f.models.LocalizedContent.findOne({revisionId:f.r.revisionId,languageCode:job.languageCode})).reviewStatus,'pending');
  assert.equal((await f.request('/admin/jobs/run-next','POST',{url:'https://bad.invalid'},{'Idempotency-Key':randomUUID()})).status,422);
 }finally{await f.runner.close();delete f.runtime.adapters;}
});
test('unknown provider result is quarantined and retry requires explicit resend consent',async()=>{
 const f=await setup({mode:'lost'});try{
  await f.runner.runNext(f.principal,randomUUID());await f.runner.idle();let job=await f.models.ProcessingJob.findById(f.selected._id);assert.equal(job.error,'PROVIDER_OUTCOME_UNKNOWN');assert.equal(f.calls(),1);let rev=await f.models.POIRevision.findById(f.r.revisionId);
  await assert.rejects(f.service.retry(String(job._id),{expectedEditVersion:rev.editVersion},f.principal,randomUUID()),e=>e.code==='PROVIDER_RETRY_CONFIRMATION_REQUIRED');
  await f.service.retry(String(job._id),{expectedEditVersion:rev.editVersion,acknowledgeProviderResend:true},f.principal,randomUUID());f.advance(1000);await f.runner.runNext(f.principal,randomUUID());await f.runner.idle();assert.equal(f.calls(),2);assert.equal(await f.models.ProviderCall.countDocuments({jobId:job._id}),2);
 }finally{await f.runner.close();delete f.runtime.adapters;}
});
test('restart/reclaimed dispatched job never sends provider POST again',async()=>{
 const f=await setup();try{
  const caller={id:'content-gemini-v1',execution:'server_adapter'},claimed=await f.service.claim(caller,['vi']),job=claimed.job; // selected first locale may differ; choose exact selected below.
  const actual=job??(await f.service.claim(caller,[f.selected.languageCode])).job;assert.ok(actual);
  await f.models.ProviderCall.create({jobId:actual.id,retryCount:0,attemptId:actual.attemptId,registryVersion:actual.inputSnapshot.registryVersion,taskType:actual.taskType,modelId:actual.inputSnapshot.modelId,requestHash:dispatchHash(actual,providerRequest(actual)),state:'dispatched',reservedAt:new Date(f.now()),dispatchedAt:new Date(f.now())});
  f.advance(300001);const replacement=createAdapterRunner(f.runtime,config(),f.options);await replacement.runNext(f.principal,randomUUID());await replacement.idle();assert.equal(f.calls(),0);assert.equal((await f.models.ProcessingJob.findById(actual.id)).error,'PROVIDER_OUTCOME_UNKNOWN');await replacement.close();
 }finally{await f.runner.close();delete f.runtime.adapters;}
});
test('global execution lock excludes a second runner while provider is held',async()=>{
 let entered,release;const seen=new Promise(r=>entered=r),held=new Promise(r=>release=r);const f=await setup({hold:async()=>{entered();await held;}}),other=createAdapterRunner(f.runtime,config(),f.options);
 try{await f.runner.runNext(f.principal,randomUUID());await seen;await assert.rejects(other.runNext(f.principal,randomUUID()),e=>e.code==='ADAPTER_BUSY');release();await f.runner.idle();assert.equal(f.calls(),1);}finally{release();await other.close();await f.runner.close();delete f.runtime.adapters;}
});
test('quota reservation survives restart and prevents dispatch at daily cap; 429 never automatically retries',async()=>{
 const f=await setup({mode:'quota'});try{await f.runner.runNext(f.principal,randomUUID());await f.runner.idle();assert.equal(f.calls(),1);assert.equal((await f.models.ProcessingJob.findById(f.selected._id)).status,'waiting_quota');const quota=await f.models.ProviderControl.findOne({key:'quota:translation'});assert.equal(quota.count,1);assert.ok(+quota.cooldownUntil>f.now());
  const revision=await f.models.POIRevision.findById(f.r.revisionId);await f.service.retry(String(f.selected._id),{expectedEditVersion:revision.editVersion},f.principal,randomUUID());await f.runner.runNext(f.principal,randomUUID());await f.runner.idle();assert.equal(f.calls(),1);
 }finally{await f.runner.close();delete f.runtime.adapters;}
});
test('Gemini audio uses existing MP3 media pipeline and publication profile without auto-publishing',async()=>{
 const f=await setup({audio:true});try{await f.runner.runNext(f.principal,randomUUID());await f.runner.idle();const job=await f.models.ProcessingJob.findById(f.selected._id);assert.equal(job.status,'succeeded');assert.equal(f.calls(),1);const row=await f.models.LocalizedContent.findOne({revisionId:f.r.revisionId,languageCode:'ja'});assert.equal(row.audioAsset.voiceOrModelId,hybrid.profiles.ja.id);assert.equal(row.audioAsset.registryVersion,hybrid.registryVersion);assert.equal(row.reviewStatus,'pending');assert.equal((await f.models.POIRevision.findById(f.r.revisionId)).status,'draft');}finally{await f.runner.close();delete f.runtime.adapters;}
});
test('late translated result cannot overwrite a human edit; no result receipt is fabricated',async()=>{
 let entered,release;const seen=new Promise(r=>entered=r),held=new Promise(r=>release=r),f=await setup({hold:async()=>{entered();await held;}});
 try{await f.runner.runNext(f.principal,randomUUID());await seen;await f.models.LocalizedContent.create({revisionId:f.r.revisionId,languageCode:f.selected.languageCode,text:'Human translation',sourceVersion:1,textVersion:1,reviewStatus:'pending'});release();await f.runner.idle();assert.equal((await f.models.LocalizedContent.findOne({revisionId:f.r.revisionId,languageCode:f.selected.languageCode})).text,'Human translation');assert.equal((await f.models.ProcessingJob.findById(f.selected._id)).lastResultHash,null);assert.equal(f.calls(),1);}finally{release();await f.runner.close();delete f.runtime.adapters;}
});
test('local daily quota denies POST and preserves quota counter even for a new runner',async()=>{
 const f=await setup();try{
  await f.models.ProviderControl.create({key:'quota:translation',kind:'quota',day:new Date(f.now()).toISOString().slice(0,10),count:100000});
  const other=createAdapterRunner(f.runtime,config(),f.options);await other.runNext(f.principal,randomUUID());await other.idle();await other.close();assert.equal(f.calls(),0);assert.equal((await f.models.ProcessingJob.findById(f.selected._id)).status,'waiting_quota');assert.equal((await f.models.ProviderControl.findOne({key:'quota:translation'})).count,100000);
 }finally{await f.runner.close();delete f.runtime.adapters;}
});
test('Cloudinary lost upload acknowledgement reconciles the existing intent without another Gemini call',async()=>{
 const f=await setup({audio:true});f.setMediaMode('lost');try{await f.runner.runNext(f.principal,randomUUID());await f.runner.idle();assert.equal(f.calls(),1);const job=await f.models.ProcessingJob.findById(f.selected._id);assert.equal(job.status,'succeeded');const ledger=await f.models.ProviderCall.findOne({jobId:job._id});assert.equal(ledger.state,'completed');assert.ok(ledger.mediaIntentId);}finally{f.setMediaMode('normal');await f.runner.close();delete f.runtime.adapters;}
});
test('result/outbox failure leaves dispatch durable and rolls back translation plus completion ledger',async()=>{
 const f=await setup(),original=f.models.AuditOutbox.create;f.models.AuditOutbox.create=async()=>{throw Error('synthetic result persistence failure');};
 try{await f.runner.runNext(f.principal,randomUUID());await f.runner.idle();assert.equal(f.calls(),1);assert.equal(await f.models.LocalizedContent.countDocuments({revisionId:f.r.revisionId,languageCode:f.selected.languageCode}),0);assert.equal((await f.models.ProviderCall.findOne({jobId:f.selected._id})).state,'dispatched');assert.equal((await f.models.ProcessingJob.findById(f.selected._id)).lastResultHash,null);}finally{f.models.AuditOutbox.create=original;await f.runner.close();delete f.runtime.adapters;}
});
test('disabled adapters preserve API availability and reject runner execution; stale free-tier confirmation blocks admission',async()=>{
 const f=await setup();try{delete f.runtime.adapters;assert.equal((await f.request('/admin/jobs/run-next','POST',{}, {'Idempotency-Key':randomUUID()})).status,503);const expired=createAdapterRunner(f.runtime,{...config(),confirmedAt:f.now()-604800001},f.options);await assert.rejects(expired.runNext(f.principal,randomUUID()),e=>e.code==='ADAPTER_FREE_TIER_REVIEW_REQUIRED');assert.equal(f.calls(),0);await expired.close();}finally{await f.runner.close();delete f.runtime.adapters;}
});
