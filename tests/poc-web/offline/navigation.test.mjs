import {test} from 'node:test';import assert from 'node:assert/strict';import {createNavigation} from '../../../apps/web/src/navigation/controller.js';
const flush=()=>new Promise(r=>setImmediate(r)),destination={poiId:'fixture-poi',revisionId:'fixture-revision',graphVersion:'fixture-graph',entrance:[106.71,10.7]};
test('foreground GPS loss retains route; stop/withdraw cancels worker; late result ignored; arrival no autoplay',async()=>{
  let onFix,onError,terminated=0,clear=0,resolve,visible=true,n=0,token;
  const nav=createNavigation({workerFactory:()=>({calculate:args=>{token=args.token;return new Promise(r=>resolve=r);},terminate:()=>terminated++}),geolocation:{watchPosition:(fix,error)=>{onFix=fix;onError=error;return 1;},clearWatch:()=>clear++},visible:()=>visible,uuid:()=>String(++n),now:()=>n,maxRoutePoints:20,maxCalculations:10});
  const fix=(longitude,timestamp)=>({timestamp,coords:{longitude,latitude:10.7,accuracy:5}});
  nav.start(destination);onFix(fix(106.7,1));await flush();resolve({...token,geometry:[[106.7,10.7],[106.71,10.7]]});await flush();assert.equal(nav.snapshot().status,'navigating');
  onError();assert.equal(nav.snapshot().status,'gps_unavailable');assert.ok(nav.snapshot().route);
  visible=false;nav.visibilityChanged();assert.equal(clear,1);assert.equal(terminated,1);
  visible=true;nav.visibilityChanged();onFix(fix(106.71,2));assert.equal(nav.snapshot().status,'arrived');
  nav.start(destination);onFix(fix(106.7,3));await flush();nav.withdraw('fixture-poi');resolve({geometry:[[106.7,10.7],[106.71,10.7]]});await flush();assert.equal(nav.snapshot().status,'destination_withdrawn');assert.equal(nav.snapshot().route,null);
});
test('mismatched Worker tuple is never rewritten to look current',async()=>{
  let fix;const nav=createNavigation({workerFactory:()=>({calculate:async({token})=>({...token,graphVersion:'wrong',geometry:[[106.7,10.7],[106.71,10.7]]}),terminate(){}}),geolocation:{watchPosition:fn=>{fix=fn;return 1;},clearWatch(){}},maxRoutePoints:20,maxCalculations:10,uuid:()=> 'fixture-request'});
  nav.start(destination);fix({timestamp:1,coords:{longitude:106.7,latitude:10.7,accuracy:5}});await flush();assert.equal(nav.snapshot().route,null);nav.stop();
});
