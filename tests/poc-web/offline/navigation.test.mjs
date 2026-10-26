import {test} from 'node:test';import assert from 'node:assert/strict';import {createNavigation} from '../../../apps/web/src/navigation/controller.js';
const flush=()=>new Promise(r=>setImmediate(r)),destination={poiId:'fixture-poi',revisionId:'fixture-revision',graphVersion:'fixture-graph',entrance:[106.71,10.7]};
test('current Worker instructions reach snapshots defensively and clear when target changes',async()=>{
  let fix,result;
  const nav=createNavigation({workerFactory:()=>({calculate:async({token})=>result={...token,geometry:[[106.7,10.7],[106.71,10.7]],distanceMeters:1100,
    warnings:['MISSING_STREET_NAME'],instructions:[{maneuver:'depart',geometryIndex:0,distanceMeters:1100,text:'Head along a street'},
      {maneuver:'arrive',geometryIndex:1,distanceMeters:0,text:'Arrive at the entrance'}]},terminate(){}}),
    geolocation:{watchPosition:fn=>{fix=fn;return 1;},clearWatch(){}},maxRoutePoints:20,maxCalculations:10});
  nav.start(destination);fix({timestamp:1,coords:{longitude:106.7,latitude:10.7,accuracy:5}});await flush();
  assert.equal(nav.snapshot().guidance.distanceMeters,1100);result.instructions[0].text='mutated';
  const copy=nav.snapshot();copy.guidance.instructions[0].text='mutated again';
  assert.equal(nav.snapshot().guidance.instructions[0].text,'Head along a street');
  nav.start({...destination,poiId:'next'});assert.equal(nav.snapshot().guidance,null);nav.stop();
});
test('explicit Retry replaces a failed Worker without automatically repeating the calculation',async()=>{
  let fix,created=0,calls=0,terminated=0;
  const nav=createNavigation({workerFactory:()=>{
    const instance=++created;
    return {calculate:async({token})=>{calls++;if(instance===1)throw Object.assign(Error(),{code:'CALCULATION_FAILED'});return {...token,geometry:[[106.7,10.7],[106.71,10.7]]};},
      terminate(){terminated++;if(instance===1)throw Error('already failed');}};
  },geolocation:{watchPosition:fn=>{fix=fn;return 1;},clearWatch(){}},uuid:()=>`request-${calls}`,maxRoutePoints:20,maxCalculations:10});
  nav.start(destination);fix({timestamp:1,coords:{longitude:106.7,latitude:10.7,accuracy:5}});await flush();
  assert.equal(nav.snapshot().status,'route_unavailable');assert.equal(nav.snapshot().inflight,null);
  assert.equal(created,1);assert.equal(calls,1);assert.equal(terminated,1);
  await nav.retry();assert.equal(created,2);assert.equal(calls,2);assert.equal(nav.snapshot().status,'navigating');nav.stop();
});
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
  nav.start(destination);fix({timestamp:1,coords:{longitude:106.7,latitude:10.7,accuracy:5}});await flush();assert.equal(nav.snapshot().route,null);assert.equal(nav.snapshot().inflight,null);assert.equal(nav.snapshot().error,'GRAPH_INCOMPATIBLE');assert.equal(nav.snapshot().status,'route_unavailable');nav.stop();
});

test('GPS callbacks from a cancelled target cannot navigate or mark arrival on a new target',async()=>{
  const callbacks=[],errors=[];let calculations=0;
  const nav=createNavigation({workerFactory:()=>({calculate:async({token})=>{calculations++;return {...token,geometry:[[106.7,10.7],[106.71,10.7]]};},terminate(){}}),
    geolocation:{watchPosition:(fix,error)=>{callbacks.push(fix);errors.push(error);return callbacks.length;},clearWatch(){}},maxRoutePoints:20,maxCalculations:10,uuid:()=>String(calculations)});
  nav.start(destination);nav.start({...destination,poiId:'second'});
  callbacks[0]({timestamp:10,coords:{longitude:106.71,latitude:10.7,accuracy:5}});errors[0]({code:1});await flush();
  assert.equal(nav.snapshot().status,'loading_graph');assert.equal(nav.snapshot().latestFix,null);assert.equal(calculations,0);
  callbacks[1]({timestamp:11,coords:{longitude:106.7,latitude:10.7,accuracy:5}});await flush();assert.equal(nav.snapshot().status,'navigating');nav.stop();
});

test('navigation exposes stable subscribable snapshots and normalizes denied/throwing GPS',()=>{
  let denied;const nav=createNavigation({workerFactory(){throw Error();},geolocation:{watchPosition:(fix,error)=>{denied=error;return 1;},clearWatch(){}},maxRoutePoints:20,maxCalculations:10});
  const initial=nav.getSnapshot();assert.equal(nav.getSnapshot(),initial);let updates=0;const unsubscribe=nav.subscribe(()=>updates++);
  nav.start(destination);denied({code:1});assert.equal(nav.getSnapshot().error,'GPS_PERMISSION_DENIED');assert.ok(updates>=2);unsubscribe();nav.stop();
  const failing=createNavigation({workerFactory(){},geolocation:{watchPosition(){throw Error('device');}},maxRoutePoints:20,maxCalculations:10});assert.doesNotThrow(()=>failing.start(destination));assert.equal(failing.snapshot().error,'GPS_UNAVAILABLE');
});
