import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {randomBytes,randomUUID} from 'node:crypto';
import mongoose from 'mongoose';
import {createContentModels} from '../src/models/index.js';
import {createDurabilityModels} from '../src/durability/models.js';
import {verifyContentCatalog,loadContentConfig,connectContentRuntime} from '../src/drafts/runtime.js';
import {createApp} from '../src/app.js';
import {createOutboxSender} from '../src/durability/sender.js';
import {createIdentityModels} from '../../identity/src/models/index.js';
import {createAuthRuntime} from '../../identity/src/auth/runtime.js';
import {issueToken} from '../../identity/src/auth/token.js';
import {loadServiceCredentials} from '../../identity/src/authorization.js';
import {createApp as identityApp} from '../../identity/src/app.js';
import {asset,approved} from './fixtures.js';
import express from 'express';
import {languageCodes} from '../src/models/index.js';
import {createMediaModel} from '../src/media/model.js';
import {createMediaService} from '../src/media/service.js';
import {createCloudinaryAdapter,digest,originalUrl} from '../src/media/provider.js';
import {createPublicationService} from '../src/publication/service.js';
import {mp3} from './media-fixtures.js';
import sharp from 'sharp';
let connection,identity,models,im,staff,session,token,base,identityBase,runtime,uri,clock=Date.parse('2026-10-23T12:00:00.000Z');
const servers=[],now=()=>clock,key=()=>randomBytes(32).toString('base64url');const contentKey=key();
const input=()=>({nameEN:'Synthetic museum',sourceTextEN:'English source',location:{type:'Point',coordinates:[106.7,10.78]}});
async function listen(app){const s=app.listen(0,'127.0.0.1');servers.push(s);await once(s,'listening');return`http://127.0.0.1:${s.address().port}`;}
async function request(path,method='GET',body,headers={}){
 const response=await fetch(base+'/api/v1'+path,{method,headers:{Authorization:'Bearer '+token,...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});
 const result=await response.json();assert.equal(response.headers.get('cache-control'),'no-store');assert.match(result.requestId??result.error?.requestId,/^[a-f0-9-]{36}$/);assert.equal(JSON.stringify(result).includes('passwordHash'),false);return{status:response.status,body:result,headers:response.headers};
}
const create=(value=input(),uuid=randomUUID())=>request('/admin/pois','POST',value,{'Idempotency-Key':uuid});
const assets=new Map(),providerConfig={cloud:'fixture_cloud',key:'synthetic-key',secret:'synthetic-secret'};
let providerMode='normal',providerCalls=0,held,release,identityConfig;
const manifest=()=>({registryVersion:'fixture-registry-v1',languages:Object.fromEntries(languageCodes.map(code=>[code,{voiceOrModelId:'synthetic-model'}]))});
const context=()=>({deadline:Date.now()+60000,signal:new AbortController().signal});
async function media(poiId,revisionId,code=null){
 const bytes=code?mp3():await sharp({create:{width:8,height:8,channels:3,background:'white'}}).webp().toBuffer();
 const uploadId=randomUUID(),publicId=`vinlook/test/${poiId}/${revisionId}/${code?'audio':'thumbnail'}/${uploadId}`;
 const duration=code?Math.floor(bytes.length/208)*1152/44100:null;
 const fields={uploadId,kind:code?'audio':'thumbnail',poiId,revisionId,actorId:staff._id,workSessionId:session._id,expectedEditVersion:0,publicId,resourceType:code?'video':'image',status:'verified',createdAt:new Date(clock),expiresAt:new Date(clock+900000),startedAt:new Date(clock),finishedAt:new Date(clock),format:code?'mp3':'webp',sha256:digest(bytes),bytes:bytes.length,providerVersion:7,providerAssetId:'fixture-'+uploadId,...(code?{jobId:new mongoose.Types.ObjectId(),sourceVersion:1,textVersion:1,languageCode:code,registryVersion:'fixture-registry-v1',voiceOrModelId:'synthetic-model',durationSeconds:duration,bitrate:64000}:{width:8,height:8})};
 fields.url=originalUrl(providerConfig,fields);
 const row=await models.MediaUpload.create(fields);
 assets.set(publicId,{bytes,metadata:{public_id:publicId,resource_type:fields.resourceType,type:'upload',format:fields.format,version:7,asset_id:fields.providerAssetId,bytes:bytes.length,created_at:new Date(clock).toISOString(),...(code?{duration,audio:{channels:1}}:{width:8,height:8})}});
 return {ref:{publicId,url:fields.url,format:fields.format,...(code?{textVersion:1,registryVersion:'fixture-registry-v1',voiceOrModelId:'synthetic-model'}:{})},duration,row};
}
async function complete(status='draft'){
 const r=await create();assert.equal(r.status,201);const {poiId,revisionId}=r.body.data;
 const image=await media(poiId,revisionId);
 await models.POIRevision.updateOne({_id:revisionId},{$set:{entrance:input().location,thumbnailAsset:image.ref,status}});
 for(const code of languageCodes){const a=await media(poiId,revisionId,code);await models.LocalizedContent.findOneAndUpdate({revisionId,languageCode:code},{$set:approved({revisionId,languageCode:code,text:code==='en'?input().sourceTextEN:'Synthetic '+code,audioAsset:a.ref,durationSeconds:a.duration,reviewedBy:staff._id})},{upsert:true,returnDocument:'after'});}
 return {poiId,revisionId};
}
const action=(id,op,version=0,extra={},key=randomUUID())=>request(`/admin/revisions/${id}/${op}`,'POST',{expectedEditVersion:version,...extra},{'Idempotency-Key':key});
const publish=(r,version=0,key=randomUUID(),pointer=null)=>action(r.revisionId,'publish',version,{expectedPublishedRevisionId:pointer,confirmGeography:true},key);
async function role(value){await im.StaffAccount.updateOne({_id:staff._id},{$set:{role:value}});}
const patch=(id,version,changes)=>request('/admin/revisions/'+id,'PATCH',{expectedEditVersion:version,changes});
const language=(id,version,text,code='vi')=>request(`/admin/revisions/${id}/languages/${code}`,'PATCH',{expectedEditVersion:version,text});
before(async()=>{
 const name=process.env.VINLOOK_TEST_MONGO_CONTAINER;assert.match(name??'',/^vinlook-task013-mongo-[A-Za-z0-9_-]+$/);
 const [c]=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}));assert.equal(c.Config.Labels['vinlook.task'],'TASK-013');assert.equal(c.Config.Image,'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');const[binding]=c.NetworkSettings.Ports['27017/tcp'];assert.equal(binding.HostIp,'127.0.0.1');assert.match(binding.HostPort,/^[0-9]+$/);
 uri=`mongodb://127.0.0.1:${binding.HostPort}/vinlook_content_task013?replicaSet=vinlook_task013&directConnection=true`;
 connection=await mongoose.createConnection(uri,{autoCreate:false,autoIndex:false,serverSelectionTimeoutMS:3000}).asPromise();assert.equal((await connection.db.listCollections().toArray()).length,0);assert.equal((await connection.db.admin().command({hello:1})).setName,'vinlook_task013');models={...createContentModels(connection),...createDurabilityModels(connection),MediaUpload:createMediaModel(connection)};
 for(const m of Object.values(models)){await m.createCollection();await m.createIndexes();}
 identity=await mongoose.createConnection(uri.replace('/vinlook_content_task013?','/vinlook_identity_task013?'),{autoCreate:false,autoIndex:false}).asPromise();assert.equal((await identity.db.listCollections().toArray()).length,0);im=createIdentityModels(identity);for(const m of Object.values(im)){await m.createCollection();await m.createIndexes();}
 const config={jwtKey:randomBytes(32),rateKey:randomBytes(32),origins:['https://web.example.invalid'],proxyCidrs:[],issuer:'vinlook-identity:test',audience:'vinlook-staff:test'};
 identityConfig=config;const ir={...await createAuthRuntime(im,config,now),callers:loadServiceCredentials(config,{IDENTITY_CONTENT_SERVICE_KEY_B64URL:contentKey,IDENTITY_USAGE_SERVICE_KEY_B64URL:key()},clock)};
 staff=await im.StaffAccount.create({fullName:'Synthetic editor',email:'editor@example.invalid',role:'Staff',status:'active',authVersion:0,passwordHash:'$2b$12$'+'A'.repeat(53)});
 session=await im.WorkSession.create({staffId:staff._id,workDateVN:'2026-10-23',status:'open',openedAt:new Date(clock-1000)});token=await issueToken(staff,config,clock);identityBase=await listen(identityApp(ir));
 const provider=express();provider.use(async(req,res)=>{
  providerCalls++;
  if(providerMode==='fail')return res.status(503).json({error:{message:'synthetic secret error'}});
  if(providerMode==='redirect')return res.redirect('http://127.0.0.1:1/forbidden');
  if(providerMode==='hold'){held();await new Promise(r=>release=r);}
  if(req.path.includes('/resources/')){
   const id=decodeURIComponent(req.path.split('/upload/')[1]),a=assets.get(id);if(!a)return res.status(404).json({error:{}});return res.json(a.metadata);
  }
  const id=req.path.split('/upload/v7/')[1]?.replace(/\.(webp|mp3)$/,'');const a=assets.get(id);if(!a)return res.status(404).end();res.end(providerMode==='corrupt'?Buffer.from('corrupt'):a.bytes);
 });const fixture=await listen(provider);
 const transport=(url,options)=>{assert.ok(url.startsWith('https://api.cloudinary.com/v1_1/fixture_cloud/')||url.startsWith('https://res.cloudinary.com/fixture_cloud/'));assert.notEqual(options.method,'POST');return fetch(fixture+new URL(url).pathname,options);};
 runtime={connection,models,authorization:{baseUrl:identityBase,key:contentKey},origins:['https://web.example.invalid'],now,publicationRegistry:manifest()};
 runtime.media=createMediaService(runtime,createCloudinaryAdapter(providerConfig,{fetchImpl:transport}),{mode:'test'});runtime.verifyThumbnail=runtime.media.verifyThumbnail;runtime.attachThumbnail=runtime.media.attachThumbnail;base=await listen(createApp(runtime));
});
after(async()=>{for(const s of servers){s.closeAllConnections();await new Promise(r=>s.close(r));}if(identity)await identity.close();if(connection)await connection.close();});

test('Staff reviews exact English audio; repeat explicit review bumps version; return then edit invalidates',async()=>{
 await role('Staff');const r=await complete();
 const review=(v)=>action(r.revisionId,'languages/en/review',v,{expectedTextVersion:1,decision:'approved'});
 assert.equal((await review(0)).status,200);assert.equal((await review(0)).status,409);assert.equal((await review(1)).body.data.editVersion,2);
 const row=await models.LocalizedContent.findOne({revisionId:r.revisionId,languageCode:'en'});assert.equal(String(row.reviewedBy),String(staff._id));
 assert.equal((await action(r.revisionId,'submit',2)).body.data.status,'in_review');
 assert.equal((await patch(r.revisionId,3,{sourceTextEN:'locked'})).status,409);
 assert.equal((await action(r.revisionId,'return',3,{reason:'Needs correction'})).status,403);
 assert.equal((await publish(r,3)).status,403);
 await role('Manager');assert.equal((await action(r.revisionId,'return',3,{reason:'Needs correction'})).body.data.status,'draft');
 assert.equal((await patch(r.revisionId,4,{sourceTextEN:'Corrected source'})).status,200);
 assert.equal((await models.LocalizedContent.findOne({revisionId:r.revisionId,languageCode:'en'})).reviewStatus,'pending');
});
test('full sixteen-locale submit and Manager self-publication atomically change pointer; replay skips provider',async()=>{
 await role('Manager');const r=await complete();const key=randomUUID();
 assert.equal((await action(r.revisionId,'submit')).status,200);
 const body=await publish(r,1,key);assert.equal(body.status,200);assert.equal(body.body.data.status,'published');assert.equal(body.body.data.editVersion,2);
 const calls=providerCalls;providerMode='fail';const replay=await publish(r,1,key);providerMode='normal';assert.deepEqual(replay.body.data,body.body.data);assert.equal(providerCalls,calls);
 assert.equal((await publish(r,2,key)).status,409);assert.equal(String((await models.POI.findById(r.poiId)).publishedRevisionId),r.revisionId);
 assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':r.poiId,'payload.action':'revision.publish'}),1);
 assert.equal(await models.IdempotencyRecord.countDocuments({operation:'revision.publish',key,status:'completed'}),1);
});
test('missing/stale/unapproved/wrong-model/English-inconsistent outputs cannot submit',async()=>{
 for(const kind of ['missing','source','textVersion','pending','registry','english','duration']){
  const r=await complete(),filter={revisionId:r.revisionId,languageCode:kind==='english'?'en':'vi'};
  if(kind==='missing')await models.LocalizedContent.deleteOne(filter);
  else await models.LocalizedContent.collection.updateOne({revisionId:new mongoose.Types.ObjectId(r.revisionId),languageCode:filter.languageCode},{$set:({source:{sourceVersion:2},textVersion:{'audioAsset.textVersion':2},pending:{reviewStatus:'pending',reviewedBy:null,reviewedAt:null},registry:{'audioAsset.voiceOrModelId':'unapproved-model'},english:{text:'wrong source'},duration:{durationSeconds:151}})[kind]});
  const response=await action(r.revisionId,'submit');assert.ok([409,503].includes(response.status),kind+JSON.stringify(response.body));assert.equal((await models.POIRevision.findById(r.revisionId)).status,'draft');assert.equal((await models.POI.findById(r.poiId)).publishedRevisionId,null);
 }
});
test('reject incomplete current row with reason, version-bound review and strict HTTP input',async()=>{
 const r=await complete();await models.LocalizedContent.updateOne({revisionId:r.revisionId,languageCode:'vi'},{$set:{audioAsset:null,durationSeconds:null,reviewStatus:'pending',reviewedAt:null,reviewedBy:null}});
 assert.equal((await action(r.revisionId,'languages/vi/review',0,{expectedTextVersion:2,decision:'changes_required',reason:'Fix'})).status,409);
 assert.equal((await action(r.revisionId,'languages/vi/review',0,{expectedTextVersion:1,decision:'approved'})).status,409);
 const rejected=await action(r.revisionId,'languages/vi/review',0,{expectedTextVersion:1,decision:'changes_required',reason:' Missing narration '});assert.equal(rejected.status,200);
 const event=await models.AuditOutbox.findOne({'payload.poiId':r.poiId,'payload.action':'content.review'});assert.equal(event.payload.reason,'Missing narration');
 assert.equal((await action(r.revisionId,'submit',1,{actorId:String(staff._id)})).status,422);
 assert.equal((await action(r.revisionId,'publish',1,{expectedPublishedRevisionId:null,confirmGeography:false})).status,422);
 assert.equal((await action(r.revisionId,'return',1,{reason:'x'.repeat(17000)})).status,413);
 assert.equal((await request(`/admin/revisions/${r.revisionId}/submit`,'POST','{')).status,400);
 assert.equal((await request(`/admin/revisions/${r.revisionId}/submit`,'POST','x',{'Content-Type':'text/plain'})).status,415);
});
test('unavailable manifest/media verifier fails closed; provider failures/redirect/corrupt bytes never submit',async()=>{
 const r=await complete();const cfg=runtime.publicationRegistry;
 const principal={account:{id:String(staff._id),role:'Manager'},currentWorkSession:{id:String(session._id)}};
 for(const value of [undefined,{registryVersion:'bad',languages:{}}]){
  const service=createPublicationService({...runtime,publicationRegistry:value});await assert.rejects(service.submit(r.revisionId,{expectedEditVersion:0},principal,context()),e=>e.code==='PUBLICATION_VERIFICATION_UNAVAILABLE');
 }
 assert.deepEqual(runtime.publicationRegistry,cfg);
 const verifier=runtime.verifyThumbnail;runtime.verifyThumbnail=undefined;assert.equal((await action(r.revisionId,'submit')).status,503);runtime.verifyThumbnail=verifier;
 for(const mode of ['fail','redirect','corrupt']){providerMode=mode;assert.equal((await action(r.revisionId,'submit')).status,503);providerMode='normal';}
 assert.equal((await models.POIRevision.findById(r.revisionId)).status,'draft');
});
test('same-version concurrent review and submit has one winner; publish contention is idempotent',async()=>{
 const r=await complete();const results=await Promise.all([action(r.revisionId,'languages/en/review',0,{expectedTextVersion:1,decision:'approved'}),action(r.revisionId,'submit')]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const rev=await models.POIRevision.findById(r.revisionId);if(rev.status==='draft')assert.equal((await action(r.revisionId,'submit',1)).status,200);
 const v=(await models.POIRevision.findById(r.revisionId)).editVersion,key=randomUUID();const out=await Promise.all([publish(r,v,key),publish(r,v,key)]);assert.ok(out.every(r=>r.status===200),JSON.stringify(out));assert.deepEqual(out[0].body.data,out[1].body.data);
 assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':r.poiId,'payload.action':'revision.publish'}),1);
});
test('verified snapshot changed while provider is running cannot be submitted',async()=>{
 const r=await complete();let entered;const wait=new Promise(resolve=>entered=resolve);held=entered;providerMode='hold';const pending=action(r.revisionId,'submit');await Promise.race([wait,pending.then(out=>{throw Error("Provider hold was not reached: "+JSON.stringify(out));})]);
 await models.POIRevision.updateOne({_id:r.revisionId},{$inc:{editVersion:1},$set:{nameEN:'Concurrent metadata'}});providerMode='normal';release();const out=await pending;assert.equal(out.status,409);assert.equal((await models.POIRevision.findById(r.revisionId)).status,'draft');
});
test('publish pointer protection and clone reuse preserve previous published graph',async()=>{
 const first=await complete('in_review');assert.equal((await publish(first)).status,200);
 const old=JSON.stringify(await models.POIRevision.findById(first.revisionId).lean()),rows=JSON.stringify(await models.LocalizedContent.find({revisionId:first.revisionId}).sort({languageCode:1}).lean());
 const clone=await request(`/admin/pois/${first.poiId}/draft`,'POST',{expectedPublishedRevisionId:first.revisionId},{'Idempotency-Key':randomUUID()});assert.equal(clone.status,201);const next={poiId:first.poiId,revisionId:clone.body.data.revisionId};
 assert.equal((await action(next.revisionId,'submit')).status,200);assert.equal((await publish(next,1)).status,409);
 assert.equal((await publish(next,1,randomUUID(),first.revisionId)).status,200);
 assert.equal(JSON.stringify(await models.POIRevision.findById(first.revisionId).lean()),old);assert.equal(JSON.stringify(await models.LocalizedContent.find({revisionId:first.revisionId}).sort({languageCode:1}).lean()),rows);
 assert.equal((await patch(first.revisionId,1,{nameEN:'immutable'})).status,409);
});
test('outbox failure rolls back review, submit and publish including replay record',async()=>{
 for(const op of ['review','submit','publish']){
  const r=await complete(op==='publish'?'in_review':'draft'),publishKey=randomUUID();const original=models.AuditOutbox.create;models.AuditOutbox.create=async()=>{throw Error('synthetic private failure');};
  try{const out=op==='review'?await action(r.revisionId,'languages/en/review',0,{expectedTextVersion:1,decision:'approved'}):op==='submit'?await action(r.revisionId,'submit'):await publish(r,0,publishKey);assert.equal(out.status,503);}finally{models.AuditOutbox.create=original;}
  assert.equal((await models.POIRevision.findById(r.revisionId)).editVersion,0);assert.equal((await models.POI.findById(r.poiId)).mutationVersion,0);assert.equal((await models.POI.findById(r.poiId)).publishedRevisionId,null);assert.equal(await models.IdempotencyRecord.countDocuments({operation:'revision.publish',key:publishKey}),0);
 }
});
test('fresh role, session, status and Identity availability guard all publication and replay requests',async()=>{
 const r=await complete('in_review'),key=randomUUID();await role('Staff');assert.equal((await publish(r,0,key)).status,403);await role('Manager');
 await im.WorkSession.updateOne({_id:session._id},{$set:{status:'closed',closedAt:new Date(clock)}});assert.equal((await publish(r,0,key)).status,403);await im.WorkSession.updateOne({_id:session._id},{$set:{status:'open',closedAt:null}});
 for(const status of ['pending','locked']){await im.StaffAccount.updateOne({_id:staff._id},{$set:{status}});assert.equal((await publish(r,0,key)).status,403);}await im.StaffAccount.updateOne({_id:staff._id},{$set:{status:'active'}});
 const original=runtime.authorization.key;runtime.authorization.key=key;assert.equal((await publish(r)).status,503);runtime.authorization.key=original;
 assert.equal((await publish(r,0,key)).status,200);await role('Staff');assert.equal((await publish(r,0,key)).status,403);await role('Manager');
});
test('absolute deadline/cancellation rejects before provider work and before transaction',async()=>{
 const r=await complete();const service=createPublicationService(runtime),p={account:{id:String(staff._id),role:'Manager'},currentWorkSession:{id:String(session._id)}};const calls=providerCalls;
 await assert.rejects(service.submit(r.revisionId,{expectedEditVersion:0},p,{deadline:Date.now()-1}),e=>e.status===503);
 const controller=new AbortController();controller.abort();await assert.rejects(service.submit(r.revisionId,{expectedEditVersion:0},p,{deadline:Date.now()+60000,signal:controller.signal}),e=>e.status===503);assert.equal(providerCalls,calls);
 const during=new AbortController(),verify=runtime.verifyThumbnail;runtime.verifyThumbnail=async(ref,c)=>{during.abort();return verify(ref,c);};
 try{await assert.rejects(service.submit(r.revisionId,{expectedEditVersion:0},p,{deadline:Date.now()+60000,signal:during.signal}),e=>e.status===503);}finally{runtime.verifyThumbnail=verify;}
 assert.equal((await models.POIRevision.findById(r.revisionId)).editVersion,0);
});
test('conditional parent write detects a concurrent synthetic delete and rolls publication back',async()=>{
 const r=await complete('in_review');let entered,releaseGuard;const seen=new Promise(r=>entered=r),wait=new Promise(r=>releaseGuard=r);const original=models.POI.updateOne;let pause=true;
 models.POI.updateOne=function(filter,update,opts){if(pause&&String(filter._id)===r.poiId&&opts?.session){pause=false;return(async()=>{entered();await wait;return original.call(this,filter,update,opts);})();}return original.call(this,filter,update,opts);};
 try{
  const pending=publish(r);await Promise.race([seen,pending.then(out=>{throw Error('Guard not reached '+JSON.stringify(out));})]);
  const tx=await connection.startSession();try{await tx.withTransaction(async()=>{await models.POI.collection.updateOne({_id:new mongoose.Types.ObjectId(r.poiId),mutationVersion:0},{$inc:{mutationVersion:1},$set:{deletedAt:new Date(clock),deletedBy:staff._id}},{session:tx});});}finally{await tx.endSession();}
  releaseGuard();const response=await pending;assert.equal(response.status,409);assert.equal(response.body.error.code,'POI_DELETED');
 }finally{releaseGuard();models.POI.updateOne=original;}
 assert.equal((await models.POI.findById(r.poiId)).publishedRevisionId,null);assert.equal((await models.POIRevision.findById(r.revisionId)).status,'in_review');assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':r.poiId,'payload.action':'revision.publish'}),0);
});
test('unknown replay outcome is quarantined; two distinct publish keys cannot publish twice',async()=>{
 const r=await complete('in_review'),key=randomUUID();await models.IdempotencyRecord.create({actorId:staff._id,operation:'revision.publish',key,requestHash:'a'.repeat(64),status:'in_progress',createdAt:new Date(clock),expiresAt:new Date(clock+86400000)});
 const calls=providerCalls;const unknown=await publish(r,0,key);assert.equal(unknown.status,503);assert.equal(unknown.body.error.code,'IDEMPOTENCY_RECONCILIATION_REQUIRED');assert.equal(providerCalls,calls);
 const out=await Promise.all([publish(r),publish(r)]);assert.deepEqual(out.map(r=>r.status).sort(),[200,409]);assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':r.poiId,'payload.action':'revision.publish'}),1);
});
test('publish checks new corruption after submit, cross-POI media, overflow and corrupt public pointer',async()=>{
 const r=await complete();assert.equal((await action(r.revisionId,'submit')).status,200);
 await models.LocalizedContent.updateOne({revisionId:r.revisionId,languageCode:'ja'},{$set:{reviewStatus:'pending',reviewedBy:null,reviewedAt:null}});assert.equal((await publish(r,1)).status,409);
 const a=await complete('in_review'),b=await complete();const foreign=await models.POIRevision.findById(b.revisionId);
 await models.POIRevision.updateOne({_id:a.revisionId},{$set:{thumbnailAsset:foreign.thumbnailAsset}});assert.equal((await publish(a)).status,422);
 const c=await complete('in_review');await models.POI.updateOne({_id:c.poiId},{$set:{mutationVersion:Number.MAX_SAFE_INTEGER}});assert.equal((await publish(c)).body.error.code,'VERSION_EXHAUSTED');assert.equal((await models.POI.findById(c.poiId)).publishedRevisionId,null);
 const d=await complete('in_review');await models.POI.updateOne({_id:d.poiId},{$set:{publishedRevisionId:new mongoose.Types.ObjectId()}});assert.equal((await publish(d)).body.error.code,'CONTENT_STATE_UNAVAILABLE');
});
test('publication stays durable while Identity receiver is unavailable; original session audit later delivers',async()=>{
 const r=await complete('in_review');const response=await publish(r);assert.equal(response.status,200);
 const row=await models.AuditOutbox.findOne({'payload.poiId':r.poiId,'payload.action':'revision.publish'});assert.equal(row.deliveredAt,null);assert.equal(String(row.payload.workSessionId),String(session._id));
 await models.AuditOutbox.updateMany({deliveredAt:null},{$set:{nextAttemptAt:new Date(clock+100000)}});await models.AuditOutbox.updateOne({_id:row._id},{$set:{nextAttemptAt:new Date(clock)}});
 const failing=createOutboxSender(models.AuditOutbox,{...runtime.authorization,key:key()},{now,random:()=>0});await failing.tick();assert.equal((await models.AuditOutbox.findById(row._id)).deliveredAt,null);
 await models.AuditOutbox.updateOne({_id:row._id},{$set:{nextAttemptAt:new Date(clock)}});const sender=createOutboxSender(models.AuditOutbox,runtime.authorization,{now,random:()=>0});await sender.tick();assert.ok((await models.AuditOutbox.findById(row._id)).deliveredAt);assert.equal(await im.AuditLog.countDocuments({eventId:row.eventId}),1);assert.equal(String((await models.POI.findById(r.poiId)).publishedRevisionId),r.revisionId);
});
test('actual provider HTTP read is aborted during verification without a content mutation',async()=>{
 const r=await complete(),controller=new AbortController(),service=createPublicationService(runtime);
 const p={account:{id:String(staff._id),role:'Manager'},currentWorkSession:{id:String(session._id)}};
 let entered;const seen=new Promise(resolve=>entered=resolve);held=entered;providerMode='hold';
 const pending=service.submit(r.revisionId,{expectedEditVersion:0},p,{deadline:Date.now()+60000,signal:controller.signal});
 const rejected=assert.rejects(pending,e=>e.code==='PUBLICATION_VERIFICATION_UNAVAILABLE');
 try{await Promise.race([seen,pending.then(()=>{throw Error('Unexpected success');},error=>{throw error;})]);controller.abort();await rejected;}
 finally{providerMode='normal';release?.();}
 assert.equal((await models.POIRevision.findById(r.revisionId)).editVersion,0);assert.equal((await models.POI.findById(r.poiId)).mutationVersion,0);
});
