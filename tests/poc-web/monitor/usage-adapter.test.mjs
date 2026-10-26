import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUsageAdapter} from '../../../apps/web/src/adapters/usage.js';
import {createAdminAdapter} from '../../../apps/web/src/adapters/admin.js';
const browser='00000000-0000-4000-8000-000000000001',playback='00000000-0000-4000-8000-000000000002',poi='000000000000000000000001';
const envelope=data=>new Response(JSON.stringify({data,requestId:'synthetic-request'}));
test('public Usage sends only exact route fields and never JWT/cookies, query, GPS or automatic retries',async()=>{
  const calls=[];const api=createUsageAdapter('https://usage.example.test',{fetcher:async(url,init)=>{calls.push({url,init});return envelope({});}});
  await api.presence(browser);await api.start(browser,playback,poi,'zh-Hant');await api.heartbeat(browser,playback);await api.end(browser,playback,'completed');
  assert.deepEqual(calls.map(c=>c.url.pathname),['/api/v1/presence/heartbeat','/api/v1/listening/start',`/api/v1/listening/${playback}/heartbeat`,`/api/v1/listening/${playback}/end`]);
  assert.deepEqual(JSON.parse(calls[1].init.body),{browserId:browser,playbackId:playback,poiId:poi,languageCode:'zh-Hant'});
  for(const c of calls){assert.equal(c.init.credentials,'omit');assert.equal(c.init.cache,'no-store');assert.equal(c.init.headers.Authorization,undefined);assert.equal(c.url.search,'');}
  assert.throws(()=>api.heartbeat(browser,'bad'),{code:'INVALID_INPUT'});assert.throws(()=>api.start(browser,playback,poi,'zh'),{code:'INVALID_INPUT'});assert.equal(calls.length,4);
  let attempts=0;const unavailable=createUsageAdapter('https://usage.example.test',{fetcher:async()=>{attempts++;throw Error();}});await assert.rejects(unavailable.presence(browser),{code:'NETWORK_UNAVAILABLE'});assert.equal(attempts,1);
});
test('Monitoring shares only in-memory Staff token with Usage and checks Identity without opening a work session',async()=>{
  const calls=[];const api=createAdminAdapter({identityOrigin:'https://identity.example.test',contentOrigin:'https://content.example.test',usageOrigin:'https://usage.example.test'},
    {fetcher:async(url,init)=>{calls.push({url,init});return envelope(url.pathname.endsWith('/login')?{accessToken:'SYNTHETIC-TOKEN'}:url.pathname.endsWith('/me')?{account:{role:'Staff',status:'active'},currentWorkSession:null}:{});}});
  await assert.rejects(api.monitor.summary(),{status:401});await api.login('fixture@example.test','synthetic');await api.monitor.authorize();await api.monitor.summary();await api.monitor.health();await api.monitor.jobs();
  assert.equal(calls.some(c=>c.url.pathname.includes('/work-sessions')),false);
  for(const c of calls.filter(c=>c.url.origin==='https://usage.example.test'))assert.equal(c.init.headers.Authorization,'Bearer SYNTHETIC-TOKEN');
  api.logout();await assert.rejects(api.monitor.summary(),{status:401});
  assert.equal(createAdminAdapter({identityOrigin:'https://identity.example.test',contentOrigin:'https://content.example.test'}).monitor,null);
});
