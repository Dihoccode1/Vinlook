import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAdminAdapter} from '../../../apps/web/src/adapters/admin.js';
import {createAdminState,publicationGaps} from '../../../apps/web/src/staff/admin-state.js';
import {localeCodes} from '../../../apps/web/src/i18n/locales.js';
const poi='000000000000000000000001',rev='000000000000000000000002';
const envelope=data=>new Response(JSON.stringify({data,requestId:'fixture'}));
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};

test('logout fences late login and content reads; a new login remains busy until its own response',async()=>{
  const first=deferred(),second=deferred(),content=deferred();let count=0;
  const store=createAdminState({login:()=>++count===1?first.promise:second.promise,read:()=>content.promise,logout(){}});
  const old=store.login('old','');store.logout();const current=store.login('new','');
  first.resolve({account:{fullName:'old'}});await assert.rejects(old,{code:'REQUEST_CANCELLED'});
  assert.equal(store.getSnapshot().busy,true);assert.equal(store.getSnapshot().principal,null);
  second.resolve({account:{fullName:'new'}});await current;
  const read=store.read(poi);store.logout();content.resolve({poi:{id:poi},workingRevision:{id:rev}});
  await assert.rejects(read,{code:'REQUEST_CANCELLED'});assert.equal(store.getSnapshot().document,null);
  assert.equal(store.getSnapshot().error,null);
});

test('busy mutation rejects without clearing edits; logout during authority check prevents the write',async()=>{
  const authority=deferred();let writes=0;
  const store=createAdminState({me:()=>authority.promise,logout(){}});
  store.setInput({nameEN:'unsaved'});
  const pending=store.mutate(()=>{writes++;});
  await assert.rejects(store.mutate(()=>{writes++;}),{code:'OPERATION_IN_PROGRESS'});
  assert.equal(store.getSnapshot().input.nameEN,'unsaved');
  store.logout();authority.resolve({currentWorkSession:{id:poi}});
  await assert.rejects(pending,{code:'REQUEST_CANCELLED'});assert.equal(writes,0);
});

test('adapter cannot restore a token from a login response received after logout',async()=>{
  const response=deferred();let calls=0;
  const api=createAdminAdapter({identityOrigin:'https://identity.example.test',contentOrigin:'https://content.example.test'},
    {fetcher:()=>{calls++;return response.promise;}});
  const pending=api.login('fixture@example.test','synthetic');api.logout();
  response.resolve(envelope({accessToken:'SYNTHETIC-TOKEN'}));
  await assert.rejects(pending,{code:'REQUEST_CANCELLED'});
  await assert.rejects(api.me(),{code:'AUTHENTICATION_REQUIRED'});assert.equal(calls,1);
});
test('Admin adapter exact vi/zh-Hant path, versions, idempotency, multipart, separate origins and no auto session',async()=>{
  const calls=[];const api=createAdminAdapter({identityOrigin:'https://identity.example.test',contentOrigin:'https://content.example.test'},{fetcher:async(url,init)=>{
    calls.push({url,init});if(url.pathname.endsWith('/login'))return envelope({accessToken:'SYNTHETIC-TOKEN'});
    if(url.pathname.endsWith('/me'))return envelope({account:{role:'Staff'},currentWorkSession:null});return envelope({});
  }});
  await api.login('fixture@example.test','synthetic');assert.equal(calls.length,2);
  for(const code of ['vi','zh-Hant']){await api.saveLocale(rev,code,7,'Fixture text');const c=calls.at(-1);assert.equal(c.url.pathname,`/api/v1/admin/revisions/${rev}/languages/${code}`);assert.deepEqual(JSON.parse(c.init.body),{expectedEditVersion:7,text:'Fixture text'});}
  await api.process(rev,7,['vi'],'00000000-0000-4000-8000-000000000001');assert.equal(calls.at(-1).init.headers['Idempotency-Key'],'00000000-0000-4000-8000-000000000001');
  await api.runNext('00000000-0000-4000-8000-000000000002');assert.equal(calls.at(-1).url.pathname,'/api/v1/admin/jobs/run-next');assert.deepEqual(JSON.parse(calls.at(-1).init.body),{});assert.equal(calls.at(-1).init.headers['Idempotency-Key'],'00000000-0000-4000-8000-000000000002');
  await api.upload(poi,new Blob(['fixture'],{type:'image/png'}));const c=calls.at(-1);assert.ok(c.init.body instanceof FormData);assert.equal(c.init.headers['Content-Type'],undefined);assert.equal(c.url.origin,'https://content.example.test');
  api.logout();await assert.rejects(api.read(poi),{code:'AUTHENTICATION_REQUIRED'});
});
test('409 preserves all input/version; 401 clears authority, 403/session closed never invokes mutation',async()=>{
  let status=409,mutations=0;const document={poi:{id:poi},workingRevision:{id:rev,editVersion:7,nameEN:'server'}};
  const api={login:async()=>({account:{role:'Staff'},currentWorkSession:{id:poi}}),read:async()=>document,
    me:async()=>({account:{role:'Staff'},currentWorkSession:status===403?null:{id:poi}}),save:async()=>{mutations++;throw Object.assign(Error(),{code:'EDIT_VERSION_CONFLICT',status});},logout(){}};
  const store=createAdminState(api);await store.login('','');await store.read(poi);store.setInput({nameEN:'unsaved',editVersion:7});
  await assert.rejects(store.mutate(a=>a.save()),{status:409});assert.equal(store.getSnapshot().input.nameEN,'unsaved');assert.equal(store.getSnapshot().conflict,true);
  status=403;await assert.rejects(store.mutate(a=>a.save()),{code:'WORK_SESSION_REQUIRED'});assert.equal(mutations,1);assert.equal(store.getSnapshot().input.nameEN,'unsaved');
  status=401;await assert.rejects(store.mutate(a=>a.save()),{status:401});assert.equal(store.getSnapshot().principal,null);assert.equal(store.getSnapshot().input,null);
});
test('save then readback uses server version; partial/quota jobs retain exact states',async()=>{
  let version=1;const api={login:async()=>({account:{role:'Manager'},currentWorkSession:{id:poi}}),me:async()=>({account:{role:'Manager'},currentWorkSession:{id:poi}}),
    read:async()=>({poi:{id:poi},workingRevision:{id:rev,editVersion:version,nameEN:'fixture'}}),save:async()=>{version++;return {poiId:poi};},jobs:async()=>({items:[{status:'waiting_quota'},{status:'failed'},{status:'succeeded'}]})};
  const store=createAdminState(api);await store.login('','');await store.read(poi);await store.mutate(a=>a.save());assert.equal(store.getSnapshot().document.workingRevision.editVersion,2);
  await store.jobs();assert.deepEqual(store.getSnapshot().jobs.map(j=>j.status),['waiting_quota','failed','succeeded']);
});
test('publish preflight requires all16 current approved assets, entrance and thumbnail',()=>{
  const document={workingRevision:{status:'in_review',entrance:{},thumbnailAsset:{}},localizedContents:localeCodes.map(languageCode=>({languageCode,reviewStatus:'approved',isSourceCurrent:true,isAudioCurrent:true,audioAsset:{url:'https://fixture.invalid/audio'},durationSeconds:120}))};
  assert.deepEqual(publicationGaps(document),[]);document.localizedContents.pop();assert.equal(publicationGaps(document).length,1);
  document.workingRevision.entrance=null;assert.ok(publicationGaps(document).includes('Entrance is missing'));
});
