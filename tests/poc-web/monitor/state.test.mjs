import {test} from 'node:test';import assert from 'node:assert/strict';
import {createMonitor,monitorSummary} from '../../../apps/web/src/staff/monitor/state.js';
const flush=()=>new Promise(r=>setImmediate(r));
const summary=time=>({asOf:new Date(time).toISOString(),refreshedAt:new Date(time).toISOString(),onlineVisitors:2,currentListeners:1,byPoi:[{poiId:'000000000000000000000001',currentListeners:1},{poiId:'000000000000000000000002',currentListeners:1}]});
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
