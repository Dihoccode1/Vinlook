import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomBytes} from 'node:crypto';
import {lifecycleInput} from '../src/lifecycle/router.js';
import {listQuery,nearbyQuery,query,publicKey} from '../src/public/validation.js';
import {signCursor,readCursor,snapshotId} from '../src/public/cursor.js';
import {distanceMeters} from '../src/public/service.js';
import {loadContentConfig} from '../src/drafts/runtime.js';
test('strict lifecycle expected parent version rejects injection/coercion and overflow',()=>{
 assert.ok(lifecycleInput.safeParse({expectedMutationVersion:0}).success);
 for(const value of [{expectedMutationVersion:'0'},{expectedMutationVersion:-1},{expectedMutationVersion:Number.MAX_SAFE_INTEGER+1},{expectedMutationVersion:1,actorId:'spoof'}])assert.equal(lifecycleInput.safeParse(value).success,false);
});
test('public query parsing has numeric defaults and rejects duplicate/unknown/regex injection keys',()=>{
 assert.deepEqual(query(listQuery,{originalUrl:'/api/v1/pois'}),{language:'en',q:'',limit:20});
 for(const url of ['/pois?language=en&language=vi','/pois?limit=0','/pois?limit=01','/pois?q=','/pois?language=xx','/pois?q[$regex]=x'])assert.throws(()=>query(listQuery,{originalUrl:url}),e=>e.status===422);
 assert.equal(query(listQuery,{originalUrl:'/pois?q=%5B.*%5D'}).q,'[.*]');
 assert.ok(query(nearbyQuery,{originalUrl:'/pois/nearby?lat=10.7&lon=106.7'}));
 for(const url of ['/pois/nearby?lat=91&lon=10','/pois/nearby?lat=1e2&lon=10','/pois/nearby?lat=10&lon=10&radius=9000','/pois/nearby?lat=10&lon=10&limit=5'])assert.throws(()=>query(nearbyQuery,{originalUrl:url}));
});
test('signed cursor binds filters, digest, canonical encoding and absolute expiry',()=>{
 const key=randomBytes(32),time=1000000,filters={language:'en',q:'A',limit:1},payload={v:1,kind:'pois',...filters,snapshotId:snapshotId([]),lastId:'a'.repeat(24),expiresAt:time+900000};
 const token=signCursor(payload,key);assert.deepEqual(readCursor(token,key,filters,time),payload);
 for(const [candidate,k,f]of [[token+'x',key,filters],[token,randomBytes(32),filters],[token,key,{...filters,language:'vi'}],[token,key,{...filters,limit:2}]])assert.throws(()=>readCursor(candidate,k,f,time),e=>e.code==='INVALID_CURSOR');
 assert.throws(()=>readCursor(token,key,filters,time+900000),e=>e.status===410);
 assert.equal(snapshotId([{a:1,b:2}]),snapshotId([{b:2,a:1}]));assert.notEqual(snapshotId([1,2]),snapshotId([2,1]));
});
test('nearby great-circle metric handles exact threshold, zero, poles and antimeridian',()=>{
 assert.equal(distanceMeters(0,0,[0,0]),0);
 const latitude=3000/6371008.8*180/Math.PI;assert.ok(Math.abs(distanceMeters(0,0,[0,latitude])-3000)<1e-8);
 assert.ok(distanceMeters(0,179.999,[-179.999,0])<300);assert.ok(Number.isFinite(distanceMeters(90,0,[180,-90])));
});
test('dedicated public key is optional, canonical and distinct; runtime exposes no rejected value',()=>{
 const value=randomBytes(32).toString('base64url');assert.equal(publicKey(undefined),null);assert.equal(publicKey(value).length,32);
 for(const bad of ['',value+'=','sensitive-private-invalid'])assert.throws(()=>publicKey(bad),e=>!e.message.includes(bad)||bad==='');assert.throws(()=>publicKey(value,value));
 const env={CONTENT_MONGODB_URI:'mongodb://127.0.0.1/vinlook_content_task014',IDENTITY_BASE_URL:'http://127.0.0.1:3001',CONTENT_IDENTITY_SERVICE_KEY_B64URL:randomBytes(32).toString('base64url'),CONTENT_ALLOWED_ORIGINS:'https://web.example.invalid',CONTENT_PUBLIC_CURSOR_KEY_B64URL:value};
 assert.equal(loadContentConfig('test',env).publicCursorKey.length,32);assert.equal(loadContentConfig('test',{...env,CONTENT_PUBLIC_CURSOR_KEY_B64URL:undefined}).publicCursorKey,null);
});
