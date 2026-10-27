import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigation} from '../../../apps/web/src/navigation/controller.js';

test('GPS Retry restarts bounded fresh acquisition, fences old callbacks and never routes from an inaccurate position',async()=>{
 const callbacks=[],failures=[],options=[],cleared=[];let calculations=0;
 const navigation=createNavigation({maxRoutePoints:20,maxCalculations:10,
  geolocation:{watchPosition:(fix,error,config)=>{callbacks.push(fix);failures.push(error);options.push(config);return callbacks.length;},clearWatch:id=>cleared.push(id)},
  workerFactory:()=>({calculate:async({token})=>{calculations++;return {...token,geometry:[[106.7,10.7],[106.71,10.7]]};},terminate(){}})});
 navigation.start({poiId:'fixture',revisionId:'revision',graphVersion:'graph',entrance:[106.71,10.7]});
 assert.deepEqual(options[0],{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 failures[0]({code:2});await navigation.retry();assert.deepEqual(cleared,[1]);
 const fix=(timestamp,accuracy)=>({timestamp,coords:{longitude:106.7,latitude:10.7,accuracy}});
 callbacks[0](fix(1,5));assert.equal(calculations,0);
 callbacks[1](fix(2,500));assert.equal(navigation.getSnapshot().status,'gps_uncertain');assert.equal(calculations,0);
 await navigation.retry();assert.deepEqual(cleared,[1,2]);
 callbacks[2](fix(3,5));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(calculations,1);assert.equal(navigation.getSnapshot().status,'navigating');navigation.stop();
});
