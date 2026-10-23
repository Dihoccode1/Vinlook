import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EventEmitter} from 'node:events';
import {publicationDeadline} from '../src/publication/router.js';
import {languageCodes} from '../src/models/index.js';
import {reviewInput,publishInput,returnInput,approvedRegistry,locale} from '../src/publication/validation.js';
test('review schema binds exact versions and conditional reason, including English',()=>{
 assert.ok(locale.safeParse('en').success);assert.equal(locale.safeParse('zh').success,false);
 const value={expectedEditVersion:0,expectedTextVersion:1,decision:'approved'};
 assert.ok(reviewInput.safeParse(value).success);
 for(const patch of [{expectedEditVersion:'0'},{expectedTextVersion:0},{actorId:'spoof'},{reason:'not permitted'},{decision:'changes_required'}])assert.equal(reviewInput.safeParse({...value,...patch}).success,false);
 assert.ok(reviewInput.safeParse({...value,decision:'changes_required',reason:' Fix audio '}).success);
});
test('publish requires explicit pointer and geography confirmation; return needs reason',()=>{
 const body={expectedEditVersion:2,expectedPublishedRevisionId:null,confirmGeography:true};assert.ok(publishInput.safeParse(body).success);
 for(const patch of [{confirmGeography:false},{expectedPublishedRevisionId:undefined},{expectedEditVersion:Number.MAX_SAFE_INTEGER+1},{status:'published'}])assert.equal(publishInput.safeParse({...body,...patch}).success,false);
 assert.equal(returnInput.safeParse({expectedEditVersion:0,reason:' '}).success,false);
});
test('approved registry is exact sixteen locale immutable independent snapshot',()=>{
 const input={registryVersion:'fixture-v1',languages:Object.fromEntries(languageCodes.map(c=>[c,{voiceOrModelId:'synthetic-model'}]))};const parsed=approvedRegistry(input);assert.ok(parsed);input.languages.en.voiceOrModelId='changed';assert.equal(parsed.languages.en.voiceOrModelId,'synthetic-model');assert.ok(Object.isFrozen(parsed.languages.en));
 delete input.languages.vi;assert.equal(approvedRegistry(input),null);assert.equal(approvedRegistry(undefined),null);
 input.languages.vi={voiceOrModelId:'a'};input.languages.xx={voiceOrModelId:'a'};assert.equal(approvedRegistry(input),null);
});
test('absolute budget closes an unfinished JSON body and aborts verification for complete requests',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const complete of [false,true]){
  const req=Object.assign(new EventEmitter(),{complete,destroyed:false,destroy(){this.destroyed=true;}});
  const res=Object.assign(new EventEmitter(),{headersSent:false,locals:{requestId:'synthetic-request'},set(){return this;},status(v){this.statusCode=v;return this;},json(body){this.body=body;this.headersSent=true;this.emit('finish');this.emit('close');return this;}});
  let admitted=false;publicationDeadline(req,res,()=>admitted=true);assert.ok(admitted);assert.equal(res.locals.publication.signal.aborted,false);
  t.mock.timers.tick(60000);assert.equal(res.locals.publication.signal.aborted,true);
  if(!complete){assert.equal(res.statusCode,503);assert.equal(res.body.error.code,'PUBLICATION_VERIFICATION_UNAVAILABLE');assert.equal(req.destroyed,true);}
  else{assert.equal(res.headersSent,false);res.emit('close');}
 }
});
