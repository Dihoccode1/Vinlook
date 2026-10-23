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
async function published(){
 const r=await create();assert.equal(r.status,201);const {poiId,revisionId}=r.body.data;
 const rev=await models.POIRevision.findById(revisionId);rev.status='published';rev.entrance=rev.location;rev.thumbnailAsset=asset();await rev.save();
 const en=await models.LocalizedContent.findOne({revisionId,languageCode:'en'});Object.assign(en,approved({revisionId,languageCode:'en',text:rev.sourceTextEN,reviewedBy:staff._id}));await en.save();
 await models.LocalizedContent.create(approved({revisionId,languageCode:'vi',text:'Synthetic Vietnamese',reviewedBy:staff._id}));await models.POI.updateOne({_id:poiId},{$set:{publishedRevisionId:revisionId}});return{poiId,revisionId};
}
before(async()=>{
 const name=process.env.VINLOOK_TEST_MONGO_CONTAINER;assert.match(name??'',/^vinlook-task012-mongo-[A-Za-z0-9_-]+$/);
 const [c]=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}));assert.equal(c.Config.Labels['vinlook.task'],'TASK-012');assert.equal(c.Config.Image,'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');const[binding]=c.NetworkSettings.Ports['27017/tcp'];assert.equal(binding.HostIp,'127.0.0.1');assert.match(binding.HostPort,/^[0-9]+$/);
 uri=`mongodb://127.0.0.1:${binding.HostPort}/vinlook_content_task012?replicaSet=vinlook_task012&directConnection=true`;
 connection=await mongoose.createConnection(uri,{autoCreate:false,autoIndex:false,serverSelectionTimeoutMS:3000}).asPromise();assert.equal((await connection.db.listCollections().toArray()).length,0);assert.equal((await connection.db.admin().command({hello:1})).setName,'vinlook_task012');models={...createContentModels(connection),...createDurabilityModels(connection)};
 for(const m of Object.values(models)){await m.createCollection();await m.createIndexes();}
 identity=await mongoose.createConnection(uri.replace('/vinlook_content_task012?','/vinlook_identity_task012?'),{autoCreate:false,autoIndex:false}).asPromise();assert.equal((await identity.db.listCollections().toArray()).length,0);im=createIdentityModels(identity);for(const m of Object.values(im)){await m.createCollection();await m.createIndexes();}
 const config={jwtKey:randomBytes(32),rateKey:randomBytes(32),origins:['https://web.example.invalid'],proxyCidrs:[],issuer:'vinlook-identity:test',audience:'vinlook-staff:test'};
 const ir={...await createAuthRuntime(im,config,now),callers:loadServiceCredentials(config,{IDENTITY_CONTENT_SERVICE_KEY_B64URL:contentKey,IDENTITY_USAGE_SERVICE_KEY_B64URL:key()},clock)};
 staff=await im.StaffAccount.create({fullName:'Synthetic editor',email:'editor@example.invalid',role:'Staff',status:'active',authVersion:0,passwordHash:'$2b$12$'+'A'.repeat(53)});
 session=await im.WorkSession.create({staffId:staff._id,workDateVN:'2026-10-23',status:'open',openedAt:new Date(clock-1000)});token=await issueToken(staff,config,clock);identityBase=await listen(identityApp(ir));
 runtime={connection,models,authorization:{baseUrl:identityBase,key:contentKey},origins:['https://web.example.invalid'],now,verifyThumbnail:async ref=>ref.publicId==='synthetic/asset-v1'};base=await listen(createApp(runtime));
});
after(async()=>{for(const s of servers){s.closeAllConnections();await new Promise(r=>s.close(r));}if(identity)await identity.close();if(connection)await connection.close();});
test('catalog verification is read-only and rejects missing parent counter/index',async()=>{
 await verifyContentCatalog(connection,models);const raw=await models.POI.collection.insertOne({});await assert.rejects(verifyContentCatalog(connection,models));assert.equal((await models.POI.collection.findOne({_id:raw.insertedId})).mutationVersion,undefined);await models.POI.collection.deleteOne({_id:raw.insertedId});
 const index=(await models.IdempotencyRecord.collection.indexes()).find(v=>v.unique&&v.name!=='_id_');await models.IdempotencyRecord.collection.dropIndex(index.name);await assert.rejects(verifyContentCatalog(connection,models));assert.equal((await models.IdempotencyRecord.collection.indexes()).length,1);await models.IdempotencyRecord.createIndexes();
});
test('create atomically inserts English and replay result; replay rechecks current authority/session',async()=>{
 const uuid=randomUUID(),first=await create(input(),uuid);assert.equal(first.status,201);const{poiId,revisionId}=first.body.data;const replay=await create(input(),uuid);assert.deepEqual(replay.body.data,first.body.data);assert.notEqual(replay.body.requestId,first.body.requestId);
 assert.equal((await create({...input(),nameEN:'Changed'},uuid)).status,409);assert.equal(await models.LocalizedContent.countDocuments({revisionId}),1);assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':poiId}),1);
 await im.WorkSession.updateOne({_id:session._id},{$set:{status:'closed',closedAt:new Date(clock)}});assert.equal((await create(input(),uuid)).status,403);assert.equal((await request('/admin/pois/'+poiId)).status,200);await im.WorkSession.updateOne({_id:session._id},{$set:{status:'open',closedAt:null}});
 await im.StaffAccount.updateOne({_id:staff._id},{$set:{status:'locked'}});assert.equal((await create(input(),uuid)).status,403);await im.StaffAccount.updateOne({_id:staff._id},{$set:{status:'active'}});
});
test('strict HTTP/CORS/body/media gates reject injection and oversized input safely',async()=>{
 for(const extra of [{createdBy:String(staff._id)},{status:'published'},{mutationVersion:0},{'$set':{status:'published'}},{'location.x':1}])assert.equal((await create({...input(),...extra})).status,422);
 assert.equal((await create({...input(),location:{type:'Point',coordinates:['106.7',10]}})).status,422);
 assert.equal((await request('/admin/pois','POST','{',{'Idempotency-Key':randomUUID()})).status,400);
 assert.equal((await request('/admin/pois','POST','x',{'Content-Type':'text/plain'})).status,415);
 assert.equal((await create({...input(),sourceTextEN:'x'.repeat(140000)})).status,413);
 const allowed=await create({...input(),sourceTextEN:'a'.repeat(19000)});assert.equal(allowed.status,201);
 assert.equal((await request('/admin/pois','POST',input(),{'Origin':'https://evil.example.invalid','Idempotency-Key':randomUUID()})).status,403);
 assert.equal((await request('/admin/pois?x=1','POST',input(),{'Idempotency-Key':randomUUID()})).status,422);
 assert.equal((await create({...input(),thumbnailAsset:{...asset(),publicId:'unknown'}})).status,422);
 const verifier=runtime.verifyThumbnail;runtime.verifyThumbnail=undefined;assert.equal((await create({...input(),thumbnailAsset:asset()})).status,422);const draft=await create();assert.equal((await patch(draft.body.data.revisionId,0,{thumbnailAsset:asset()})).status,503);runtime.verifyThumbnail=verifier;
});

test('same-version concurrent PATCH has one winner; no-op and lost-response retry preserve version rules',async()=>{
 const r=await create();const {poiId,revisionId}=r.body.data;
 const results=await Promise.all([patch(revisionId,0,{nameEN:'Name A'}),patch(revisionId,0,{nameEN:'Name B'})]);assert.deepEqual(results.map(v=>v.status).sort(),[200,409]);
 const rev=await models.POIRevision.findById(revisionId);assert.equal(rev.editVersion,1);assert.equal((await models.POI.findById(poiId)).mutationVersion,1);
 const count=await models.AuditOutbox.countDocuments({'payload.poiId':poiId});assert.equal((await patch(revisionId,1,{nameEN:rev.nameEN})).status,200);assert.equal((await patch(revisionId,0,{nameEN:rev.nameEN})).status,409);assert.equal(await models.AuditOutbox.countDocuments({'payload.poiId':poiId}),count);
});
test('source invalidates dependent approval while retaining old text/audio provenance; locale adoption is explicit',async()=>{
 const r=await create();const{revisionId}=r.body.data;const en=await models.LocalizedContent.findOne({revisionId,languageCode:'en'});Object.assign(en,approved({revisionId,text:'English source',reviewedBy:staff._id}));await en.save();
 await models.LocalizedContent.create(approved({revisionId,languageCode:'vi',text:'Old Vietnamese',reviewedBy:staff._id}));
 assert.equal((await patch(revisionId,0,{sourceTextEN:'New English source'})).status,200);
 let rows=await models.LocalizedContent.find({revisionId});const current=rows.find(v=>v.languageCode==='en'),stale=rows.find(v=>v.languageCode==='vi');assert.equal(current.sourceVersion,2);assert.equal(current.textVersion,2);assert.equal(current.audioAsset.textVersion,1);assert.equal(stale.text,'Old Vietnamese');assert.equal(stale.sourceVersion,1);assert.equal(stale.textVersion,1);for(const row of rows){assert.equal(row.reviewStatus,'pending');assert.equal(row.reviewedBy,null);assert.ok(row.audioAsset);}
 assert.equal((await language(revisionId,1,'Old Vietnamese')).status,200);const adopted=await models.LocalizedContent.findOne({revisionId,languageCode:'vi'});assert.equal(adopted.sourceVersion,2);assert.equal(adopted.textVersion,2);assert.equal(adopted.audioAsset.textVersion,1);
 assert.equal((await language(revisionId,2,'Old Vietnamese')).body.data.editVersion,2);assert.equal((await language(revisionId,2,'New French','fr')).status,200);assert.equal((await language(revisionId,3,'Cannot edit English','en')).status,422);
 const metadata=await patch(revisionId,3,{nameEN:'Metadata only'});assert.equal(metadata.status,200);const after=await models.LocalizedContent.findOne({revisionId,languageCode:'vi'});assert.equal(after.textVersion,2);assert.equal(after.sourceVersion,2);
});
test('clone retains published graph and approvals; replay/concurrent clones never replace working revision',async()=>{
 const {poiId,revisionId}=await published();const old=JSON.stringify(await models.POIRevision.findById(revisionId).lean()),local=JSON.stringify(await models.LocalizedContent.find({revisionId}).sort({languageCode:1}).lean());
 const uuid=randomUUID(),body={expectedPublishedRevisionId:revisionId};const clone=()=>request('/admin/pois/'+poiId+'/draft','POST',body,{'Idempotency-Key':uuid});const results=await Promise.all([clone(),clone()]);assert.ok(results.every(v=>v.status===201));assert.equal(results[0].body.data.revisionId,results[1].body.data.revisionId);
 const next=results[0].body.data.revisionId;assert.notEqual(next,revisionId);assert.equal((await models.LocalizedContent.findOne({revisionId:next,languageCode:'vi'})).reviewStatus,'approved');
 assert.equal((await request('/admin/pois/'+poiId+'/draft','POST',body,{'Idempotency-Key':randomUUID()})).status,409);
 assert.equal((await patch(next,0,{sourceTextEN:'Draft-only changed English'})).status,200);
 assert.equal(JSON.stringify(await models.POIRevision.findById(revisionId).lean()),old);assert.equal(JSON.stringify(await models.LocalizedContent.find({revisionId}).sort({languageCode:1}).lean()),local);assert.equal(String((await models.POI.findById(poiId)).publishedRevisionId),revisionId);
 const view=await request('/admin/pois/'+poiId);assert.equal(view.body.data.workingRevision.id,next);assert.equal(view.body.data.localizedContents.find(v=>v.languageCode==='vi').isSourceCurrent,false);assert.equal(view.body.data.poi.mutationVersion,undefined);
});
test('published/in_review/deleted gates, missing IDs, pointer mismatch and overflow are safe',async()=>{
 const p=await published();assert.equal((await patch(p.revisionId,0,{nameEN:'forbidden'})).status,409);
 assert.equal((await request('/admin/pois/'+p.poiId+'/draft','POST',{expectedPublishedRevisionId:String(new mongoose.Types.ObjectId())},{'Idempotency-Key':randomUUID()})).status,409);
 const r=await create();const{id:unused,...data}=r.body.data;await models.POIRevision.updateOne({_id:data.revisionId},{$set:{status:'in_review'}});assert.equal((await patch(data.revisionId,0,{nameEN:'forbidden'})).status,409);
 await models.POIRevision.updateOne({_id:data.revisionId},{$set:{status:'draft',editVersion:Number.MAX_SAFE_INTEGER}});assert.equal((await patch(data.revisionId,Number.MAX_SAFE_INTEGER,{nameEN:'overflow'})).body.error.code,'VERSION_EXHAUSTED');
 await models.POI.updateOne({_id:data.poiId},{$set:{deletedAt:new Date(clock),deletedBy:staff._id}});assert.equal((await patch(data.revisionId,0,{nameEN:'deleted'})).body.error.code,'POI_DELETED');assert.equal((await request('/admin/pois/'+data.poiId)).status,200);
 assert.equal((await request('/admin/pois/'+String(new mongoose.Types.ObjectId()))).status,404);assert.equal((await request('/admin/pois/bad')).status,422);
});
test('outbox insertion failure rolls back source/localized/parent/version and create result',async()=>{
 const r=await create();const{poiId,revisionId}=r.body.data;const old=JSON.stringify(await models.POIRevision.findById(revisionId).lean());const before=await models.POI.countDocuments({});const insert=models.AuditOutbox.create;
 models.AuditOutbox.create=async()=>{throw Error('synthetic private failure');};
 try{assert.equal((await patch(revisionId,0,{sourceTextEN:'Should rollback'})).status,503);assert.equal((await create()).status,503);}finally{models.AuditOutbox.create=insert;}
 assert.equal(JSON.stringify(await models.POIRevision.findById(revisionId).lean()),old);assert.equal((await models.POI.findById(poiId)).mutationVersion,0);assert.equal((await models.LocalizedContent.findOne({revisionId,languageCode:'en'})).text,'English source');assert.equal(await models.POI.countDocuments({}),before);
});
test('real parent counter write conflicts with concurrent synthetic delete; no no-op lock assumption',async()=>{
 const r=await create();const{poiId,revisionId}=r.body.data;let entered,release;const seen=new Promise(r=>entered=r),wait=new Promise(r=>release=r);const original=models.POI.updateOne;let pause=true;
 models.POI.updateOne=function(filter,update,options){if(pause&&String(filter._id)===poiId&&options?.session){pause=false;return(async()=>{entered();await wait;return original.call(this,filter,update,options);})();}return original.call(this,filter,update,options);};
 try{const saving=patch(revisionId,0,{sourceTextEN:'Race must rollback'});await seen;const s=await connection.startSession();try{await s.withTransaction(async()=>{await models.POI.collection.updateOne({_id:new mongoose.Types.ObjectId(poiId),mutationVersion:0,deletedAt:null},{$inc:{mutationVersion:1},$set:{deletedAt:new Date(clock),deletedBy:staff._id}},{session:s});});}finally{await s.endSession();}release();const result=await saving;assert.equal(result.status,409);assert.equal(result.body.error.code,'POI_DELETED');}finally{release();models.POI.updateOne=original;}
 assert.equal((await models.POIRevision.findById(revisionId)).sourceTextEN,'English source');assert.equal((await models.POI.findById(poiId)).mutationVersion,1);
});
test('actual Identity receiver drains retained audit intents; failed Identity authority admits no mutation',async()=>{
 const r=await create();assert.equal(r.status,201);const {poiId}=r.body.data;const row=await models.AuditOutbox.findOne({'payload.poiId':poiId});await models.AuditOutbox.updateMany({deliveredAt:null},{$set:{nextAttemptAt:new Date(clock+100000)}});await models.AuditOutbox.updateOne({_id:row._id},{$set:{nextAttemptAt:new Date(clock)}});
 const sender=createOutboxSender(models.AuditOutbox,runtime.authorization,{now,random:()=>0});await sender.tick();assert.ok((await models.AuditOutbox.findById(row._id)).deliveredAt);assert.equal(await im.AuditLog.countDocuments({eventId:row.eventId}),1);
 const previous=runtime.authorization.key;runtime.authorization.key=key();const count=await models.POI.countDocuments({});assert.equal((await create()).status,503);runtime.authorization.key=previous;assert.equal(await models.POI.countDocuments({}),count);
});
test('opt-in runtime verifies catalog and closes sender/connection; no startup schema repair',async()=>{
 const config=loadContentConfig('test',{CONTENT_MONGODB_URI:uri,IDENTITY_BASE_URL:identityBase,CONTENT_IDENTITY_SERVICE_KEY_B64URL:contentKey,CONTENT_ALLOWED_ORIGINS:'https://web.example.invalid'});
 const configured=await connectContentRuntime(config);try{assert.equal(configured.connection.readyState,1);configured.start();}finally{await configured.close();}assert.equal(configured.connection.readyState,0);
 const invalid=await models.POI.collection.insertOne({});await assert.rejects(connectContentRuntime(config),/Content dependencies unavailable/);assert.equal((await models.POI.collection.findOne({_id:invalid.insertedId})).mutationVersion,undefined);await models.POI.collection.deleteOne({_id:invalid.insertedId});
});

test('second localized save failure rolls back prior localized writes and source revision',async()=>{
 const r=await create();const {poiId,revisionId}=r.body.data;await models.LocalizedContent.create({revisionId,languageCode:'vi',sourceVersion:1,textVersion:1,text:'Old text',reviewStatus:'pending'});
 const save=models.LocalizedContent.prototype.save;models.LocalizedContent.prototype.save=function(...args){if(String(this.revisionId)===revisionId&&this.languageCode==='vi')throw Error('synthetic localized write failure');return save.apply(this,args);};
 try{assert.equal((await patch(revisionId,0,{sourceTextEN:'Must rollback English as well'})).status,503);}finally{models.LocalizedContent.prototype.save=save;}
 assert.equal((await models.LocalizedContent.findOne({revisionId,languageCode:'en'})).text,'English source');assert.equal((await models.POIRevision.findById(revisionId)).sourceVersion,1);assert.equal((await models.POI.findById(poiId)).mutationVersion,0);
});
test('fresh role/authVersion checks and exact-origin CORS apply to real routes',async()=>{
 const r=await create();const {poiId}=r.body.data;await im.StaffAccount.updateOne({_id:staff._id},{$set:{role:'Manager'}});assert.equal((await request('/admin/pois/'+poiId)).status,200);
 const allowed=await request('/admin/pois/'+poiId,'GET',undefined,{Origin:'https://web.example.invalid'});assert.equal(allowed.headers.get('access-control-allow-origin'),'https://web.example.invalid');assert.equal(allowed.headers.get('access-control-allow-credentials'),null);
 await im.StaffAccount.updateOne({_id:staff._id},{$inc:{authVersion:1}});assert.equal((await request('/admin/pois/'+poiId)).status,401);await im.StaffAccount.updateOne({_id:staff._id},{$set:{authVersion:0,role:'Staff'}});
});

test('actual server process fails before listening on unreviewed persisted counter data',async()=>{
 const raw=await models.POI.collection.insertOne({});
 try{const child=spawnSync(process.execPath,[fileURLToPath(new URL('../src/server.js',import.meta.url))],{encoding:'utf8',timeout:15000,env:{...process.env,NODE_ENV:'test',HOST:'127.0.0.1',PORT:'3002',CONTENT_MONGODB_URI:uri,CONTENT_ALLOWED_ORIGINS:'https://web.example.invalid',IDENTITY_BASE_URL:identityBase,CONTENT_IDENTITY_SERVICE_KEY_B64URL:contentKey}});
 assert.equal(child.status,1);assert.equal(child.stdout.includes('listening'),false);assert.equal(child.stderr.includes(uri),false);assert.equal(child.stderr.includes(contentKey),false);assert.equal((await models.POI.collection.findOne({_id:raw.insertedId})).mutationVersion,undefined);
 }finally{await models.POI.collection.deleteOne({_id:raw.insertedId});}
});
