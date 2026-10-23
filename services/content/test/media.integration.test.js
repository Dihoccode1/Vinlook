import assert from 'node:assert/strict';
import {before,after,test} from 'node:test';
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
let connection,identity,models,im,staff,session,principal,token,base,identityBase,fixtureBase,runtime,uri,identityConfig;
let clock=Date.parse('2026-10-23T12:00:00.000Z'),providerMode='normal',uploadCalls=0,adminCalls=0,cdnCalls=0,holdStarted,holdRelease,peakRss=0,sampler;
const servers=[],now=()=>clock,key=()=>randomBytes(32).toString('base64url'),contentKey=key(),assets=new Map();
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
 const name=process.env.VINLOOK_TEST_MONGO_CONTAINER;assert.match(name??'',/^vinlook-task019-mongo-[A-Za-z0-9_-]+$/);const[c]=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}));assert.equal(c.Config.Labels['vinlook.task'],'TASK-019');assert.equal(c.Config.Image,'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');const[binding]=c.NetworkSettings.Ports['27017/tcp'];assert.equal(binding.HostIp,'127.0.0.1');assert.match(binding.HostPort,/^[0-9]+$/);
 uri=`mongodb://127.0.0.1:${binding.HostPort}/vinlook_content_task019?replicaSet=vinlook_task019&directConnection=true`;
 connection=await mongoose.createConnection(uri,{autoCreate:false,autoIndex:false,serverSelectionTimeoutMS:3000}).asPromise();assert.equal((await connection.db.listCollections().toArray()).length,0);assert.equal((await connection.db.admin().command({hello:1})).setName,'vinlook_task019');models={...createContentModels(connection),...createDurabilityModels(connection),MediaUpload:createMediaModel(connection)};for(const m of Object.values(models)){await m.createCollection();await m.createIndexes();}
 identity=await mongoose.createConnection(uri.replace('/vinlook_content_task019?','/vinlook_identity_task019?'),{autoCreate:false,autoIndex:false}).asPromise();assert.equal((await identity.db.listCollections().toArray()).length,0);im=createIdentityModels(identity);for(const m of Object.values(im)){await m.createCollection();await m.createIndexes();}
 const config={jwtKey:randomBytes(32),rateKey:randomBytes(32),origins:['https://web.example.invalid'],proxyCidrs:[],issuer:'vinlook-identity:test',audience:'vinlook-staff:test'};identityConfig=config;const ir={...await createAuthRuntime(im,config,now),callers:loadServiceCredentials(config,{IDENTITY_CONTENT_SERVICE_KEY_B64URL:contentKey,IDENTITY_USAGE_SERVICE_KEY_B64URL:key()},clock)};
 staff=await im.StaffAccount.create({fullName:'Synthetic uploader',email:'uploader@example.invalid',role:'Staff',status:'active',authVersion:0,passwordHash:'$2b$12$'+'A'.repeat(53)});session=await im.WorkSession.create({staffId:staff._id,workDateVN:'2026-10-23',status:'open',openedAt:new Date(clock-1000)});token=await issueToken(staff,config,clock);principal={account:{id:String(staff._id)},currentWorkSession:{id:String(session._id)}};identityBase=await listen(identityApp(ir));
 const provider=express();provider.use(express.raw({type:()=>true,limit:4000000}));provider.use(async(req,res)=>{
  try{
   if(req.method==='POST'){
    uploadCalls++;if(providerMode==='quota')return res.status(429).json({error:{message:'private synthetic provider message'}});
    const form=await new Request('http://fixture.invalid',{method:'POST',body:req.body,headers:{'content-type':req.get('content-type')}}).formData();const publicId=form.get('public_id');assert.equal(form.get('overwrite'),'false');assert.equal(form.get('api_key'),providerConfig.key);assert.equal(form.get('signature'),createHash('sha256').update(`overwrite=false&public_id=${publicId}&timestamp=${form.get('timestamp')}&type=upload`+providerConfig.secret).digest('hex'));
    const bytes=Buffer.from(await form.get('file').arrayBuffer()),audio=req.path.includes('/video/');if(assets.has(publicId))return res.status(409).json({error:{message:'no overwrite'}});
    const row={bytes,metadata:{public_id:publicId,version:7,asset_id:'fixture-'+assets.size,resource_type:audio?'video':'image',type:'upload',format:audio?'mp3':'webp',bytes:bytes.length,created_at:new Date(clock).toISOString(),...(audio?{duration:bytes.length/208*1152/44100,audio:{channels:1}}:{width:16,height:12}),secure_url:'http://evil.invalid/never-fetch'}};assets.set(publicId,row);
    if(providerMode==='hold'){holdStarted();await new Promise(r=>holdRelease=r);}if(providerMode==='lost'){req.socket.destroy();return;}return res.json({public_id:publicId,version:7});
   }
   if(req.path.includes('/resources/')){
    adminCalls++;assert.equal(req.get('authorization'),'Basic '+Buffer.from(providerConfig.key+':'+providerConfig.secret).toString('base64'));const publicId=decodeURIComponent(req.path.split('/upload/')[1]);const asset=assets.get(publicId);if(!asset)return res.status(404).json({error:{message:'absent'}});if(providerMode==='adminfail')return res.status(503).json({error:{message:'private error'}});return res.json(asset.metadata);
   }
   cdnCalls++;const publicId=req.path.split('/upload/v7/')[1]?.replace(/\.(webp|mp3)$/,'');const asset=assets.get(publicId);if(!asset)return res.status(404).end();if(providerMode==='redirect')return res.redirect('http://127.0.0.1:1/forbidden');return res.end(providerMode==='corrupt'?Buffer.from('wrong bytes'):asset.bytes);
  }catch{res.status(500).json({error:{message:'fixture assertion failure'}});}
 });fixtureBase=await listen(provider);
 runtime={connection,models,authorization:{baseUrl:identityBase,key:contentKey},origins:['https://web.example.invalid'],now};runtime.media=createMediaService(runtime,createCloudinaryAdapter(providerConfig,{fetchImpl:transport}),{mode:'test'});runtime.verifyThumbnail=runtime.media.verifyThumbnail;runtime.attachThumbnail=runtime.media.attachThumbnail;base=await listen(createApp(runtime));sampler=setInterval(()=>{peakRss=Math.max(peakRss,process.memoryUsage().rss);},25);
});
after(async()=>{clearInterval(sampler);for(const s of servers){s.closeAllConnections();await new Promise(r=>s.close(r));}if(identity)await identity.close();if(connection)await connection.close();});
test('actual sixth catalog has immutable IDs/unique indexes/no TTL and read-only verification',async()=>{
 await verifyContentCatalog(connection,models);const indexes=await models.MediaUpload.collection.indexes();assert.equal(indexes.length,4);assert.equal(indexes.find(v=>v.key.uploadId===1).unique,true);assert.equal(indexes.find(v=>v.key.publicId===1).unique,true);assert.ok(indexes.some(v=>v.name==='_id_'));assert.ok(indexes.every(v=>v.expireAfterSeconds===undefined));
 const cfg=loadContentConfig('test',{CONTENT_MONGODB_URI:uri,IDENTITY_BASE_URL:identityBase,CONTENT_IDENTITY_SERVICE_KEY_B64URL:contentKey,CONTENT_ALLOWED_ORIGINS:'https://web.example.invalid'});const without=await connectContentRuntime(cfg);assert.equal(without.media,undefined);await without.close();
 const withMedia=await connectContentRuntime({...cfg,media:providerConfig});assert.ok(withMedia.media);await withMedia.close();assert.equal(uploadCalls,0);assert.equal(adminCalls,0);
});
test('staff issue/upload/attach proves canonical bytes/provider ownership and atomic first attachment',async()=>{
 const r=await draft();const id=await issue(r.revisionId);assert.equal((await models.POI.findById(r.poiId)).mutationVersion,0);const uploaded=await upload(id);assert.equal(uploaded.status,201);const ref=uploaded.body.data.asset;const status=await request('/admin/media-intents/'+id);assert.equal(status.body.data.width,16);assert.ok(status.body.data.bytes>0);assert.match(ref.url,/^https:\/\/res\.cloudinary\.com\/fixture_cloud\//);assert.equal(ref.format,'webp');assert.equal((await models.MediaUpload.findById(id)).attachedAt,null);
 const attached=await patch(r.revisionId,0,ref);assert.equal(attached.status,200);assert.ok((await models.MediaUpload.findById(id)).attachedAt);assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':r.poiId}),2);
 assert.equal((await upload(id)).status,200);assert.equal((await models.POIRevision.findById(r.revisionId)).editVersion,1);
});
test('fresh session/owner, stale version and expiry deny before any provider upload',async()=>{
 const r=await draft();const id=await issue(r.revisionId);const count=uploadCalls;await im.WorkSession.updateOne({_id:session._id},{$set:{status:'closed',closedAt:new Date(clock)}});assert.equal((await upload(id)).status,403);assert.equal((await request('/admin/media-intents/'+id)).status,200);await im.WorkSession.updateOne({_id:session._id},{$set:{status:'open',closedAt:null}});
 const oldClock=clock;clock+=900000;assert.equal((await upload(id)).status,409);clock=oldClock;assert.equal(uploadCalls,count);
 const next=await issue(r.revisionId);assert.equal((await request('/admin/revisions/'+r.revisionId,'PATCH',{expectedEditVersion:0,changes:{nameEN:'changed'}})).status,200);assert.equal((await upload(next)).status,409);assert.equal(uploadCalls,count);
});

test('invalid bytes and bad multipart reject durably without provider side effects',async()=>{
 const r=await draft();const id=await issue(r.revisionId),count=uploadCalls;assert.equal((await upload(id,Buffer.from('<svg/>'))).status,422);assert.equal((await models.MediaUpload.findById(id)).status,'rejected');assert.equal(uploadCalls,count);
 const other=await issue(r.revisionId);const form=new FormData();form.append('file',new Blob([await png()]));form.append('extra','forbidden');assert.equal((await request('/admin/media-intents/'+other+'/file','PUT',form)).status,400);assert.equal(uploadCalls,count);
});
test('one process slot bounds concurrent uploads; durable state prevents duplicate provider POST',async()=>{
 const r=await draft(),a=await issue(r.revisionId),b=await issue(r.revisionId);let started;const seen=new Promise(resolve=>started=resolve);holdStarted=started;providerMode='hold';const count=uploadCalls;
 const first=upload(a);await seen;const busy=await upload(b);assert.equal(busy.status,503);assert.equal(busy.headers.get('retry-after'),'5');holdRelease();assert.equal((await first).status,201);providerMode='normal';assert.equal(uploadCalls,count+1);
 const same=await upload(a);assert.equal(same.status,200);assert.equal(uploadCalls,count+1);
 assert.equal((await upload(a,await png({r:255,g:0,b:0}))).status,409);assert.equal(uploadCalls,count+1);
});
test('lost provider acknowledgement stays uncertain; actual new Node process reconciles without reupload',async()=>{
 const r=await draft(),id=await issue(r.revisionId);const count=uploadCalls;providerMode='lost';assert.equal((await upload(id)).status,503);providerMode='normal';assert.equal((await models.MediaUpload.findById(id)).status,'uncertain');assert.equal((await upload(id)).status,409);
 const child=spawn(process.execPath,[fileURLToPath(new URL('./media-reconcile-child.js',import.meta.url)),JSON.stringify({fixtureBase,id,principal,clock})],{windowsHide:true,stdio:['ignore','pipe','pipe']});let output='',errors='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>errors+=v);const timer=setTimeout(()=>child.kill(),15000);const[code]=await once(child,'close');clearTimeout(timer);assert.equal(code,0,errors);assert.equal(JSON.parse(output).status,'verified');assert.equal(uploadCalls,count+1);assert.equal((await models.MediaUpload.findById(id)).status,'verified');
});
test('quota/metadata/CDN corruption/redirect failures retain records and never automatically retry upload',async()=>{
 for(const mode of ['quota','adminfail','corrupt','redirect']){const r=await draft(),id=await issue(r.revisionId);const before=uploadCalls;providerMode=mode;assert.equal((await upload(id)).status,503);const stored=await models.MediaUpload.findById(id);assert.equal(stored.status,'uncertain');assert.equal(uploadCalls,before+1);assert.equal((await upload(id)).status,409);providerMode='normal';}
});
test('cross-POI or altered refs cannot attach; outbox failure atomically rolls back first attachedAt',async()=>{
 const a=await draft(),id=await issue(a.revisionId),result=await upload(id);assert.equal(result.status,201);const ref=result.body.data.asset;const b=await draft();assert.equal((await patch(b.revisionId,0,ref)).status,422);assert.equal((await patch(a.revisionId,0,{...ref,url:'https://evil.invalid/x.webp'})).status,422);
 const create=models.AuditOutbox.create;models.AuditOutbox.create=async()=>{throw Error('synthetic audit failure');};try{assert.equal((await patch(a.revisionId,0,ref)).status,503);}finally{models.AuditOutbox.create=create;}
 assert.equal((await models.MediaUpload.findById(id)).attachedAt,null);assert.equal((await models.POIRevision.findById(a.revisionId)).thumbnailAsset,null);assert.equal((await models.POI.findById(a.poiId)).mutationVersion,0);assert.equal((await patch(a.revisionId,0,ref)).status,200);
});
test('immutable replacements keep previous verified/provider asset and never overwrite published-looking graph',async()=>{
 const r=await draft(),id=await issue(r.revisionId),old=await upload(id);assert.equal(old.status,201);assert.equal((await patch(r.revisionId,0,old.body.data.asset)).status,200);
 const rev=await models.POIRevision.findById(r.revisionId);rev.status='published';rev.entrance=rev.location;await rev.save();await models.POI.updateOne({_id:r.poiId},{$set:{publishedRevisionId:r.revisionId}});const before=JSON.stringify(await models.POIRevision.findById(r.revisionId).lean());
 const clone=await request('/admin/pois/'+r.poiId+'/draft','POST',{expectedPublishedRevisionId:r.revisionId},{'Idempotency-Key':randomUUID()});assert.equal(clone.status,201);const next=clone.body.data.revisionId;const nextId=await issue(next);const replacement=await upload(nextId);assert.equal(replacement.status,201);assert.notEqual(replacement.body.data.asset.publicId,old.body.data.asset.publicId);assert.equal((await patch(next,0,replacement.body.data.asset)).status,200);
 assert.equal(JSON.stringify(await models.POIRevision.findById(r.revisionId).lean()),before);assert.ok(assets.has(old.body.data.asset.publicId));assert.equal((await models.MediaUpload.findById(id)).status,'verified');
});
test('trusted internal audio primitive validates versions, MP3 mono and current source; public audio upload forbidden',async()=>{
 const r=await draft();const snapshot={revisionId:r.revisionId,expectedEditVersion:0,jobId:String(new mongoose.Types.ObjectId()),languageCode:'en',sourceVersion:1,textVersion:1,registryVersion:'fixture-v1',voiceOrModelId:'synthetic-voice'};
 await assert.rejects(runtime.media.issueAudio({...snapshot,textVersion:2},principal),{status:409});const row=await runtime.media.issueAudio(snapshot,principal);assert.equal((await upload(String(row._id),mp3())).status,403);
 const result=await runtime.media.upload(String(row._id),principal,async()=>mp3());assert.equal(result.status,201);assert.ok(result.data.durationSeconds>=90&&result.data.durationSeconds<=150);
 assert.ok(await runtime.media.verifyAudioReference(result.data.asset,{poiId:r.poiId,sourceVersion:1,textVersion:1,languageCode:'en'}));assert.equal(await runtime.media.verifyAudioReference(result.data.asset,{poiId:r.poiId,sourceVersion:2,textVersion:1,languageCode:'en'}),false);
});
test('provider-completed late result remains unattached when revision changes in flight',async()=>{
 const r=await draft(),id=await issue(r.revisionId);let started;const seen=new Promise(resolve=>started=resolve);holdStarted=started;providerMode='hold';const pending=upload(id);await seen;
 assert.equal((await request('/admin/revisions/'+r.revisionId,'PATCH',{expectedEditVersion:0,changes:{nameEN:'Changed while uploading'}})).status,200);holdRelease();const result=await pending;providerMode='normal';assert.equal(result.status,201);assert.equal((await models.MediaUpload.findById(id)).attachedAt,null);assert.equal((await patch(r.revisionId,0,result.body.data.asset)).status,409);
});
test('read-only reconciliation errors remain uncertain, no expiry cleanup and no hidden provider retry',async()=>{
 const r=await draft(),id=await issue(r.revisionId);providerMode='lost';assert.equal((await upload(id)).status,503);providerMode='adminfail';const before=uploadCalls;assert.equal((await request('/admin/media-intents/'+id+'/reconcile','POST',{})).status,503);assert.equal(uploadCalls,before);assert.equal((await models.MediaUpload.findById(id)).status,'uncertain');providerMode='normal';assert.equal((await request('/admin/media-intents/'+id+'/reconcile','POST',{})).status,200);
});
test('observed single-upload memory and provider call counts are recorded without a Render claim',t=>{
 assert.ok(peakRss>0);assert.ok(uploadCalls>0&&adminCalls>0&&cdnCalls>0);t.diagnostic(`Windows fixture parent peak sampled RSS ${peakRss} bytes; uploads ${uploadCalls}; admin reads ${adminCalls}; original reads ${cdnCalls}; no real provider calls`);
});

test('explicit cancellation after provider side effect retains digest for safe reconciliation',async()=>{
 const r=await draft(),id=await issue(r.revisionId);let bodyRead=false;await assert.rejects(runtime.media.upload(id,principal,async()=>{bodyRead=true;return png();},{deadline:Date.now()-1}));assert.equal(bodyRead,false);assert.equal((await models.MediaUpload.findById(id)).status,'issued');let started;const seen=new Promise(resolve=>started=resolve);holdStarted=started;providerMode='hold';const controller=new AbortController(),before=uploadCalls;
 const pending=runtime.media.upload(id,principal,async()=>png(),{signal:controller.signal});await seen;controller.abort();await assert.rejects(pending);holdRelease();providerMode='normal';
 const stored=await models.MediaUpload.findById(id);assert.ok(['uploading','uncertain'].includes(stored.status));assert.ok(stored.sha256);assert.equal(uploadCalls,before+1);
 const old=clock;clock+=90001;assert.equal((await runtime.media.reconcile(id,principal)).status,'verified');clock=old;assert.equal(uploadCalls,before+1);
});

test('another active staff may read shared status but cannot upload someone else intent; deleted parent blocks admission',async()=>{
 const r=await draft(),id=await issue(r.revisionId),count=uploadCalls;
 const other=await im.StaffAccount.create({fullName:'Other uploader',email:'other-uploader@example.invalid',role:'Staff',status:'active',authVersion:0,passwordHash:'$2b$12$'+'A'.repeat(53)});
 await im.WorkSession.create({staffId:other._id,workDateVN:'2026-10-23',status:'open',openedAt:new Date(clock-1000)});
 const original=token;try{token=await issueToken(other,identityConfig,clock);assert.equal((await request('/admin/media-intents/'+id)).status,200);assert.equal((await upload(id)).status,404);}finally{token=original;}
 await models.POI.updateOne({_id:r.poiId},{$set:{deletedAt:new Date(clock),deletedBy:staff._id},$inc:{mutationVersion:1}});assert.equal((await upload(id)).status,409);assert.equal(uploadCalls,count);
});
