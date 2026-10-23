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
import {languageCodes} from '../src/models/index.js';
import {createLifecycleService} from '../src/lifecycle/service.js';
import {createPublicService} from '../src/public/service.js';
import {createPublicationService} from '../src/publication/service.js';
let connection,identity,models,im,staff,session,token,base,identityBase,runtime,uri,clock=Date.parse('2026-10-23T12:00:00.000Z');
const servers=[],now=()=>clock,key=()=>randomBytes(32).toString('base64url');const contentKey=key();
const input=()=>({nameEN:'Synthetic museum',sourceTextEN:'English source',location:{type:'Point',coordinates:[106.7,10.78]}});
async function listen(app){const s=app.listen(0,'127.0.0.1');servers.push(s);await once(s,'listening');return`http://127.0.0.1:${s.address().port}`;}
async function request(path,method='GET',body,headers={}){
 const response=await fetch(base+'/api/v1'+path,{method,headers:{Authorization:'Bearer '+token,...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body)});
 const result=await response.json();assert.equal(response.headers.get('cache-control'),'no-store');assert.match(result.requestId??result.error?.requestId,/^[a-f0-9-]{36}$/);assert.equal(JSON.stringify(result).includes('passwordHash'),false);return{status:response.status,body:result,headers:response.headers};
}
const create=(value=input(),uuid=randomUUID())=>request('/admin/pois','POST',value,{'Idempotency-Key':uuid});
const patch=(id,version,changes)=>request('/admin/revisions/'+id,'PATCH',{expectedEditVersion:version,changes});
const language=(id,version,text,code='vi')=>request(`/admin/revisions/${id}/languages/${code}`,'PATCH',{expectedEditVersion:version,text});
async function published(name='Synthetic museum',coordinates=[106.7,10.78]){
 const r=await create({...input(),nameEN:name,location:{type:'Point',coordinates}});assert.equal(r.status,201);const {poiId,revisionId}=r.body.data;
 const rev=await models.POIRevision.findById(revisionId);rev.status='published';rev.entrance=rev.location;rev.thumbnailAsset=asset();await rev.save();
 for(const languageCode of languageCodes){const value=approved({revisionId,languageCode,text:languageCode==='en'?rev.sourceTextEN:'Synthetic '+languageCode,reviewedBy:staff._id});value.audioAsset={...value.audioAsset,format:'mp3',url:'https://media.example.invalid/synthetic/v1/audio.mp3'};await models.LocalizedContent.findOneAndUpdate({revisionId,languageCode},{$set:value},{upsert:true});}
 await models.POI.updateOne({_id:poiId},{$set:{publishedRevisionId:revisionId}});return {poiId,revisionId};
}
async function role(value){await im.StaffAccount.updateOne({_id:staff._id},{$set:{role:value}});}
const lifecycle=(r,action,version=0,uuid=randomUUID())=>request(`/admin/pois/${r.poiId}/${action}`,'POST',{expectedMutationVersion:version},{'Idempotency-Key':uuid});
async function visitor(path){const res=await fetch(base+'/api/v1'+path);const body=await res.json();assert.equal(res.headers.get('cache-control'),'no-store');assert.equal(JSON.stringify(body).includes('reviewedBy'),false);assert.equal(JSON.stringify(body).includes('mutationVersion'),false);return {status:res.status,body};}
before(async()=>{
 const name=process.env.VINLOOK_TEST_MONGO_CONTAINER;assert.match(name??'',/^vinlook-task014-mongo-[A-Za-z0-9_-]+$/);
 const [c]=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}));assert.equal(c.Config.Labels['vinlook.task'],'TASK-014');assert.equal(c.Config.Image,'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');const[binding]=c.NetworkSettings.Ports['27017/tcp'];assert.equal(binding.HostIp,'127.0.0.1');assert.match(binding.HostPort,/^[0-9]+$/);
 uri=`mongodb://127.0.0.1:${binding.HostPort}/vinlook_content_task014?replicaSet=vinlook_task014&directConnection=true`;
 connection=await mongoose.createConnection(uri,{autoCreate:false,autoIndex:false,serverSelectionTimeoutMS:3000}).asPromise();assert.equal((await connection.db.listCollections().toArray()).length,0);assert.equal((await connection.db.admin().command({hello:1})).setName,'vinlook_task014');models={...createContentModels(connection),...createDurabilityModels(connection)};
 for(const m of Object.values(models)){await m.createCollection();await m.createIndexes();}
 identity=await mongoose.createConnection(uri.replace('/vinlook_content_task014?','/vinlook_identity_task014?'),{autoCreate:false,autoIndex:false}).asPromise();assert.equal((await identity.db.listCollections().toArray()).length,0);im=createIdentityModels(identity);for(const m of Object.values(im)){await m.createCollection();await m.createIndexes();}
 const config={jwtKey:randomBytes(32),rateKey:randomBytes(32),origins:['https://web.example.invalid'],proxyCidrs:[],issuer:'vinlook-identity:test',audience:'vinlook-staff:test'};
 const ir={...await createAuthRuntime(im,config,now),callers:loadServiceCredentials(config,{IDENTITY_CONTENT_SERVICE_KEY_B64URL:contentKey,IDENTITY_USAGE_SERVICE_KEY_B64URL:key()},clock)};
 staff=await im.StaffAccount.create({fullName:'Synthetic editor',email:'editor@example.invalid',role:'Staff',status:'active',authVersion:0,passwordHash:'$2b$12$'+'A'.repeat(53)});
 session=await im.WorkSession.create({staffId:staff._id,workDateVN:'2026-10-23',status:'open',openedAt:new Date(clock-1000)});token=await issueToken(staff,config,clock);identityBase=await listen(identityApp(ir));
 runtime={connection,models,publicCursorKey:randomBytes(32),authorization:{baseUrl:identityBase,key:contentKey},origins:['https://web.example.invalid'],now,verifyThumbnail:async ref=>ref.publicId==='synthetic/asset-v1'};base=await listen(createApp(runtime));
});
after(async()=>{for(const s of servers){s.closeAllConnections();await new Promise(r=>s.close(r));}if(identity)await identity.close();if(connection)await connection.close();});
test('public exact published payload needs no login or Identity/provider calls; draft and locale do not leak',async()=>{
 const r=await published(),draft=await create();const old=runtime.authorization.key;runtime.authorization.key=key();
 try{
  const out=await visitor('/pois/'+r.poiId+'?language=vi');assert.equal(out.status,200);assert.equal(out.body.data.languageCode,'vi');assert.equal(out.body.data.text,'Synthetic vi');assert.deepEqual(Object.keys(out.body.data).sort(),['id','revisionId','nameEN','location','entrance','thumbnail','languageCode','text','audio'].sort());
  assert.equal((await visitor('/pois/'+draft.body.data.poiId)).status,404);assert.equal((await visitor('/pois/'+String(new mongoose.Types.ObjectId()))).status,404);
 }finally{runtime.authorization.key=old;}
 assert.equal((await visitor('/pois/'+r.poiId+'?language=unknown')).status,422);
});
test('Manager soft delete is atomic/idempotent and withdrawal retains history; replay rechecks authority',async()=>{
 const r=await published(),uuid=randomUUID();const before=JSON.stringify(await models.POIRevision.findById(r.revisionId).lean()),rows=JSON.stringify(await models.LocalizedContent.find({revisionId:r.revisionId}).sort({languageCode:1}).lean());
 await role('Staff');assert.equal((await lifecycle(r,'delete',0,uuid)).status,403);await role('Manager');
 const out=await lifecycle(r,'delete',0,uuid);assert.equal(out.status,200);assert.deepEqual((await lifecycle(r,'delete',0,uuid)).body.data,out.body.data);
 assert.equal((await visitor('/pois/'+r.poiId)).status,404);assert.ok((await visitor('/pois/deletions')).body.data.poiIds.includes(r.poiId));
 assert.equal((await lifecycle(r,'delete',1)).body.error.code,'POI_ALREADY_DELETED');assert.equal((await lifecycle(r,'delete',1,uuid)).status,409);
 assert.equal(JSON.stringify(await models.POIRevision.findById(r.revisionId).lean()),before);assert.equal(JSON.stringify(await models.LocalizedContent.find({revisionId:r.revisionId}).sort({languageCode:1}).lean()),rows);
 assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':r.poiId,'payload.action':'poi.delete'}),1);
 await role('Staff');assert.equal((await lifecycle(r,'delete',0,uuid)).status,403);await role('Manager');
});
test('restore published-only POI clones draft with approvals reset; withdrawal stays until republish',async()=>{
 const r=await published();await lifecycle(r,'delete');const old=JSON.stringify(await models.POIRevision.findById(r.revisionId).lean());const uuid=randomUUID();const out=await lifecycle(r,'restore',1,uuid);assert.equal(out.status,200);const next=out.body.data.revisionId;assert.notEqual(next,r.revisionId);assert.equal(out.body.data.editVersion,0);
 assert.deepEqual((await lifecycle(r,'restore',1,uuid)).body.data,out.body.data);assert.equal((await models.POI.findById(r.poiId)).publishedRevisionId,null);assert.equal((await models.POIRevision.findById(next)).status,'draft');assert.equal(JSON.stringify(await models.POIRevision.findById(r.revisionId).lean()),old);
 const rows=await models.LocalizedContent.find({revisionId:next});assert.equal(rows.length,16);for(const row of rows){assert.equal(row.reviewStatus,'pending');assert.equal(row.reviewedBy,null);assert.equal(row.reviewedAt,null);assert.ok(row.audioAsset);assert.equal(row.textVersion,1);}
 assert.equal((await visitor('/pois/'+r.poiId)).status,404);assert.ok((await visitor('/pois/deletions')).body.data.poiIds.includes(r.poiId));
 // Synthetic later publish fixture only; real publication gate is covered in TASK013 tests.
 await models.POIRevision.updateOne({_id:next},{$set:{status:'published'}});await models.LocalizedContent.updateMany({revisionId:next},{$set:{reviewStatus:'approved',reviewedBy:staff._id,reviewedAt:new Date(clock)}});await models.POI.updateOne({_id:r.poiId},{$set:{publishedRevisionId:next}});
 assert.equal((await visitor('/pois/'+r.poiId)).status,200);assert.equal((await visitor('/pois/deletions')).body.data.poiIds.includes(r.poiId),false);
});
test('restore reuses working draft/in_review; never-published draft is not a public withdrawal after restore',async()=>{
 for(const status of ['draft','in_review']){
  const r=(await create()).body.data;await models.POIRevision.updateOne({_id:r.revisionId},{$set:{status}});assert.equal((await lifecycle(r,'delete')).status,200);assert.equal((await lifecycle(r,'restore',1)).body.data.revisionId,r.revisionId);assert.equal((await models.POIRevision.findById(r.revisionId)).editVersion,1);assert.equal((await models.POIRevision.findById(r.revisionId)).status,'draft');assert.equal((await visitor('/pois/deletions')).body.data.poiIds.includes(r.poiId),false);
 }
});
test('public search is literal English name; signed pagination binds snapshot/filter/expiry',async()=>{
 const a=await published('Cursor series A'),b=await published('Cursor series B');await published('Literal [.*] museum');
 const first=await visitor('/pois?q=Cursor%20series&limit=1');assert.equal(first.status,200);assert.equal(first.body.data.items.length,1);assert.ok(first.body.data.nextCursor);
 const token=encodeURIComponent(first.body.data.nextCursor),second=await visitor('/pois?q=Cursor%20series&limit=1&cursor='+token);assert.equal(second.status,200);assert.equal(second.body.data.items.length,1);assert.notEqual(second.body.data.items[0].id,first.body.data.items[0].id);assert.equal(second.body.data.nextCursor,null);
 assert.equal((await visitor('/pois?q=Cursor%20series&limit=2&cursor='+token)).body.error.code,'INVALID_CURSOR');assert.equal((await visitor('/pois?q=Cursor%20series&limit=1&cursor='+token+'x')).status,422);
 await published('Cursor series C');assert.equal((await visitor('/pois?q=Cursor%20series&limit=1&cursor='+token)).body.error.code,'PUBLIC_SNAPSHOT_CHANGED');
 const original=clock;clock+=900000;assert.equal((await visitor('/pois?q=Cursor%20series&limit=1&cursor='+token)).status,410);clock=original;
 const exact=await visitor('/pois?q=%5B.*%5D');assert.equal(exact.body.data.items.length,1);assert.equal(exact.body.data.items[0].nameEN,'Literal [.*] museum');
 assert.equal((await visitor('/pois?language=en&language=vi')).status,422);assert.equal((await visitor('/pois?q[$regex]=x')).status,422);
});
test('nearby uses current published markers only, actual counts, max4 and strict3km',async()=>{
 const origin=[0,0],lat=3000/6371008.8*180/Math.PI;
 const one=await published('Nearby zero',origin),two=await published('Nearby tie A',[0.001,0]),three=await published('Nearby tie B',[-0.001,0]);await published('Nearby boundary',[0,lat]);await published('Nearby outside',[0,lat+0.000001]);
 const out=await visitor('/pois/nearby?lat=0&lon=0');assert.equal(out.status,200);assert.equal(out.body.data.actualCount,4);assert.equal(out.body.data.items[0].id,one.poiId);assert.deepEqual(out.body.data.items.slice(1,3).map(v=>v.id),[two.poiId,three.poiId].sort());assert.equal(out.body.data.items[3].straightLineDistanceMeters,3000);
 assert.equal((await visitor('/pois/nearby?lat=0&lon=0&limit=1')).body.data.actualCount,1);assert.equal((await visitor('/pois/nearby?lat=80&lon=80')).body.data.actualCount,0);assert.equal((await visitor('/pois/nearby?lat=0&lon=0&radius=4000')).status,422);
 assert.equal(await models.POI.collection.countDocuments({lat:{$exists:true}}),0);
});
test('same-version deletes converge only for identical key; fresh session/lock gates writes',async()=>{
 const r=await published(),uuid=randomUUID();const same=await Promise.all([lifecycle(r,'delete',0,uuid),lifecycle(r,'delete',0,uuid)]);assert.ok(same.every(v=>v.status===200));assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':r.poiId,'payload.action':'poi.delete'}),1);
 const other=await published();const conflict=await Promise.all([lifecycle(other,'delete'),lifecycle(other,'delete')]);assert.deepEqual(conflict.map(v=>v.status).sort(),[200,409]);
 await im.WorkSession.updateOne({_id:session._id},{$set:{status:'closed',closedAt:new Date(clock)}});assert.equal((await lifecycle(r,'restore',1)).status,403);await im.WorkSession.updateOne({_id:session._id},{$set:{status:'open',closedAt:null}});
 await im.StaffAccount.updateOne({_id:staff._id},{$set:{status:'locked'}});assert.equal((await lifecycle(r,'restore',1)).status,403);await im.StaffAccount.updateOne({_id:staff._id},{$set:{status:'active'}});
});
test('outbox failure rolls back delete and restore and leaves public history/pointer unchanged',async()=>{
 for(const restore of [false,true]){
  const r=await published();if(restore)await lifecycle(r,'delete');const poi=JSON.stringify(await models.POI.findById(r.poiId).lean()),revisions=await models.POIRevision.countDocuments({poiId:r.poiId});const fn=models.AuditOutbox.create;
  models.AuditOutbox.create=async()=>{throw Error('synthetic private failure');};try{assert.equal((await lifecycle(r,restore?'restore':'delete',restore?1:0)).status,503);}finally{models.AuditOutbox.create=fn;}
  assert.equal(JSON.stringify(await models.POI.findById(r.poiId).lean()),poi);assert.equal(await models.POIRevision.countDocuments({poiId:r.poiId}),revisions);
 }
});
test('corrupt published locale fails safely without fallback or partial public list; tombstone route is reserved',async()=>{
 const r=await published('Temporarily corrupt');await models.LocalizedContent.deleteOne({revisionId:r.revisionId,languageCode:'vi'});
 try{assert.equal((await visitor('/pois/'+r.poiId)).status,503);assert.equal((await visitor('/pois?language=en')).status,503);}finally{await lifecycle(r,'delete');}
 assert.equal((await visitor('/pois/deletions?limit=1')).status,422);const data=(await visitor('/pois/deletions')).body.data;assert.equal(data.complete,true);assert.deepEqual(data.poiIds,[...new Set(data.poiIds)].sort());assert.ok(data.snapshotId);assert.equal(Object.keys(data).includes('deletedBy'),false);
});
test('missing/corrupt restore source, overflow and unknown replay never fabricate recovery',async()=>{
 const r=await published();await lifecycle(r,'delete');await models.POI.updateOne({_id:r.poiId},{$set:{publishedRevisionId:new mongoose.Types.ObjectId()}});assert.equal((await lifecycle(r,'restore',1)).body.error.code,'CONTENT_STATE_UNAVAILABLE');
 const overflow=(await create()).body.data;await models.POI.updateOne({_id:overflow.poiId},{$set:{mutationVersion:Number.MAX_SAFE_INTEGER}});assert.equal((await lifecycle(overflow,'delete',Number.MAX_SAFE_INTEGER)).body.error.code,'VERSION_EXHAUSTED');
 const unknown=(await create()).body.data,uuid=randomUUID();await models.IdempotencyRecord.create({actorId:staff._id,operation:'poi.delete',key:uuid,requestHash:'a'.repeat(64),status:'in_progress',createdAt:new Date(clock),expiresAt:new Date(clock+86400000)});assert.equal((await lifecycle(unknown,'delete',0,uuid)).body.error.code,'IDEMPOTENCY_RECONCILIATION_REQUIRED');
});
test('runtime without cursor key fails public closed while admin stays active; key validation is read-only',async()=>{
 const unavailable=await listen(createApp({...runtime,publicCursorKey:null}));const response=await fetch(unavailable+'/api/v1/pois');assert.equal(response.status,503);const admin=await fetch(unavailable+'/api/v1/admin/pois/'+(await create()).body.data.poiId,{headers:{Authorization:'Bearer '+token}});assert.equal(admin.status,200);
 const config=loadContentConfig('test',{CONTENT_MONGODB_URI:uri,IDENTITY_BASE_URL:identityBase,CONTENT_IDENTITY_SERVICE_KEY_B64URL:contentKey,CONTENT_ALLOWED_ORIGINS:'https://web.example.invalid',CONTENT_PUBLIC_CURSOR_KEY_B64URL:runtime.publicCursorKey.toString('base64url')});const connected=await connectContentRuntime(config);try{assert.equal(connected.publicCursorKey.length,32);await verifyContentCatalog(connected.connection,connected.models);}finally{await connected.close();}
});
test('real parent write serializes delete against concurrent draft save',async()=>{
 const r=(await create()).body.data;let entered,release;const seen=new Promise(r=>entered=r),wait=new Promise(r=>release=r);const original=models.POI.updateOne;let pause=true;
 models.POI.updateOne=function(filter,update,opts){if(pause&&String(filter._id)===r.poiId&&opts?.session){pause=false;return(async()=>{entered();await wait;return original.call(this,filter,update,opts);})();}return original.call(this,filter,update,opts);};
 try{
  const deleting=lifecycle(r,'delete');await Promise.race([seen,deleting.then(out=>{throw Error('Guard not reached '+JSON.stringify(out));})]);assert.equal((await patch(r.revisionId,0,{sourceTextEN:'Concurrent source'})).status,200);release();const out=await deleting;assert.equal(out.status,409);assert.equal(out.body.error.code,'EDIT_VERSION_CONFLICT');
 }finally{release();models.POI.updateOne=original;}
 assert.equal((await models.POI.findById(r.poiId)).deletedAt,null);assert.equal((await models.POIRevision.findById(r.revisionId)).sourceTextEN,'Concurrent source');
});
test('snapshot read stays consistent across concurrent delete; next cursor cannot mix generations',async()=>{
 const a=await published('Snapshot pair A'),b=await published('Snapshot pair B');let entered,release;const seen=new Promise(r=>entered=r),wait=new Promise(r=>release=r);const original=models.LocalizedContent.find;let pause=true;
 models.LocalizedContent.find=function(...args){const q=original.apply(this,args);if(pause){pause=false;const exec=q.exec.bind(q);q.exec=async()=>{entered();await wait;return exec();};}return q;};
 try{
  const pending=visitor('/pois?q=Snapshot%20pair&limit=1');await Promise.race([seen,pending.then(out=>{throw Error('Read not reached '+JSON.stringify(out));})]);assert.equal((await lifecycle(b,'delete')).status,200);release();const out=await pending;assert.equal(out.status,200);assert.ok(out.body.data.nextCursor);assert.equal(out.body.data.items[0].id,a.poiId);
  assert.equal((await visitor('/pois?q=Snapshot%20pair&limit=1&cursor='+encodeURIComponent(out.body.data.nextCursor))).body.error.code,'PUBLIC_SNAPSHOT_CHANGED');
 }finally{release();models.LocalizedContent.find=original;}
});
test('1000POI scan limit refuses a complete snapshot rather than silently truncating',async()=>{
 const ids=Array.from({length:1001},()=>new mongoose.Types.ObjectId());await models.POI.collection.insertMany(ids.map(_id=>({_id,mutationVersion:0,publishedRevisionId:null,deletedAt:null,deletedBy:null,createdAt:new Date(clock)})));
 try{const out=await visitor('/pois/deletions');assert.equal(out.status,503);assert.equal(out.body.data,undefined);assert.equal((await visitor('/pois')).status,503);}
 finally{await models.POI.collection.deleteMany({_id:{$in:ids}});}
});
test('8MiB projected-data budget rejects oversized public snapshot without a partial page',async()=>{
 const source=await published('Synthetic large template'),poi=await models.POI.findById(source.poiId).lean(),rev=await models.POIRevision.findById(source.revisionId).lean(),rows=await models.LocalizedContent.find({revisionId:source.revisionId}).lean();
 const parents=[],revisions=[],localized=[];const text='文'.repeat(20000);
 for(let i=0;i<145;i++){
  const poiId=new mongoose.Types.ObjectId(),revisionId=new mongoose.Types.ObjectId();parents.push({...poi,_id:poiId,publishedRevisionId:revisionId});revisions.push({...rev,_id:revisionId,poiId,sourceTextEN:text});
  for(const row of rows)localized.push({...row,_id:new mongoose.Types.ObjectId(),revisionId,text:row.languageCode==='en'?text:row.text});
 }
 await models.POI.collection.insertMany(parents);await models.POIRevision.collection.insertMany(revisions);await models.LocalizedContent.collection.insertMany(localized);
 try{const out=await visitor('/pois?limit=1');assert.equal(out.status,503);assert.equal(out.body.data,undefined);}
 finally{await models.LocalizedContent.collection.deleteMany({revisionId:{$in:revisions.map(r=>r._id)}});await models.POIRevision.collection.deleteMany({_id:{$in:revisions.map(r=>r._id)}});await models.POI.collection.deleteMany({_id:{$in:parents.map(p=>p._id)}});}
});
test('restore reuses a working clone and resets copied approvals; corrupt historical English blocks recovery',async()=>{
 for(const corrupt of [false,true]){
  const r=await published(),clone=await request(`/admin/pois/${r.poiId}/draft`,'POST',{expectedPublishedRevisionId:r.revisionId},{'Idempotency-Key':randomUUID()});assert.equal(clone.status,201);const next=clone.body.data.revisionId;
  await models.POIRevision.updateOne({_id:next},{$set:{status:'in_review'}});assert.equal((await lifecycle(r,'delete',1)).status,200);
  if(corrupt)await models.LocalizedContent.updateOne({revisionId:r.revisionId,languageCode:'en'},{$set:{text:'Corrupted historical source'}});
  const out=await lifecycle(r,'restore',2);assert.equal(out.status,corrupt?503:200);
  if(!corrupt){assert.equal(out.body.data.revisionId,next);assert.equal(out.body.data.editVersion,1);for(const row of await models.LocalizedContent.find({revisionId:next})){assert.equal(row.reviewStatus,'pending');assert.equal(row.reviewedBy,null);}assert.ok((await visitor('/pois/deletions')).body.data.poiIds.includes(r.poiId));}
  else{assert.ok((await models.POI.findById(r.poiId)).deletedAt);assert.equal((await models.POIRevision.findById(next)).status,'in_review');}
 }
});
test('delete parent counter conflicts with actual publication transaction without hiding newly published data',async()=>{
 const r=await published(),clone=await request(`/admin/pois/${r.poiId}/draft`,'POST',{expectedPublishedRevisionId:r.revisionId},{'Idempotency-Key':randomUUID()});const next=clone.body.data.revisionId;await models.POIRevision.updateOne({_id:next},{$set:{status:'in_review'}});
 const fixtureRuntime={...runtime,publicationRegistry:{registryVersion:'fixture-registry-v1',languages:Object.fromEntries(languageCodes.map(c=>[c,{voiceOrModelId:'synthetic-model'}]))},verifyThumbnail:async()=>true,media:{verifyAudioReference:async()=>({durationSeconds:120})}};
 const publisher=createPublicationService(fixtureRuntime),principal={account:{id:String(staff._id),role:'Manager'},currentWorkSession:{id:String(session._id)}};
 let entered,release;const seen=new Promise(r=>entered=r),wait=new Promise(r=>release=r);const original=models.POI.updateOne;let pause=true;
 models.POI.updateOne=function(filter,update,opts){if(pause&&String(filter._id)===r.poiId&&opts?.session){pause=false;return(async()=>{entered();await wait;return original.call(this,filter,update,opts);})();}return original.call(this,filter,update,opts);};
 try{
  const deleting=lifecycle(r,'delete',1);await Promise.race([seen,deleting.then(out=>{throw Error('Guard not reached '+JSON.stringify(out));})]);
  const published=await publisher.publish(next,{expectedEditVersion:0,expectedPublishedRevisionId:r.revisionId,confirmGeography:true},principal,randomUUID(),{deadline:Date.now()+60000,signal:new AbortController().signal});assert.equal(published.status,200);release();assert.equal((await deleting).status,409);
 }finally{release();models.POI.updateOne=original;}
 assert.equal((await models.POI.findById(r.poiId)).deletedAt,null);assert.equal((await visitor('/pois/'+r.poiId)).body.data.revisionId,next);
});
