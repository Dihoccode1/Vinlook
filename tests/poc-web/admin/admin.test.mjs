import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAdminAdapter} from '../../../apps/web/src/adapters/admin.js';
import {createAdminState,publicationGaps} from '../../../apps/web/src/staff/admin-state.js';
import {localeCodes} from '../../../apps/web/src/i18n/locales.js';
const poi='000000000000000000000001',rev='000000000000000000000002';
const envelope=data=>new Response(JSON.stringify({data,requestId:'fixture'}));
test('Admin adapter exact vi/zh-Hant path, versions, idempotency, multipart, separate origins and no auto session',async()=>{
  const calls=[];const api=createAdminAdapter({identityOrigin:'https://identity.example.test',contentOrigin:'https://content.example.test'},{fetcher:async(url,init)=>{
    calls.push({url,init});if(url.pathname.endsWith('/login'))return envelope({accessToken:'SYNTHETIC-TOKEN'});
    if(url.pathname.endsWith('/me'))return envelope({account:{role:'Staff'},currentWorkSession:null});return envelope({});
  }});
  await api.login('fixture@example.test','synthetic');assert.equal(calls.length,2);
  for(const code of ['vi','zh-Hant']){await api.saveLocale(rev,code,7,'Fixture text');const c=calls.at(-1);assert.equal(c.url.pathname,`/api/v1/admin/revisions/${rev}/languages/${code}`);assert.deepEqual(JSON.parse(c.init.body),{expectedEditVersion:7,text:'Fixture text'});}
  await api.process(rev,7,['vi'],'00000000-0000-4000-8000-000000000001');assert.equal(calls.at(-1).init.headers['Idempotency-Key'],'00000000-0000-4000-8000-000000000001');
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
