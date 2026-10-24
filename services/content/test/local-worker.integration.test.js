import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import express from 'express';
import {adapterFixture} from './jobs.integration.test.js';
import {processingManifest,hybrid} from '../src/adapters/config.js';
import {createJobService} from '../src/jobs/service.js';

async function pythonWorker(origin,f){
 const child=spawn('docker',['run','--rm','-i','--label','vinlook.task=TASK-018','--cpus','4','--memory','4g','--read-only','--tmpfs','/tmp:size=64m,mode=1777','--entrypoint','python','vinlook-task018-worker:verified','-m','tests.integration_driver'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
 let stdout='',stderr='';child.stdout.on('data',b=>{stdout+=b;});child.stderr.on('data',b=>{stderr+=b;});child.stdin.end(JSON.stringify({origin,workerId:f.runtime.worker.id,key:f.runtime.worker.key.toString('base64url')}));const timer=setTimeout(()=>child.kill(),120000);
 try{const [code]=await once(child,'exit');assert.equal(code,0,stderr+' '+stdout);return JSON.parse(stdout.trim());}finally{clearTimeout(timer);}
}
test('real Python local worker claims Content job, renews, transcodes synthetic PCM and attaches verified media',async()=>{
 const f=adapterFixture(),r=await f.draft();f.runtime.processingManifest=processingManifest;
 const base=await f.listen(f.createApp(f.runtime));await createJobService(f.runtime).process(r.revisionId,{expectedEditVersion:0},f.principal,randomUUID());
 const result=await pythonWorker(base.replace('127.0.0.1','host.docker.internal'),f);assert.equal(result.status,'completed');assert.equal(result.modelDownloads,false);
 const row=await f.models.LocalizedContent.findOne({revisionId:r.revisionId,languageCode:'en'});assert.equal(row.audioAsset.voiceOrModelId,hybrid.profiles.en.id);assert.equal(row.reviewStatus,'pending');assert.ok(row.durationSeconds>=90&&row.durationSeconds<=150);assert.equal((await f.models.ProcessingJob.findOne({revisionId:r.revisionId,languageCode:'en'})).status,'succeeded');
});
test('Python lost upload and result acknowledgements reconcile/replay without another synthesis or upload',async()=>{
 const f=adapterFixture(),r=await f.draft();f.runtime.processingManifest=processingManifest;const target=await f.listen(f.createApp(f.runtime));await createJobService(f.runtime).process(r.revisionId,{expectedEditVersion:0},f.principal,randomUUID());
 let results=0,uploads=0;const proxy=express();proxy.use(express.raw({type:()=>true,limit:4000000}));proxy.use(async(req,res)=>{
  const reply=await fetch(target+req.originalUrl,{method:req.method,headers:{'Content-Type':req.get('content-type'),'X-Vinlook-Worker-Id':req.get('x-vinlook-worker-id'),'X-Vinlook-Worker-Key':req.get('x-vinlook-worker-key')},body:req.body});const body=await reply.text();
  if(req.path.endsWith('/file'))uploads++;
  if(req.path.endsWith('/result')&&++results===1){req.socket.destroy();return;}
  res.status(reply.status).type('application/json').send(body);
 });const base=await f.listen(proxy);f.setMediaMode('lost');
 try{const result=await pythonWorker(base.replace('127.0.0.1','host.docker.internal'),f);assert.equal(result.status,'completed');assert.equal(uploads,1);assert.equal(results,2);assert.equal((await f.models.ProcessingJob.findOne({revisionId:r.revisionId,languageCode:'en'})).status,'succeeded');}finally{f.setMediaMode('normal');}
});
