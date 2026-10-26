import {test} from 'node:test';import assert from 'node:assert/strict';
import {createMonitor,monitorSummary,monitorHealth,monitorJobs} from '../../../apps/web/src/staff/monitor/state.js';
const flush=()=>new Promise(r=>setImmediate(r));
const summary=time=>({asOf:new Date(time).toISOString(),refreshedAt:new Date(time).toISOString(),onlineVisitors:2,currentListeners:1,byPoi:[{poiId:'000000000000000000000001',currentListeners:1},{poiId:'000000000000000000000002',currentListeners:1}]});

test('old or future sample time is stale even when the refresh timestamp looks current',async()=>{
  for(const asOf of [-40000,10000]){
    const api={authorize:async()=>({account:{role:'Staff',status:'active'}}),summary:async()=>({...summary(0),asOf:new Date(asOf).toISOString()}),health:async()=>({}),jobs:async()=>({})};
    const store=createMonitor({api,now:()=>0});await store.refresh();assert.equal(store.getSnapshot().status,'stale');
  }
});

test('returning to the tab refreshes immediately despite an old hung request; old response cannot overwrite new sample',async()=>{
  let active=true,resolve,calls=0;
  const api={authorize:async()=>({account:{role:'Manager',status:'active'}}),summary:()=>++calls===1?new Promise(done=>resolve=done):Promise.resolve({...summary(0),onlineVisitors:7}),health:async()=>({}),jobs:async()=>({})};
  const store=createMonitor({api,now:()=>0,visible:()=>active,schedule:()=>1,cancel(){}});
  store.start();await flush();active=false;store.visibilityChanged();active=true;store.visibilityChanged();await flush();
  assert.equal(store.getSnapshot().summary.onlineVisitors,7);resolve(summary(0));await flush();assert.equal(store.getSnapshot().summary.onlineVisitors,7);store.stop();
});

test('unverified health/jobs never become zero/ready and extra response fields are stripped',()=>{
  assert.equal(monitorHealth({components:[{name:{secret:'unsafe'},status:'up'}]}).status,'unavailable');
  const health=monitorHealth({components:[{name:'worker',status:'unknown',checkedAt:null,raw:'private'}],secret:'private'});
  assert.equal(health.secret,undefined);assert.equal(health.components[0].raw,undefined);
  assert.equal(monitorJobs({status:'ok',counts:{queued:0}}).counts,null);
  assert.equal(monitorJobs({status:'ok',counts:{queued:0,running:0,succeeded:0,failed:0,waiting_quota:-1}}).counts,null);
  assert.deepEqual(monitorJobs({status:'ok',counts:{queued:0,running:0,succeeded:0,failed:0,waiting_quota:0,secret:99}}).counts,{queued:0,running:0,succeeded:0,failed:0,waiting_quota:0});
});

test('401 clears protected counts immediately even when another endpoint never responds',async()=>{
  const api={authorize:async()=>({account:{role:'Staff',status:'active'}}),summary:async()=>summary(0),health:async()=>({}),jobs:async()=>({})};
  const store=createMonitor({api,now:()=>0});await store.refresh();assert.equal(store.getSnapshot().summary.onlineVisitors,2);
  api.summary=async()=>{throw Object.assign(Error(),{status:401});};api.health=()=>new Promise(()=>{});
  await store.refresh();assert.equal(store.getSnapshot().authorized,false);assert.equal(store.getSnapshot().summary,null);
});
test('visible 30s polling preserves last count/time after failure; pause and perPOI semantics; confirmed zero only',async()=>{
  let time=0,callback,fail=false,zero=false,active=true,calls=0;
  const api={authorize:async()=>({account:{status:'active',role:'Staff'},currentWorkSession:null}),summary:async()=>{calls++;if(fail)throw Error();return {...summary(time),...(zero?{onlineVisitors:0,currentListeners:0,byPoi:[]}: {})};},health:async()=>({components:[{name:'worker',status:'unknown'}]}),jobs:async()=>({status:'unknown',counts:null})};
  const store=createMonitor({api,now:()=>time,visible:()=>active,schedule:(fn,ms)=>{assert.equal(ms,30000);callback=fn;return 1;},cancel:()=>{callback=null;}});
  store.start();await flush();assert.equal(store.getSnapshot().summary.currentListeners,1);assert.equal(store.getSnapshot().summary.byPoi.reduce((a,r)=>a+r.currentListeners,0),2);
  time=30000;fail=true;callback();await flush();assert.equal(store.getSnapshot().status,'stale');assert.equal(store.getSnapshot().summary.onlineVisitors,2);assert.equal(store.getSnapshot().summary.asOf,new Date(0).toISOString());
  active=false;store.visibilityChanged();assert.equal(callback,null);await store.refresh();assert.equal(calls,2);
  active=true;fail=false;zero=true;store.visibilityChanged();await flush();assert.equal(store.getSnapshot().summary.onlineVisitors,0);store.stop();assert.equal(callback,null);
});
test('unauthorized access reveals no previous counts; late request after unmount ignored',async()=>{
  let denied=false,resolve;const api={authorize:async()=>{if(denied)throw Object.assign(Error(),{status:401});return {account:{role:'Manager',status:'active'}};},summary:async()=>summary(0),health:async()=>({}),jobs:async()=>({})};
  const store=createMonitor({api,now:()=>0});await store.refresh();denied=true;await store.refresh();assert.equal(store.getSnapshot().summary,null);assert.equal(store.getSnapshot().authorized,false);
  denied=false;api.summary=()=>new Promise(r=>resolve=r);const pending=store.refresh();await flush();store.stop();resolve(summary(0));await pending;assert.equal(store.getSnapshot().summary,null);
});
test('invalid/partial summary cannot become fresh zero or expose raw session fields',()=>{
  assert.throws(()=>monitorSummary({...summary(0),byPoi:[{poiId:'bad',currentListeners:1}]}));
  assert.throws(()=>monitorSummary({...summary(0),onlineVisitors:-1}));
  assert.equal(monitorSummary({...summary(0),browserId:'must-not-copy'}).browserId,undefined);
});
