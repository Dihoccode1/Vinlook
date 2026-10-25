import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createTranslationPreflight} from '../src/adapters/preflight.js';
import {createGeminiProvider} from '../src/adapters/provider.js';
const key='synthetic-private-key';
const metadata=()=>Response.json({name:'models/gemini-3.5-flash-lite',supportedGenerationMethods:['generateContent'],privateExtra:'never-return'});
test('preflight makes one fixed metadata GET, reports only booleans and applies cooldown',async()=>{
 let clock=100000,calls=0;const check=createTranslationPreflight({key},{now:()=>clock,fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.headers['x-goog-api-key'],key);assert.equal(options.body,undefined);return metadata();}});
 const result=await check();assert.deepEqual(result,{status:'ok',category:null,httpStatus:200,jsonContentType:true,modelMatches:true,supportsGenerateContent:true});
 await assert.rejects(check(),e=>e.code==='ADAPTER_PREFLIGHT_COOLDOWN');assert.equal(calls,1);clock+=60000;assert.equal((await check()).status,'ok');assert.equal(calls,2);assert.equal(JSON.stringify(result).includes('never-return'),false);
});
test('preflight rejects concurrent calls without dispatching a second request',async()=>{
 let resolve,calls=0;const check=createTranslationPreflight({key},{fetchImpl:()=>{calls++;return new Promise(r=>{resolve=r;});}});const first=check();await assert.rejects(check(),e=>e.code==='ADAPTER_PREFLIGHT_BUSY');resolve(metadata());assert.equal((await first).status,'ok');assert.equal(calls,1);
});
test('preflight coarsens error/redirect/timeout/body failures without provider payload',async()=>{
 const cases=[['http',()=>Response.json({error:{message:key}},{status:403})],['nonjson',()=>new Response(key,{headers:{'content-type':'text/html'}})],['jsonparse',()=>new Response('{'+key,{headers:{'content-type':'application/json'}})],['oversize',()=>new Response('x'.repeat(65537),{headers:{'content-type':'application/json'}})],['model_mismatch',()=>Response.json({name:key})],['method_missing',()=>Response.json({name:'models/gemini-3.5-flash-lite',supportedGenerationMethods:[]})],['transport',()=>{throw Error('redirect or private: '+key);}]];
 for(const[category,fetchImpl]of cases){const result=await createTranslationPreflight({key},{fetchImpl})();// No network.
  assert.equal(result.category,category);assert.equal(result.status,'failed');assert.equal(JSON.stringify(result).includes(key),false);
 }
 const check=createTranslationPreflight({key},{timeoutMs:10,fetchImpl:async(_url,{signal})=>{await new Promise(resolve=>{const timer=setTimeout(resolve,20);signal.addEventListener('abort',()=>{clearTimeout(timer);resolve();},{once:true});});throw Error(key);}});assert.equal((await check()).category,'timeout');
});
test('generation logs safe categories while preserving unknown/http/quota outcomes and never retrying',async()=>{
 const job={id:'a'.repeat(24),taskType:'translation',languageCode:'vi',inputSnapshot:{registryVersion:'vinlook-hybrid-v1',execution:'server_adapter',modelId:'gemini-3.5-flash-lite',text:'private-source-never-log'}};
 const cases=[['transport','PROVIDER_OUTCOME_UNKNOWN',()=>{throw Error(key);} ],['http','PROVIDER_FAILED',()=>Response.json({secret:key},{status:400})],['http','QUOTA_EXHAUSTED',()=>Response.json({secret:key},{status:429})],['nonjson','PROVIDER_OUTCOME_UNKNOWN',()=>new Response(key,{headers:{'content-type':'text/html'}})],['jsonparse','PROVIDER_OUTCOME_UNKNOWN',()=>new Response('{',{headers:{'content-type':'application/json'}})],['translationvalidation','PROVIDER_OUTCOME_UNKNOWN',()=>Response.json({candidates:[],secret:key})]];
 for(const[category,code,fetchImpl]of cases){let calls=0;const logs=[],provider=createGeminiProvider({key},{fetchImpl:async(...args)=>{calls++;return fetchImpl(...args);},logFailure:e=>logs.push(e)});await assert.rejects(provider.call(job),e=>e.code===code);assert.equal(calls,1);assert.equal(logs.length,1);assert.equal(logs[0].category,category);assert.equal(logs[0].jobId,job.id);assert.equal(JSON.stringify(logs).includes(key),false);assert.equal(JSON.stringify(logs).includes(job.inputSnapshot.text),false);assert.deepEqual(Object.keys(logs[0]).sort(),['category','event','httpStatus','jobId','jsonContentType','taskType']);}
 const provider=createGeminiProvider({key},{fetchImpl:async()=>{throw Error(key);},logFailure:()=>{throw Error('logger unavailable');}});await assert.rejects(provider.call(job),e=>e.code==='PROVIDER_OUTCOME_UNKNOWN');
});
