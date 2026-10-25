import {parseBuffer} from 'music-metadata';
import {createAdapterModels} from '../src/adapters/models.js';
import {createTranslationPreflight} from '../src/adapters/preflight.js';
import assert from 'node:assert/strict';
import {before,after,beforeEach,test} from 'node:test';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {once} from 'node:events';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import express from 'express';
import mongoose from 'mongoose';
import {createContentModels} from '../src/models/index.js';
import {createDurabilityModels} from '../src/durability/models.js';
import {createMediaModel} from '../src/media/model.js';
import {createCloudinaryAdapter} from '../src/media/provider.js';
import {createMediaService} from '../src/media/service.js';
import {loadContentConfig,connectContentRuntime,verifyContentCatalog} from '../src/drafts/runtime.js';
import {createApp} from '../src/app.js';
import {createIdentityModels} from '../../identity/src/models/index.js';
import {createAuthRuntime} from '../../identity/src/auth/runtime.js';
import {issueToken} from '../../identity/src/auth/token.js';
import {loadServiceCredentials} from '../../identity/src/authorization.js';
import {createApp as identityApp} from '../../identity/src/app.js';
import {png,mp3} from './media-fixtures.js';
import {createOutboxSender} from '../src/durability/sender.js';
import {createJobModel} from '../src/jobs/model.js';
import {createJobService} from '../src/jobs/service.js';
import {workerConfig} from '../src/jobs/credentials.js';
import {languageCodes} from '../src/models/index.js';
let connection,identity,models,im,staff,session,principal,token,base,identityBase,fixtureBase,runtime,uri,identityConfig;
let clock=Date.parse('2026-10-23T12:00:00.000Z'),providerMode='normal',uploadCalls=0,adminCalls=0,cdnCalls=0,holdStarted,holdRelease,peakRss=0,sampler;
const servers=[],now=()=>clock,key=()=>randomBytes(32).toString('base64url'),contentKey=key(),assets=new Map();
const workerKey=key(),registry=()=>({registryVersion:'fixture-v1',languages:Object.fromEntries(languageCodes.map(c=>[c,{audio:{execution:'local_worker',modelId:'synthetic-audio'},translation:c==='en'?null:{execution:'server_adapter',modelId:'synthetic-translation'}}]))});
const providerConfig={cloud:'fixture_cloud',key:'synthetic-key',secret:'synthetic-secret'};
async function listen(app){const s=app.listen(0,'127.0.0.1');servers.push(s);await once(s,'listening');return`http://127.0.0.1:${s.address().port}`;}
async function request(path,method='GET',body,headers={}){
 const response=await fetch(base+'/api/v1'+path,{method,headers:{Authorization:'Bearer '+token,...(body!==undefined&&!(body instanceof FormData)?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
 const result=await response.json();assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(JSON.stringify(result).includes(providerConfig.secret),false);return{status:response.status,body:result,headers:response.headers};
}
async function draft(){const r=await request('/admin/pois','POST',{nameEN:'Synthetic media POI',sourceTextEN:'Synthetic English source',location:{type:'Point',coordinates:[106.7,10.78]}},{'Idempotency-Key':randomUUID()});assert.equal(r.status,201);return r.body.data;}
async function issue(revisionId,expectedEditVersion=0){const r=await request(`/admin/revisions/${revisionId}/media-intents`,'POST',{expectedEditVersion,kind:'thumbnail'});assert.equal(r.status,201);return r.body.data.intentId;}
async function upload(id,bytes){bytes??=await png();const form=new FormData();form.append('file',new Blob([bytes]),'ignored-file-name.bin');return request('/admin/media-intents/'+id+'/file','PUT',form);}
const patch=(revisionId,expectedEditVersion,thumbnailAsset)=>request('/admin/revisions/'+revisionId,'PATCH',{expectedEditVersion,changes:{thumbnailAsset}});
function transport(url,options){const target=new URL(url);assert.ok(['api.cloudinary.com','res.cloudinary.com'].includes(target.hostname));return fetch(fixtureBase+target.pathname,options);}
before(async()=>{
 const name=process.env.VINLOOK_TEST_MONGO_CONTAINER;assert.match(name??'',process.env.VINLOOK_TEST_ADAPTERS==='1'?/^vinlook-task017-mongo-[A-Za-z0-9_-]+$/:/^vinlook-task016-mongo-[A-Za-z0-9_-]+$/);const[c]=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}));assert.equal(c.Config.Labels['vinlook.task'],process.env.VINLOOK_TEST_ADAPTERS==='1'?'TASK-017':'TASK-016');assert.equal(c.Config.Image,'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');const[binding]=c.NetworkSettings.Ports['27017/tcp'];assert.equal(binding.HostIp,'127.0.0.1');assert.match(binding.HostPort,/^[0-9]+$/);
 uri=`mongodb://127.0.0.1:${binding.HostPort}/vinlook_content_task016?replicaSet=${process.env.VINLOOK_TEST_ADAPTERS==='1'?'vinlook_task017':'vinlook_task016'}&directConnection=true`;
 connection=await mongoose.createConnection(uri,{autoCreate:false,autoIndex:false,serverSelectionTimeoutMS:3000}).asPromise();assert.equal((await connection.db.listCollections().toArray()).length,0);assert.equal((await connection.db.admin().command({hello:1})).setName,process.env.VINLOOK_TEST_ADAPTERS==='1'?'vinlook_task017':'vinlook_task016');models={...createContentModels(connection),...createDurabilityModels(connection),MediaUpload:createMediaModel(connection),ProcessingJob:createJobModel(connection),...(process.env.VINLOOK_TEST_ADAPTERS==='1'?createAdapterModels(connection):{})};for(const m of Object.values(models)){await m.createCollection();await m.createIndexes();}
 identity=await mongoose.createConnection(uri.replace('/vinlook_content_task016?','/vinlook_identity_task016?'),{autoCreate:false,autoIndex:false}).asPromise();assert.equal((await identity.db.listCollections().toArray()).length,0);im=createIdentityModels(identity);for(const m of Object.values(im)){await m.createCollection();await m.createIndexes();}
 const config={jwtKey:randomBytes(32),rateKey:randomBytes(32),origins:['https://web.example.invalid'],proxyCidrs:[],issuer:'vinlook-identity:test',audience:'vinlook-staff:test'};identityConfig=config;const ir={...await createAuthRuntime(im,config,now),callers:loadServiceCredentials(config,{IDENTITY_CONTENT_SERVICE_KEY_B64URL:contentKey,IDENTITY_USAGE_SERVICE_KEY_B64URL:key()},clock)};
 staff=await im.StaffAccount.create({fullName:'Synthetic uploader',email:'uploader@example.invalid',role:'Staff',status:'active',authVersion:0,passwordHash:'$2b$12$'+'A'.repeat(53)});session=await im.WorkSession.create({staffId:staff._id,workDateVN:'2026-10-23',status:'open',openedAt:new Date(clock-1000)});token=await issueToken(staff,config,clock);principal={account:{id:String(staff._id)},currentWorkSession:{id:String(session._id)}};identityBase=await listen(identityApp(ir));
 const provider=express();provider.use(express.raw({type:()=>true,limit:4000000}));provider.use(async(req,res)=>{
  try{
   if(req.method==='POST'){
    uploadCalls++;if(providerMode==='quota')return res.status(429).json({error:{message:'private synthetic provider message'}});
    const form=await new Request('http://fixture.invalid',{method:'POST',body:req.body,headers:{'content-type':req.get('content-type')}}).formData();const publicId=form.get('public_id');assert.equal(form.get('overwrite'),'false');assert.equal(form.get('api_key'),providerConfig.key);assert.equal(form.get('signature'),createHash('sha256').update(`overwrite=false&public_id=${publicId}&timestamp=${form.get('timestamp')}&type=upload`+providerConfig.secret).digest('hex'));
    const bytes=Buffer.from(await form.get('file').arrayBuffer()),audio=req.path.includes('/video/');if(assets.has(publicId))return res.status(409).json({error:{message:'no overwrite'}});
    const audioInfo=audio?await parseBuffer(bytes,{mimeType:'audio/mpeg',size:bytes.length},{duration:true}):null;
    const row={bytes,metadata:{public_id:publicId,version:7,asset_id:'fixture-'+assets.size,resource_type:audio?'video':'image',type:'upload',format:audio?'mp3':'webp',bytes:bytes.length,created_at:new Date(clock).toISOString(),...(audio?{duration:audioInfo.format.duration,audio:{channels:audioInfo.format.numberOfChannels}}:{width:16,height:12}),secure_url:'http://evil.invalid/never-fetch'}};assets.set(publicId,row);
    if(providerMode==='hold'){holdStarted();await new Promise(r=>holdRelease=r);}if(providerMode==='lost'){req.socket.destroy();return;}return res.json({public_id:publicId,version:7});
   }
   if(req.path.includes('/resources/')){
    adminCalls++;assert.equal(req.get('authorization'),'Basic '+Buffer.from(providerConfig.key+':'+providerConfig.secret).toString('base64'));const publicId=decodeURIComponent(req.path.split('/upload/')[1]);const asset=assets.get(publicId);if(!asset)return res.status(404).json({error:{message:'absent'}});if(providerMode==='adminfail')return res.status(503).json({error:{message:'private error'}});return res.json(asset.metadata);
   }
   cdnCalls++;const publicId=req.path.split('/upload/v7/')[1]?.replace(/\.(webp|mp3)$/,'');const asset=assets.get(publicId);if(!asset)return res.status(404).end();if(providerMode==='redirect')return res.redirect('http://127.0.0.1:1/forbidden');return res.end(providerMode==='corrupt'?Buffer.from('wrong bytes'):asset.bytes);
  }catch{res.status(500).json({error:{message:'fixture assertion failure'}});}
 });fixtureBase=await listen(provider);
 runtime={connection,models,processingManifest:registry(),worker:workerConfig({CONTENT_WORKER_ID:'fixture-worker',CONTENT_WORKER_KEY_B64URL:workerKey},clock),authorization:{baseUrl:identityBase,key:contentKey},origins:['https://web.example.invalid'],now};runtime.media=createMediaService(runtime,createCloudinaryAdapter(providerConfig,{fetchImpl:transport}),{mode:'test'});runtime.verifyThumbnail=runtime.media.verifyThumbnail;runtime.attachThumbnail=runtime.media.attachThumbnail;base=await listen(createApp(runtime));sampler=setInterval(()=>{peakRss=Math.max(peakRss,process.memoryUsage().rss);},25);
});
after(async()=>{clearInterval(sampler);for(const s of servers){s.closeAllConnections();await new Promise(r=>s.close(r));}if(identity)await identity.close();if(connection)await connection.close();});
beforeEach(async()=>{await models.ProcessingJob.updateMany({status:{$in:['queued','running']}},{$set:{status:'failed',error:'STALE_INPUT'}});});
const service=()=>createJobService(runtime),local={id:'fixture-worker',execution:'local_worker'},adapter={id:'fixture-adapter',execution:'server_adapter'};
const budget=()=>({deadline:Date.now()+60000,signal:AbortSignal.timeout(60000)});
const worker=(path,body,headers={},method='POST')=>request('/internal/jobs'+path,method,body,{'X-Vinlook-Worker-Id':'fixture-worker','X-Vinlook-Worker-Key':workerKey,...headers});
const processJobs=(r,version=0,uuid=randomUUID())=>request(`/admin/revisions/${r.revisionId}/process`,'POST',{expectedEditVersion:version},{'Idempotency-Key':uuid});
const claim=async(code='en')=>{const r=await worker('/claim',{workerId:'fixture-worker',capabilities:[code]});assert.equal(r.status,200,JSON.stringify(r.body));return r.body.data.job;};
const result=(job,outcome)=>worker('/'+job.id+'/result',{attemptId:job.attemptId,inputVersion:job.inputVersion,outcome});
async function audioIntent(job){const r=await worker('/'+job.id+'/media-intents',{attemptId:job.attemptId});assert.equal(r.status,200,JSON.stringify(r.body));return r.body.data.intentId;}
async function workerUpload(job,id,bytes=mp3()){const form=new FormData();form.append('file',new Blob([bytes]),'synthetic.mp3');return worker(`/${job.id}/media-intents/${id}/file`,form,{},'PUT');}
test('hosted preflight is Manager/session-only, rejects overrides and never creates work',async()=>{
 const path='/admin/adapters/translation/preflight';let calls=0;
 assert.equal((await request(path,'POST',{})).status,403);
 await im.StaffAccount.updateOne({_id:staff._id},{$set:{role:'Manager'}});
 try{
  assert.equal((await request(path,'POST',{})).status,503);
  runtime.translationPreflight=createTranslationPreflight({key:'synthetic-preflight-key'},{now,fetchImpl:async(url,o)=>{calls++;assert.equal(o.method,'GET');assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite');return Response.json({name:'models/gemini-3.5-flash-lite',supportedGenerationMethods:['generateContent'],privateData:'must-not-escape'});}});
  assert.equal((await request(path,'POST',{model:'unapproved'})).status,422);assert.equal(calls,0);
  await im.WorkSession.updateOne({_id:session._id},{$set:{status:'closed',closedAt:new Date(clock)}});
  assert.equal((await request(path,'POST',{})).status,403);assert.equal(calls,0);
  await im.WorkSession.updateOne({_id:session._id},{$set:{status:'open',closedAt:null}});
  const before=await models.ProcessingJob.countDocuments({});const out=await request(path,'POST',{});assert.equal(out.status,200);assert.equal(out.body.data.status,'ok');assert.equal(out.body.data.supportsGenerateContent,true);assert.equal(JSON.stringify(out.body).includes('must-not-escape'),false);
  const cooled=await request(path,'POST',{});assert.equal(cooled.status,429);assert.equal(cooled.headers.get('retry-after'),'60');assert.equal(calls,1);assert.equal(await models.ProcessingJob.countDocuments({}),before);
 }finally{delete runtime.translationPreflight;await im.StaffAccount.updateOne({_id:staff._id},{$set:{role:'Staff'}});await im.WorkSession.updateOne({_id:session._id},{$set:{status:'open',closedAt:null}});}
});

test('seventh catalog and initial process16jobs are atomic/idempotent; English is never translated',async()=>{
 await verifyContentCatalog(connection,models);const r=await draft(),uuid=randomUUID();const first=await processJobs(r,0,uuid);assert.equal(first.status,202,JSON.stringify(first.body));assert.equal(first.body.data.jobIds.length,16);assert.deepEqual((await processJobs(r,0,uuid)).body.data,first.body.data);
 const jobs=await models.ProcessingJob.find({revisionId:r.revisionId});assert.equal(jobs.filter(j=>j.taskType==='translation').length,15);assert.equal(jobs.filter(j=>j.taskType==='audio').length,1);assert.equal((await processJobs(r,1)).status,409);
 const status=await request('/admin/jobs?revisionId='+r.revisionId);assert.equal(status.status,200);assert.equal(status.body.data.items.length,16);assert.equal(JSON.stringify(status.body).includes('inputSnapshot'),false);assert.equal(JSON.stringify(status.body).includes('attemptId'),false);
});
test('English-only Process queues exactly one audio job and binds selection to replay',async()=>{
 const r=await draft(),uuid=randomUUID(),path=`/admin/revisions/${r.revisionId}/process`,headers={'Idempotency-Key':uuid};
 const first=await request(path,'POST',{expectedEditVersion:0,languages:['en']},headers);
 assert.equal(first.status,202,JSON.stringify(first.body));assert.equal(first.body.data.jobIds.length,1);
 const jobs=await models.ProcessingJob.find({revisionId:r.revisionId});assert.equal(jobs.length,1);assert.equal(jobs[0].languageCode,'en');assert.equal(jobs[0].taskType,'audio');
 assert.deepEqual((await request(path,'POST',{expectedEditVersion:0,languages:['en']},headers)).body.data,first.body.data);
 const changed=await request(path,'POST',{expectedEditVersion:0,languages:['vi']},headers);assert.equal(changed.status,409);assert.equal(changed.body.error.code,'IDEMPOTENCY_CONFLICT');
 for(const languages of [[],['en','en'],['invalid']])assert.equal((await request(path,'POST',{expectedEditVersion:1,languages},{'Idempotency-Key':randomUUID()})).status,422);
 assert.equal(await models.ProcessingJob.countDocuments({revisionId:r.revisionId}),1);
});

test('worker-only runtime queues pinned English audio with Gemini disabled',async()=>{
 const r=await draft();
 const config=loadContentConfig('test',{CONTENT_MONGODB_URI:uri,IDENTITY_BASE_URL:identityBase,CONTENT_IDENTITY_SERVICE_KEY_B64URL:contentKey,CONTENT_ALLOWED_ORIGINS:'https://web.example.invalid',CONTENT_WORKER_ID:'fixture-worker',CONTENT_WORKER_KEY_B64URL:workerKey,CONTENT_GEMINI_ENABLED:'false'});
 const restarted=await connectContentRuntime(config);
 try{
  assert.equal(restarted.adapters,undefined);assert.equal(restarted.processingManifest.registryVersion,'vinlook-hybrid-v1');
  const next=createJobService({...restarted,now});const queued=await next.process(r.revisionId,{expectedEditVersion:0,languages:['en']},principal,randomUUID());assert.equal(queued.status,202);assert.equal(queued.body.data.jobIds.length,1);
  const claimed=await next.claim(local,['en']);assert.equal(claimed.job.languageCode,'en');assert.equal(claimed.job.taskType,'audio');assert.equal(claimed.job.inputSnapshot.registryVersion,'vinlook-hybrid-v1');
 }finally{await restarted.close();}
});

test('worker-only runtime approves verified English with Gemini off but cannot submit incomplete revision',async()=>{
 const r=await draft();
 const config=loadContentConfig('test',{CONTENT_MONGODB_URI:uri,IDENTITY_BASE_URL:identityBase,CONTENT_IDENTITY_SERVICE_KEY_B64URL:contentKey,CONTENT_ALLOWED_ORIGINS:'https://web.example.invalid',CONTENT_WORKER_ID:'fixture-worker',CONTENT_WORKER_KEY_B64URL:workerKey,CONTENT_GEMINI_ENABLED:'false',CLOUDINARY_CLOUD_NAME:providerConfig.cloud,CLOUDINARY_API_KEY:providerConfig.key,CLOUDINARY_API_SECRET:providerConfig.secret});
 const restarted=await connectContentRuntime(config);restarted.now=now;
 // Substitute only provider transport: all routes, registry, DB and media checks stay real.
 restarted.media=createMediaService(restarted,createCloudinaryAdapter(providerConfig,{fetchImpl:transport}),{mode:'test'});restarted.verifyThumbnail=restarted.media.verifyThumbnail;restarted.attachThumbnail=restarted.media.attachThumbnail;
 const endpoint=await listen(createApp(restarted));
 const call=async(path,body,asWorker=false)=>{const response=await fetch(endpoint+'/api/v1'+path,{method:'POST',headers:{'Content-Type':'application/json',...(asWorker?{'X-Vinlook-Worker-Id':'fixture-worker','X-Vinlook-Worker-Key':workerKey}:{Authorization:'Bearer '+token})},body:JSON.stringify(body)});return{status:response.status,body:await response.json()};};
 try{
  assert.equal(restarted.adapters,undefined);assert.equal(restarted.publicationRegistry.registryVersion,'vinlook-hybrid-v1');assert.ok(Object.isFrozen(restarted.publicationRegistry));
  const next=createJobService(restarted);await next.process(r.revisionId,{expectedEditVersion:0,languages:['en']},principal,randomUUID());const job=(await next.claim(local,['en'])).job;
  const issued=await call(`/internal/jobs/${job.id}/media-intents`,{attemptId:job.attemptId},true);assert.equal(issued.status,200);const mediaIntentId=issued.body.data.intentId;
  const form=new FormData();form.append('file',new Blob([mp3()]),'fixture.mp3');const uploaded=await fetch(endpoint+`/api/v1/internal/jobs/${job.id}/media-intents/${mediaIntentId}/file`,{method:'PUT',headers:{'X-Vinlook-Worker-Id':'fixture-worker','X-Vinlook-Worker-Key':workerKey},body:form});assert.equal(uploaded.status,201,await uploaded.text());
  assert.equal((await call(`/internal/jobs/${job.id}/result`,{attemptId:job.attemptId,inputVersion:job.inputVersion,outcome:{status:'succeeded',mediaIntentId}},true)).status,200);
  const review={expectedEditVersion:2,expectedTextVersion:1,decision:'approved'},reviewPath=`/admin/revisions/${r.revisionId}/languages/en/review`;
  providerMode='corrupt';assert.equal((await call(reviewPath,review)).status,503);assert.equal((await models.LocalizedContent.findOne({revisionId:r.revisionId,languageCode:'en'})).reviewStatus,'pending');assert.equal((await models.POIRevision.findById(r.revisionId)).editVersion,2);
  providerMode='normal';assert.equal((await call(reviewPath,review)).status,200);
  const en=await models.LocalizedContent.findOne({revisionId:r.revisionId,languageCode:'en'});assert.equal(en.reviewStatus,'approved');assert.equal(String(en.reviewedBy),String(staff._id));assert.ok(en.reviewedAt);
  const submitted=await call(`/admin/revisions/${r.revisionId}/submit`,{expectedEditVersion:3});assert.equal(submitted.status,409);assert.equal(submitted.body.error.code,'PUBLICATION_NOT_READY');assert.equal((await models.POI.findById(r.poiId)).publishedRevisionId,null);
  assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':r.poiId,'payload.action':'content.review'}),1);
 }finally{providerMode='normal';await restarted.close();}
});

test('local capability cannot claim translation; concurrent claims have a single audio winner',async()=>{
 const r=await draft();await processJobs(r);assert.equal(await claim('vi'),null);
 const jobs=await Promise.all([claim(),claim()]);assert.equal(jobs.filter(Boolean).length,1);const job=jobs.find(Boolean);assert.equal(job.taskType,'audio');assert.equal((await worker('/'+job.id+'/renew',{attemptId:job.attemptId})).status,200);
 assert.equal((await worker('/'+job.id+'/renew',{attemptId:randomUUID()})).status,409);
 assert.equal((await worker('/claim',{workerId:'fixture-worker',capabilities:['en']},{'X-Vinlook-Worker-Key':''})).status,401);
});
test('translation receipt creates exactly one immutable audio snapshot and preserves original closed session',async()=>{
 const r=await draft();await processJobs(r);const job=(await service().claim(adapter,['vi'])).job;assert.equal(job.taskType,'translation');
 await im.WorkSession.updateOne({_id:session._id},{$set:{status:'closed',closedAt:new Date(clock)}});
 const input={attemptId:job.attemptId,inputVersion:job.inputVersion,outcome:{status:'succeeded',text:'Synthetic translated text'}};
 try{const out=await service().result(job.id,input,adapter,budget());assert.equal(out.accepted,true);const audit=await models.AuditOutbox.findOne({'payload.poiId':r.poiId,'payload.action':'job.complete'});await models.AuditOutbox.updateMany({deliveredAt:null},{$set:{nextAttemptAt:new Date(clock+100000)}});await models.AuditOutbox.updateOne({_id:audit._id},{$set:{nextAttemptAt:new Date(clock)}});await createOutboxSender(models.AuditOutbox,runtime.authorization,{now,random:()=>0}).tick();assert.equal(await im.AuditLog.countDocuments({eventId:audit.eventId}),1);assert.deepEqual(await service().result(job.id,input,adapter,budget()),out);await assert.rejects(service().result(job.id,{...input,outcome:{status:'succeeded',text:'different'}},adapter,budget()),e=>e.code==='JOB_RESULT_CONFLICT');}
 finally{await im.WorkSession.updateOne({_id:session._id},{$set:{status:'open',closedAt:null}});}
 const audio=await models.ProcessingJob.find({revisionId:r.revisionId,languageCode:'vi',taskType:'audio'});assert.equal(audio.length,1);assert.equal(audio[0].inputSnapshot.text,'Synthetic translated text');assert.equal(audio[0].inputVersion.textVersion,1);const event=await models.AuditOutbox.findOne({'payload.poiId':r.poiId,'payload.action':'job.complete'});assert.equal(event.payload.workSessionId,String(session._id));
});
test('late translation cannot overwrite manual target text with unchanged English source',async()=>{
 const r=await draft();await processJobs(r);const job=(await service().claim(adapter,['vi'])).job;
 assert.equal((await request(`/admin/revisions/${r.revisionId}/languages/vi`,'PATCH',{expectedEditVersion:1,text:'New manual text'})).status,200);
 await assert.rejects(service().result(job.id,{attemptId:job.attemptId,inputVersion:job.inputVersion,outcome:{status:'succeeded',text:'Old automatic text'}},adapter,budget()),e=>e.code==='STALE_JOB_INPUT');assert.equal((await models.LocalizedContent.findOne({revisionId:r.revisionId,languageCode:'vi'})).text,'New manual text');
});
test('worker audio upload and result attach once, reset approval and reject browser/foreign attempt',async()=>{
 const r=await draft();await processJobs(r);const job=await claim(),id=await audioIntent(job);const out=await workerUpload({...job,id:job.id.toUpperCase()},id);assert.equal(out.status,201,JSON.stringify(out.body));assert.equal((await request('/admin/media-intents/'+id+'/file','PUT',new FormData())).status,403);
 const accepted=await result(job,{status:'succeeded',mediaIntentId:id});assert.equal(accepted.status,200,JSON.stringify(accepted.body));assert.deepEqual((await result(job,{status:'succeeded',mediaIntentId:id})).body.data,accepted.body.data);const row=await models.LocalizedContent.findOne({revisionId:r.revisionId,languageCode:'en'});assert.equal(row.audioAsset.format,'mp3');assert.equal(row.reviewStatus,'pending');assert.ok((await models.MediaUpload.findById(id)).attachedAt);assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':r.poiId,'payload.action':'job.complete'}),1);
 assert.equal((await worker(`/${job.id}/media-intents`,{attemptId:randomUUID()})).status,409);
 const other=await draft();await processJobs(other);const foreign=await claim();assert.equal((await workerUpload(foreign,id)).status,403);
});
test('metadata edits preserve job input but source/state/deletion changes reject late result',async()=>{
 const r=await draft();await processJobs(r);const job=await claim();assert.equal((await request('/admin/revisions/'+r.revisionId,'PATCH',{expectedEditVersion:1,changes:{nameEN:'Metadata only'}})).status,200);assert.equal((await worker('/'+job.id+'/renew',{attemptId:job.attemptId})).status,200);
 const id=await audioIntent(job);assert.equal((await workerUpload(job,id)).status,201);assert.equal((await result(job,{status:'succeeded',mediaIntentId:id})).status,200);
 const changed=await draft();await processJobs(changed);const stale=await claim();assert.equal((await request('/admin/revisions/'+changed.revisionId,'PATCH',{expectedEditVersion:1,changes:{sourceTextEN:'Changed source'}})).status,200);assert.equal((await result(stale,{status:'failed',errorCode:'PROVIDER_FAILED'})).status,409);
});
test('expired attempts cannot renew; exactly3automatic reclaims then failed, manual retry resets cycle',async()=>{
 const oldClock=clock,r=await draft();await processJobs(r);let job=await claim();
 try{for(let i=1;i<=3;i++){clock+=300000;assert.equal((await worker('/'+job.id+'/renew',{attemptId:job.attemptId})).status,409);const next=await claim();assert.notEqual(next.attemptId,job.attemptId);job=next;assert.equal((await models.ProcessingJob.findById(job.id)).reclaimCount,i);}
  clock+=300000;assert.equal(await claim(),null);assert.equal((await models.ProcessingJob.findById(job.id)).error,'LEASE_RECLAIM_EXHAUSTED');const retried=await request('/admin/jobs/'+job.id+'/retry','POST',{expectedEditVersion:1},{'Idempotency-Key':randomUUID()});assert.equal(retried.status,202);assert.equal((await models.ProcessingJob.findById(job.id)).reclaimCount,0);assert.equal((await models.ProcessingJob.findById(job.id)).retryCount,1);
 }finally{clock=oldClock;}
});
test('provider failure/quota are terminal and require explicit current-version retry',async()=>{
 const r=await draft();await processJobs(r);const job=await claim();assert.equal((await result(job,{status:'waiting_quota',errorCode:'QUOTA_EXHAUSTED'})).status,200);assert.equal(await claim(),null);
 const uuid=randomUUID(),retry=()=>request('/admin/jobs/'+job.id+'/retry','POST',{expectedEditVersion:2},{'Idempotency-Key':uuid});assert.equal((await retry()).status,202);assert.equal((await retry()).status,202);const next=await claim();assert.notEqual(next.attemptId,job.attemptId);assert.equal((await result(job,{status:'waiting_quota',errorCode:'QUOTA_EXHAUSTED'})).status,409);
});
test('result/outbox failure rolls back localized output, job receipt, follow-up and parent',async()=>{
 const r=await draft();await processJobs(r);const job=(await service().claim(adapter,['vi'])).job,original=models.AuditOutbox.create;models.AuditOutbox.create=async()=>{throw Error('synthetic failure');};
 try{await assert.rejects(service().result(job.id,{attemptId:job.attemptId,inputVersion:job.inputVersion,outcome:{status:'succeeded',text:'Must rollback'}},adapter,budget()),e=>e.status===503);}finally{models.AuditOutbox.create=original;}
 assert.equal(await models.LocalizedContent.countDocuments({revisionId:r.revisionId,languageCode:'vi'}),0);assert.equal((await models.ProcessingJob.findById(job.id)).status,'running');assert.equal(await models.ProcessingJob.countDocuments({revisionId:r.revisionId,languageCode:'vi',taskType:'audio'}),0);assert.equal((await models.POIRevision.findById(r.revisionId)).editVersion,1);
});
test('lost upload acknowledgement is reconciled without second POST and old attempt cannot adopt it',async()=>{
 const r=await draft();await processJobs(r);let job=await claim();const id=await audioIntent(job),count=uploadCalls;providerMode='lost';assert.equal((await workerUpload(job,id)).status,503);providerMode='normal';assert.equal((await workerUpload(job,id)).status,409);assert.equal((await worker(`/${job.id}/media-intents/${id}/reconcile`,{})).status,200);assert.equal(uploadCalls,count+1);
 const oldClock=clock;clock+=300000;try{const next=await claim();assert.notEqual(next.attemptId,job.attemptId);assert.equal((await worker(`/${job.id}/media-intents/${id}/reconcile`,{})).status,409);assert.equal((await result(next,{status:'succeeded',mediaIntentId:id})).status,422);}finally{clock=oldClock;}
});
test('new verified Content connection retains active lease and receipt; no implicit catalog provisioning',async()=>{
 const r=await draft();await processJobs(r);const job=await claim();
 const config=loadContentConfig('test',{CONTENT_MONGODB_URI:uri,IDENTITY_BASE_URL:identityBase,CONTENT_IDENTITY_SERVICE_KEY_B64URL:contentKey,CONTENT_ALLOWED_ORIGINS:'https://web.example.invalid',CONTENT_WORKER_ID:'fixture-worker',CONTENT_WORKER_KEY_B64URL:workerKey});const restarted=await connectContentRuntime(config);
 try{await verifyContentCatalog(restarted.connection,restarted.models);const next=createJobService({...restarted,processingManifest:registry(),now});assert.deepEqual(await next.claim(local,['en']),{job:null});assert.ok((await next.renew(job.id,job.attemptId,local)).leaseExpiresAt);}
 finally{await restarted.close();}
});
test('revoked worker key and malformed/scope-spoofed requests cannot mutate jobs',async()=>{
 const r=await draft();await processJobs(r);const original=runtime.worker.key;runtime.worker.key=randomBytes(32);try{assert.equal((await worker('/claim',{workerId:'fixture-worker',capabilities:['en']})).status,401);}finally{runtime.worker.key=original;}
 assert.equal((await worker('/claim',{workerId:'someone-else',capabilities:['en']})).status,403);assert.equal((await worker('/claim',{workerId:'fixture-worker',capabilities:['en'],execution:'server_adapter'})).status,422);
 const missing=await listen(createApp({...runtime,processingManifest:undefined}));const response=await fetch(missing+'/api/v1/internal/jobs/claim',{method:'POST',headers:{'Content-Type':'application/json','X-Vinlook-Worker-Id':'fixture-worker','X-Vinlook-Worker-Key':workerKey},body:JSON.stringify({workerId:'fixture-worker',capabilities:['en']})});assert.equal(response.status,503);
});
test('lost lease during provider upload keeps unattached durable bytes and denies stale acceptance',async()=>{
 const r=await draft();await processJobs(r);const job=await claim(),id=await audioIntent(job);let entered;const seen=new Promise(resolve=>entered=resolve);holdStarted=entered;providerMode='hold';const pending=workerUpload(job,id);await Promise.race([seen,pending.then(out=>{throw Error('Provider hold not reached '+JSON.stringify(out));})]);
 const oldClock=clock;clock+=300000;
 try{const next=await claim();assert.notEqual(next.attemptId,job.attemptId);providerMode='normal';holdRelease();assert.equal((await pending).status,201);assert.equal((await models.MediaUpload.findById(id)).attachedAt,null);assert.equal((await result(job,{status:'succeeded',mediaIntentId:id})).status,409);assert.equal((await result(next,{status:'succeeded',mediaIntentId:id})).status,422);}
 finally{providerMode='normal';holdRelease?.();clock=oldClock;}
});
test('process and retry outbox failure roll back durable jobs and counters; result deadline admits no write',async()=>{
 const r=await draft(),original=models.AuditOutbox.create;models.AuditOutbox.create=async()=>{throw Error('synthetic outbox failure');};try{assert.equal((await processJobs(r)).status,503);}finally{models.AuditOutbox.create=original;}
 assert.equal(await models.ProcessingJob.countDocuments({revisionId:r.revisionId}),0);assert.equal((await models.POIRevision.findById(r.revisionId)).editVersion,0);
 await processJobs(r);const job=await claim();await assert.rejects(service().result(job.id,{attemptId:job.attemptId,inputVersion:job.inputVersion,outcome:{status:'failed',errorCode:'PROVIDER_FAILED'}},local,{deadline:Date.now()-1}),e=>e.status===503);assert.equal((await models.ProcessingJob.findById(job.id)).status,'running');
 assert.equal((await result(job,{status:'failed',errorCode:'PROVIDER_FAILED'})).status,200);const before=JSON.stringify(await models.ProcessingJob.findById(job.id).lean());models.AuditOutbox.create=async()=>{throw Error('synthetic retry audit failure');};
 try{assert.equal((await request('/admin/jobs/'+job.id+'/retry','POST',{expectedEditVersion:2},{'Idempotency-Key':randomUUID()})).status,503);}finally{models.AuditOutbox.create=original;}
 assert.equal(JSON.stringify(await models.ProcessingJob.findById(job.id).lean()),before);assert.equal((await models.POIRevision.findById(r.revisionId)).editVersion,2);
});
async function resumableUpload(){
 const r=await draft();await processJobs(r);const job=await claim(),mediaIntentId=await audioIntent(job);assert.equal((await workerUpload(job,mediaIntentId)).status,201);
 await models.MediaUpload.updateOne({_id:mediaIntentId},{$set:{status:'uncertain',safeErrorCode:'DEPENDENCY_UNAVAILABLE'}});
 return{r,job,input:{expectedEditVersion:1,attemptId:job.attemptId,mediaIntentId,reason:'Recover known upload'},manager:{...principal,account:{...principal.account,role:'Manager'}}};
}

test('Manager resume replay is stable and reconcile/result never reuploads',async()=>{
 const f=await resumableUpload(),uuid=randomUUID(),oldClock=clock,uploads=uploadCalls;
 assert.equal((await request('/admin/jobs/'+f.job.id+'/resume-upload','POST',f.input,{'Idempotency-Key':uuid})).status,403);
 clock+=300001;
 try{
  const first=await service().resumeUpload(f.job.id,f.input,f.manager,uuid);assert.equal(first.status,200);assert.equal(first.body.data.editVersion,2);
  const stored=await models.ProcessingJob.findById(f.job.id);assert.ok(stored.uploadResumedAt);assert.equal(stored.uploadResumeCount,1);assert.equal(stored.attemptId,f.job.attemptId);assert.equal(+stored.leaseExpiresAt,clock+300000);
  assert.deepEqual((await service().resumeUpload(f.job.id,f.input,f.manager,uuid)).body,first.body);
  assert.equal(+(await models.ProcessingJob.findById(f.job.id)).leaseExpiresAt,+stored.leaseExpiresAt);
  await assert.rejects(service().resumeUpload(f.job.id,{...f.input,reason:'Changed'},f.manager,uuid),e=>e.code==='IDEMPOTENCY_CONFLICT');
  await assert.rejects(service().resumeUpload(f.job.id,{...f.input,expectedEditVersion:2},f.manager,randomUUID()),e=>e.code==='UPLOAD_RESUME_NOT_ALLOWED');
  const audit=await models.AuditOutbox.findOne({'payload.poiId':f.r.poiId,'payload.action':'job.retry'});assert.equal(audit.payload.reason,'resume-upload: Recover known upload');
  assert.equal((await worker('/'+f.job.id+'/media-intents/'+f.input.mediaIntentId+'/reconcile',{})).status,200);
  assert.equal((await result(f.job,{status:'succeeded',mediaIntentId:f.input.mediaIntentId})).status,200);
  assert.equal(uploadCalls,uploads);assert.ok((await models.MediaUpload.findById(f.input.mediaIntentId)).attachedAt);
  assert.ok((await models.LocalizedContent.findOne({revisionId:f.r.revisionId,languageCode:'en'})).audioAsset);
 }finally{clock=oldClock;}
});

test('recovery budget allows two total, counts legacy marker, and never grants a third or resets on retry',async()=>{
 for(const legacy of [false,true]){
  const f=await resumableUpload(),oldClock=clock;clock+=300001;
  try{
   if(legacy)await models.ProcessingJob.collection.updateOne({_id:new mongoose.Types.ObjectId(f.job.id)},{$set:{uploadResumedAt:new Date(clock-300000)},$unset:{uploadResumeCount:''}});
   const input={...f.input},uuid=randomUUID();
   const first=await service().resumeUpload(f.job.id,input,f.manager,uuid);assert.equal(first.status,200);
   assert.equal((await models.ProcessingJob.findById(f.job.id)).uploadResumeCount,legacy?2:1);
   if(!legacy){clock+=300001;input.expectedEditVersion=2;await service().resumeUpload(f.job.id,input,f.manager,randomUUID());}
   let stored=await models.ProcessingJob.findById(f.job.id);assert.equal(stored.uploadResumeCount,2);const expiry=+stored.leaseExpiresAt;
   clock+=300001;
   await service().resumeUpload(f.job.id,f.input,f.manager,uuid);assert.equal(+(await models.ProcessingJob.findById(f.job.id)).leaseExpiresAt,expiry);
   await assert.rejects(service().resumeUpload(f.job.id,{...input,expectedEditVersion:legacy?2:3},f.manager,randomUUID()),e=>e.code==='UPLOAD_RESUME_NOT_ALLOWED');
   // Explicit retry retains lifetime budget even when it resets the attempt.
   await models.ProcessingJob.updateOne({_id:f.job.id},{$set:{status:'failed',error:'PROVIDER_FAILED'}});
   await service().retry(f.job.id,{expectedEditVersion:legacy?2:3},f.manager,randomUUID());
   stored=await models.ProcessingJob.findById(f.job.id);assert.equal(stored.uploadResumeCount,2);assert.ok(stored.uploadResumedAt);
   // Isolate the next legacy case from this intentionally requeued job.
   await models.ProcessingJob.updateOne({_id:f.job.id},{$set:{status:'failed',error:'STALE_INPUT'}});
  }finally{clock=oldClock;}
 }
});

test('concurrent second recovery spends one remaining slot; legacy missing marker/counter starts at zero',async()=>{
 const f=await resumableUpload(),oldClock=clock;clock+=300001;
 try{
  await models.ProcessingJob.collection.updateOne({_id:new mongoose.Types.ObjectId(f.job.id)},{$unset:{uploadResumeCount:'',uploadResumedAt:''}});
  await service().resumeUpload(f.job.id,f.input,f.manager,randomUUID());assert.equal((await models.ProcessingJob.findById(f.job.id)).uploadResumeCount,1);
  clock+=300001;const input={...f.input,expectedEditVersion:2};
  const attempts=await Promise.allSettled([service().resumeUpload(f.job.id,input,f.manager,randomUUID()),service().resumeUpload(f.job.id,input,f.manager,randomUUID())]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);assert.equal((await models.ProcessingJob.findById(f.job.id)).uploadResumeCount,2);assert.equal((await models.POIRevision.findById(f.r.revisionId)).editVersion,3);
 }finally{clock=oldClock;}
});

test('resume rejects live/reclaimed/retried/stale/foreign media states and audit failure rolls back lease',async()=>{
 const f=await resumableUpload(),oldClock=clock;
 await assert.rejects(service().resumeUpload(f.job.id,f.input,f.manager,randomUUID()),e=>e.code==='UPLOAD_RESUME_NOT_ALLOWED');
 clock+=300001;
 try{
  await assert.rejects(service().resumeUpload(f.job.id,{...f.input,attemptId:randomUUID()},f.manager,randomUUID()),e=>e.code==='UPLOAD_RESUME_NOT_ALLOWED');
  await assert.rejects(service().resumeUpload(f.job.id,{...f.input,mediaIntentId:String(new mongoose.Types.ObjectId())},f.manager,randomUUID()),e=>e.code==='UPLOAD_RESUME_NOT_ALLOWED');
  await assert.rejects(service().resumeUpload(f.job.id,{...f.input,expectedEditVersion:9},f.manager,randomUUID()),e=>e.code==='EDIT_VERSION_CONFLICT');
  for(const field of ['reclaimCount','retryCount']){await models.ProcessingJob.updateOne({_id:f.job.id},{$set:{[field]:1}});await assert.rejects(service().resumeUpload(f.job.id,f.input,f.manager,randomUUID()),e=>e.code==='UPLOAD_RESUME_NOT_ALLOWED');await models.ProcessingJob.updateOne({_id:f.job.id},{$set:{[field]:0}});}
  const original=models.AuditOutbox.create;models.AuditOutbox.create=async()=>{throw Error('synthetic resume audit failure');};
  try{await assert.rejects(service().resumeUpload(f.job.id,f.input,f.manager,randomUUID()));}finally{models.AuditOutbox.create=original;}
  const stored=await models.ProcessingJob.findById(f.job.id);assert.equal(stored.uploadResumedAt,null);assert.equal(stored.uploadResumeCount,0);assert.equal(+stored.leaseExpiresAt,+new Date(f.job.leaseExpiresAt));assert.equal((await models.POIRevision.findById(f.r.revisionId)).editVersion,1);
  await models.LocalizedContent.updateOne({revisionId:f.r.revisionId,languageCode:'en'},{$set:{text:'Changed text'},$inc:{textVersion:1}});
  await assert.rejects(service().resumeUpload(f.job.id,f.input,f.manager,randomUUID()),e=>e.code==='STALE_JOB_INPUT');
 }finally{clock=oldClock;}
});

test('concurrent Manager recovery and expired worker claim cannot accept two attempts',async()=>{
 const f=await resumableUpload(),oldClock=clock;clock+=300001;
 try{
  const outcomes=await Promise.allSettled([service().resumeUpload(f.job.id,f.input,f.manager,randomUUID()),service().claim(local,['en'])]);
  const stored=await models.ProcessingJob.findById(f.job.id);
  if(stored.uploadResumedAt){assert.equal(stored.attemptId,f.job.attemptId);assert.equal(stored.reclaimCount,0);assert.equal(outcomes[1].status,'fulfilled');assert.equal(outcomes[1].value.job,null);}
  else{assert.notEqual(stored.attemptId,f.job.attemptId);assert.equal(stored.reclaimCount,1);assert.equal(outcomes[0].status,'rejected');}
 }finally{clock=oldClock;}
});

test('in_review and deleted parents reject late output without mutating locale or receipt',async()=>{
 for(const state of ['in_review','deleted']){
  const r=await draft();await processJobs(r);const job=await claim();
  if(state==='in_review')await models.POIRevision.updateOne({_id:r.revisionId},{$set:{status:'in_review'}});
  else await models.POI.updateOne({_id:r.poiId},{$set:{deletedAt:new Date(clock),deletedBy:staff._id},$inc:{mutationVersion:1}});
  const out=await result(job,{status:'failed',errorCode:'PROVIDER_FAILED'});assert.equal(out.status,409);assert.equal((await models.ProcessingJob.findById(job.id)).lastResultHash,null);assert.equal((await models.LocalizedContent.findOne({revisionId:r.revisionId,languageCode:'en'})).audioAsset,null);
 }
});

// Shared guarded HTTP/Mongo fixture for adapter integration; no credentials exported.
export const adapterFixture=()=>({connection,models,runtime,principal,draft,request,now,advance:ms=>{clock+=ms;},listen,createApp,setMediaMode:value=>{providerMode=value;}});
