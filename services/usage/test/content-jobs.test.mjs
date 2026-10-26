import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import {monitoringRouter,monitoringKey,jobSummary} from '../../content/src/monitoring.js';
import {createContentJobs} from '../src/content-jobs.js';
const key=Buffer.alloc(32,7).toString('base64url'),epoch=Date.parse('2026-10-26T00:00:00.000Z');
const counts={queued:2,running:1,succeeded:3,failed:0,waiting_quota:0};
function fixture(){
  const queries=[];let ended=false;
  const session={withTransaction:async(fn,options)=>{assert.equal(options.readConcern.level,'snapshot');assert.equal(options.timeoutMS,3000);return fn();},endSession:async()=>{ended=true;}};
  return {runtime:{monitoringCallerKey:monitoringKey({CONTENT_USAGE_CALLER_KEY_B64URL:key}),now:()=>epoch,
    connection:{startSession:async()=>session},models:{ProcessingJob:{countDocuments:({status})=>{
      queries.push(status);return {session(value){assert.equal(value,session);return this;},maxTimeMS:async()=>counts[status]};
    }}}},queries,ended:()=>ended};
}
test('Content counts all five states in one snapshot and always ends its session',async()=>{
  const f=fixture();assert.deepEqual(await jobSummary(f.runtime),{asOf:new Date(epoch).toISOString(),counts});
  assert.equal(f.queries.length,5);assert.equal(f.ended(),true);
  f.runtime.models.ProcessingJob.countDocuments=()=>{throw Error('private URI');};
  await assert.rejects(jobSummary(f.runtime));assert.equal(f.ended(),true);
});
test('real HTTP caller boundary and Usage mapping; browser/JWT/wrong key/query refused',async t=>{
  const f=fixture(),app=express();app.use('/api/v1',monitoringRouter(f.runtime));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`,path='/api/v1/internal/monitoring/jobs-summary';
  const headers={'X-Vinlook-Service':'usage','X-Vinlook-Service-Key':key};
  for(const extra of [{Origin:'https://frontend.invalid'},{Authorization:'Bearer synthetic'},{'X-Vinlook-Service-Key':'bad'}]){
    const response=await fetch(origin+path,{headers:{...headers,...extra}});assert.equal(response.status,403);assert.equal(f.queries.length,0);
  }
  assert.equal((await fetch(origin+path+'?x=1',{headers})).status,422);
  const jobs=createContentJobs({origin,key,now:()=>epoch});const result=await jobs();
  assert.equal(result.status,'ok');assert.deepEqual(result.counts,counts);assert.equal(f.queries.length,5);
  delete f.runtime.models.ProcessingJob;const failed=await jobs();assert.equal(failed.status,'unavailable');assert.equal(failed.counts,null);
});
test('Usage rejects stale/partial/oversized replies, never forwards JWT or retries',async()=>{
  for(const variant of ['stale','partial','oversized','error']){
    let calls=0;
    const jobs=createContentJobs({origin:'https://content.invalid',key,now:()=>epoch,fetchImpl:async(url,options)=>{
      calls++;assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.headers.Authorization,undefined);
      const data={asOf:new Date(epoch-(variant==='stale'?31000:0)).toISOString(),counts:variant==='partial'?{queued:0}:counts};
      return new Response(variant==='oversized'?'x'.repeat(16385):JSON.stringify({data,requestId:'00000000-0000-4000-8000-000000000000'}),
        {status:variant==='error'?503:200,headers:{'Content-Type':'application/json'}});
    }});
    const result=await jobs();assert.equal(result.counts,null);assert.equal(result.status,'unavailable');assert.equal(calls,1);
  }
});
test('caller key is canonical and cannot reuse other Content credentials',()=>{
  assert.equal(monitoringKey({}),null);
  assert.throws(()=>monitoringKey({CONTENT_USAGE_CALLER_KEY_B64URL:'bad'}));
  assert.throws(()=>monitoringKey({CONTENT_USAGE_CALLER_KEY_B64URL:key,CONTENT_WORKER_KEY_B64URL:key}));
});
