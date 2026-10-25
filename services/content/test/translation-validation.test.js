import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseTranslation,createGeminiProvider} from '../src/adapters/provider.js';
const valid=()=>({candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:JSON.stringify({languageCode:'vi',text:' Bản dịch '})}]}}]});
const job={id:'a'.repeat(24),taskType:'translation',languageCode:'vi',inputSnapshot:{registryVersion:'vinlook-hybrid-v1',execution:'server_adapter',modelId:'gemini-3.5-flash-lite',text:'private-source'}};
const fixtures=[
 ['blocked',v=>{v.promptFeedback={blockReason:'private-provider-value'};}],
 ['candidate_count',v=>{v.candidates=[];}],
 ['finish_reason',v=>{v.candidates[0].finishReason='private-provider-value';}],
 ['role',v=>{v.candidates[0].content.role='user';}],
 ['part_count',v=>{v.candidates[0].content.parts.push({text:'private-output'});}],
 ['part_shape',v=>{v.candidates[0].content.parts[0].thoughtSignature='private-signature';}],
 ['inner_json',v=>{v.candidates[0].content.parts[0].text='private-invalid-json';}],
 ['object_shape',v=>{v.candidates[0].content.parts[0].text=JSON.stringify({languageCode:'vi',text:'private-output',extra:true});}],
 ['locale',v=>{v.candidates[0].content.parts[0].text=JSON.stringify({languageCode:'ja',text:'private-output'});}],
 ['text_shape',v=>{v.candidates[0].content.parts[0].text=JSON.stringify({languageCode:'vi',text:' '});}],
];
for(const[reason,mutate]of fixtures)test(`translation rejection ${reason} is classified without leaking provider data or resending`,async()=>{
 const v=valid();mutate(v);
 assert.throws(()=>parseTranslation(v,'vi'),e=>e.code==='PROVIDER_OUTCOME_UNKNOWN'&&e.diagnosticCategory==='translationvalidation'&&e.validationReason===reason);
 let calls=0;const logs=[];
 const provider=createGeminiProvider({key:'private-key'},{fetchImpl:async()=>{calls++;return Response.json(v);},logFailure:e=>logs.push(e)});
 await assert.rejects(provider.call(job),e=>e.code==='PROVIDER_OUTCOME_UNKNOWN');assert.equal(calls,1);
 assert.deepEqual(logs,[{event:'gemini_provider_failure',taskType:'translation',category:'translationvalidation',httpStatus:200,jsonContentType:true,jobId:job.id,validationReason:reason}]);
 assert.equal(JSON.stringify(logs).includes('private'),false);
});
test('accepted translation and optional envelope metadata remain unchanged; part metadata stays rejected',()=>{
 const v=valid();v.usageMetadata={totalTokenCount:123};v.candidates[0].index=0;
 assert.equal(parseTranslation(v,'vi'),'Bản dịch');
 for(const extra of [{thought:true},{thoughtSignature:'synthetic'},{functionCall:{name:'synthetic'}}]){
  const x=valid();Object.assign(x.candidates[0].content.parts[0],extra);assert.throws(()=>parseTranslation(x,'vi'),e=>e.validationReason==='part_shape');
 }
 for(const x of [null,{}, {candidates:[null]}])assert.throws(()=>parseTranslation(x,'vi'),e=>e.code==='PROVIDER_OUTCOME_UNKNOWN');
});
