import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observeWorker} from '../../content/src/jobs/observation.js';
import {createWorkerProbe,createContentJobs} from '../src/content-jobs.js';
import {createHealthSampler} from '../src/health-sampler.js';
test('only local-worker activity stamps observation; Manager/server adapter cannot refresh it',()=>{
  const job={inputSnapshot:{execution:'local_worker'}};
  observeWorker(job,{execution:'server_adapter'},10);assert.equal(job.workerObservedAt,undefined);
  observeWorker(job,{role:'Manager'},20);assert.equal(job.workerObservedAt,undefined);
  observeWorker(job,{execution:'local_worker'},30);assert.equal(+job.workerObservedAt,30);
  job.inputSnapshot.execution='server_adapter';observeWorker(job,{execution:'local_worker'},40);assert.equal(+job.workerObservedAt,30);
});
test('unobserved stays unknown; actual observation up then stale at180s without refreshing event time',async()=>{
  let time=200000,observed=null;
  const probe=createWorkerProbe(async()=>({status:'ok',workerObservedAt:observed}));
  const sampler=createHealthSampler({now:()=>time,probes:{worker:probe}});
  assert.equal((await sampler.sample()).components.find(x=>x.name==='worker').status,'unknown');
  time+=30000;observed=new Date(time).toISOString();
  assert.equal((await sampler.sample()).components.find(x=>x.name==='worker').status,'up');
  time+=180000;assert.equal((await sampler.sample()).components.find(x=>x.name==='worker').status,'stale');
  sampler.close();
});
test('concurrent jobs/health share one Content request and accept old Content without worker field',async()=>{
  let resolve,calls=0;
  const jobs=createContentJobs({origin:'https://content.invalid',key:'synthetic',now:()=>0,fetchImpl:()=>{
    calls++;return new Promise(done=>resolve=done);
  }});
  const first=jobs(),second=jobs();assert.equal(first,second);
  resolve(new Response(JSON.stringify({data:{asOf:new Date(0).toISOString(),counts:{queued:0,running:0,succeeded:0,failed:0,waiting_quota:0}},requestId:'00000000-0000-4000-8000-000000000000'}),{headers:{'Content-Type':'application/json'}}));
  assert.equal((await first).workerObservedAt,null);await second;assert.equal(calls,1);
});
