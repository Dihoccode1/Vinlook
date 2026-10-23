import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomBytes} from 'node:crypto';
import mongoose from 'mongoose';
import {createContentModels} from '../src/models/index.js';
import {operations} from '../src/durability/validation.js';
import {parse,createInput,patchInput,languageInput,point,nextVersion} from '../src/drafts/validation.js';
import {loadContentConfig} from '../src/drafts/runtime.js';
const input={nameEN:' Synthetic ',sourceTextEN:' English source ',location:{type:'Point',coordinates:[106.7,10.78]}};
test('strict normalized create/patch/text inputs reject injected identity/state/operators and coercion',()=>{
 assert.equal(parse(createInput,input).sourceTextEN,'English source');assert.equal(parse(createInput,input).entrance,null);
 for(const patch of [{actorId:'x'},{mutationVersion:0},{status:'published'},{nameEN:null},{location:{type:'Point',coordinates:['106.7',10.78]}}])assert.throws(()=>parse(createInput,{...input,...patch}),{code:'INVALID_INPUT'});
 for(const v of [{expectedEditVersion:0,changes:{}},{expectedEditVersion:'0',changes:{nameEN:'x'}},{expectedEditVersion:0,changes:{$set:{nameEN:'x'}}}])assert.throws(()=>parse(patchInput,v));
 assert.throws(()=>parse(languageInput,{expectedEditVersion:0,text:''}));assert.throws(()=>parse(point,{type:'Point',coordinates:[0,91]}));
});
test('approved mutation counter and replay operation are explicit without an extra index',async()=>{
 const c=mongoose.createConnection(),m=createContentModels(c);try{const p=new m.POI({});assert.equal(p.mutationVersion,0);await p.validate();for(const n of ['0',-1,Number.MAX_SAFE_INTEGER+1])await assert.rejects(new m.POI({mutationVersion:n}).validate());assert.ok(operations.includes('revision.draft'));assert.equal(m.POI.schema.indexes().length,1);}finally{await c.close();}
});
test('version overflow rejects instead of rounding or wrapping',()=>{assert.equal(nextVersion(0),1);for(const v of [-1,1.5,Number.MAX_SAFE_INTEGER])assert.throws(()=>nextVersion(v),{code:'VERSION_EXHAUSTED',status:409});});
test('runtime activation is opt-in; Content URI/origin/key errors never echo input',()=>{
 assert.equal(loadContentConfig('production',{}),null);
 const env={CONTENT_MONGODB_URI:'mongodb://127.0.0.1/vinlook_content',IDENTITY_BASE_URL:'https://identity.example.invalid',CONTENT_IDENTITY_SERVICE_KEY_B64URL:randomBytes(32).toString('base64url'),CONTENT_ALLOWED_ORIGINS:'https://web.example.invalid'};
 assert.equal(loadContentConfig('production',env).origins.length,1);
 for(const patch of [{CONTENT_MONGODB_URI:'mongodb://127.0.0.1/identity_synthetic'},{CONTENT_ALLOWED_ORIGINS:'*'},{CONTENT_ALLOWED_ORIGINS:'https://web.example.invalid/path'},{IDENTITY_BASE_URL:'http://remote.example.invalid'}])assert.throws(()=>loadContentConfig('production',{...env,...patch}),e=>!e.message.includes('synthetic'));
});
