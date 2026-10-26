import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createContentAdapter} from '../../apps/web/src/adapters/content.js';
import {createIdentityAdapter} from '../../apps/web/src/adapters/identity.js';
import {readPublicConfig} from '../../apps/web/src/adapters/config.js';
import {publicOrigin} from '../../apps/web/src/adapters/http.js';
const origin = 'https://content.example.test';
const poi = locale => ({id:'000000000000000000000001',revisionId:'000000000000000000000002',nameEN:'Labelled fixture POI',
  location:{type:'Point',coordinates:[106.7,10.7]},entrance:{type:'Point',coordinates:[106.7,10.7]},
  thumbnail:{url:'https://fixture.example.test/image.png'},languageCode:locale,text:'TEST FIXTURE. Not approved public content.',
  audio:{url:`https://fixture.example.test/${locale}.mp3`,durationSeconds:120}});
const ok = data => new Response(JSON.stringify({data,requestId:'fixture-request'}),{headers:{'Content-Type':'application/json'}});
test('Content uses only public routes, selected locale and credential-free origin; strips internal fields',async()=>{
  const calls=[];
  const adapter=createContentAdapter(origin,{fetcher:async(url,init)=>{calls.push({url,init});return ok({items:[{...poi('pt-PT'),draft:'sentinel'}],nextCursor:null,snapshotId:'fixture'});}});
  const result=await adapter.list({locale:'pt-PT',q:'  [literal]  '});
  assert.equal(calls[0].url.origin,origin);assert.equal(calls[0].url.pathname,'/api/v1/pois');
  assert.equal(calls[0].url.searchParams.get('language'),'pt-PT');assert.equal(calls[0].url.searchParams.get('q'),'[literal]');
  assert.equal(calls[0].init.credentials,'omit');assert.equal(calls[0].init.headers.Authorization,undefined);
  assert.equal(result.items[0].draft,undefined);
});
test('Content rejects mismatched locale, invalid duration/coordinates/media, oversized nearby and non-public errors',async()=>{
  for(const item of [{...poi('en'),languageCode:'vi'}, {...poi('en'),audio:{url:'https://fixture.example.test/a',durationSeconds:89}},
    {...poi('en'),location:{type:'Point',coordinates:[200,0]}}, {...poi('en'),thumbnail:{url:'javascript:alert(1)'}}]) {
    const adapter=createContentAdapter(origin,{fetcher:async()=>ok(item)});
    await assert.rejects(adapter.detail(item.id,'en'),{code:'INVALID_RESPONSE'});
  }
  const adapter=createContentAdapter(origin,{fetcher:async()=>ok({items:Array(5).fill({...poi('en'),straightLineDistanceMeters:10}),actualCount:5,radiusMeters:3000})});
  await assert.rejects(adapter.nearby({lat:0,lon:0}),{code:'INVALID_RESPONSE'});
  await assert.rejects(adapter.list({locale:'pt'}),{code:'INVALID_INPUT'});
  await assert.rejects(adapter.detail('../admin/pois'),{code:'INVALID_INPUT'});
});
test('nearby always requests max4 and 3km response includes zero actual results without padding',async()=>{
  const adapter=createContentAdapter(origin,{fetcher:async(url)=>{assert.equal(url.searchParams.get('limit'),'4');assert.equal(url.searchParams.has('radius'),false);return ok({items:[],actualCount:0,radiusMeters:3000});}});
  assert.deepEqual(await adapter.nearby({lat:10.7,lon:106.7}),{items:[],actualCount:0,radiusMeters:3000});
});
test('HTTP failures retain safe code/status/requestId and never reflect raw backend messages',async()=>{
  for(const [status,code] of [[401,'AUTHENTICATION_FAILED'],[403,'FORBIDDEN'],[409,'PUBLIC_SNAPSHOT_CHANGED'],[503,'PUBLIC_CONTENT_UNAVAILABLE']]) {
    const adapter=createContentAdapter(origin,{fetcher:async()=>new Response(JSON.stringify({error:{code,message:'PRIVATE SENTINEL',requestId:'fixture-request'}}),{status})});
    await assert.rejects(adapter.list(),error=>error.code===code&&error.status===status&&!error.message.includes('PRIVATE'));
  }
  const adapter=createContentAdapter(origin,{fetcher:async()=>{throw Error('PRIVATE network detail');}});
  await assert.rejects(adapter.list(),{code:'NETWORK_UNAVAILABLE'});
});
test('Identity token remains closure-only and logout/401 drops authority',async()=>{
  let calls=0;
  const account={id:'fixture-staff',fullName:'Fixture',email:'fixture@example.test',role:'Staff',status:'active'};
  const adapter=createIdentityAdapter('https://identity.example.test',{fetcher:async(url,init)=>{
    calls++;assert.equal(url.origin,'https://identity.example.test');
    if(url.pathname.endsWith('/login')) return ok({account,accessToken:'SYNTHETIC-TEST-TOKEN',expiresIn:7200});
    assert.equal(init.headers.Authorization,'Bearer SYNTHETIC-TEST-TOKEN');
    return new Response(JSON.stringify({error:{code:'AUTHENTICATION_REQUIRED',requestId:'fixture'}}),{status:401});
  }});
  await assert.rejects(adapter.me(),{code:'AUTHENTICATION_REQUIRED'});assert.equal(calls,0);
  assert.equal((await adapter.login('fixture@example.test','synthetic-only')).role,'Staff');
  await assert.rejects(adapter.me(),{status:401});
  await assert.rejects(adapter.me(),{code:'AUTHENTICATION_REQUIRED'});assert.equal(calls,2);
  await adapter.login('fixture@example.test','synthetic-only');adapter.logout();
  await assert.rejects(adapter.me(),{code:'AUTHENTICATION_REQUIRED'});
});
test('public config validates origins and refuses fixture outside explicit development',()=>{
  const env={VITE_IDENTITY_ORIGIN:'https://identity.example.test',VITE_CONTENT_ORIGIN:origin,VITE_USAGE_ORIGIN:'http://127.0.0.1:3003'};
  assert.equal(readPublicConfig(env).fixture,false);
  assert.throws(()=>readPublicConfig({...env,VITE_POC_FIXTURE:'labelled-local'}),{code:'FIXTURE_FORBIDDEN'});
  assert.equal(readPublicConfig({...env,VITE_POC_FIXTURE:'labelled-local'},{development:true}).fixture,true);
  for(const bad of ['http://remote.example.test','https://user:password@example.test','https://example.test/path','https://example.test/?key=value'])assert.throws(()=>publicOrigin(bad));
});
