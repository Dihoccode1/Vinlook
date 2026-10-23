import express from 'express';
import {z} from 'zod';
import {protectedRequest} from '../authorization.js';
import {parse,objectId,DraftFailure} from '../drafts/validation.js';
import {uuid} from '../durability/validation.js';
import {processInput,claimInput,attemptInput,resultInput} from './validation.js';
import {workerPrincipal} from './credentials.js';
import {createJobService} from './service.js';
import {readMultipart} from '../media/multipart.js';
import {publicationDeadline} from '../publication/router.js';
import {discardBody} from '../media/router.js';
const safeJob=job=>({account:{id:String(job.requestedBy)},currentWorkSession:{id:String(job.workSessionId)}});
export function jobRouter(runtime){
 const router=express.Router(),service=createJobService(runtime),auth=write=>protectedRequest(runtime.authorization,{roles:['Staff','Manager'],requireSession:write});
 const json=[(req,res,next)=>req.is('application/json')?next():next(new DraftFailure('UNSUPPORTED_MEDIA_TYPE',415)),express.json({limit:131072,strict:true})];
 const run=fn=>async(req,res,next)=>{try{const r=await fn(req,res);if(r?.body)res.status(r.status).json({...r.body,requestId:res.locals.requestId});else res.json({data:r,requestId:res.locals.requestId});}catch(error){if(error.code==='UPLOAD_BUSY')res.set('Retry-After','5');if(req.method==='PUT'){await discardBody(req);res.set('Connection','close');}next(error);}};
 const worker=(req,res,next)=>{try{res.locals.worker=workerPrincipal(runtime.worker,req.get('X-Vinlook-Worker-Id'),req.get('X-Vinlook-Worker-Key'),(runtime.now??Date.now)());next();}catch(error){next(error);}};
 router.post('/admin/revisions/:id/process',auth(true),...json,run((req,res)=>service.process(parse(objectId,req.params.id),parse(processInput,req.body),res.locals.principal,parse(uuid,req.get('Idempotency-Key')))));
 router.post('/admin/jobs/:id/retry',auth(true),...json,run((req,res)=>service.retry(parse(objectId,req.params.id),parse(processInput,req.body),res.locals.principal,parse(uuid,req.get('Idempotency-Key')))));
 router.get('/admin/jobs',auth(false),run(req=>{const pairs=[...new URL(req.originalUrl,'http://request.invalid').searchParams];if(pairs.length!==1||pairs[0][0]!=='revisionId')throw new DraftFailure('INVALID_INPUT',422);return service.list(parse(objectId,pairs[0][1]));}));
 router.get('/admin/jobs/:id',auth(false),run(req=>service.read(parse(objectId,req.params.id))));
 router.post('/internal/jobs/claim',worker,...json,run((req,res)=>{const input=parse(claimInput,req.body);if(input.workerId!==res.locals.worker.id)throw new DraftFailure('ACCESS_DENIED',403);return service.claim(res.locals.worker,input.capabilities);}));
 router.post('/internal/jobs/:id/renew',worker,...json,run((req,res)=>service.renew(parse(objectId,req.params.id),parse(attemptInput,req.body).attemptId,res.locals.worker)));
 router.post('/internal/jobs/:id/result',publicationDeadline,worker,...json,run((req,res)=>service.result(parse(objectId,req.params.id),parse(resultInput,req.body),res.locals.worker,res.locals.publication)));
 const ownedIntent=async(req,res)=>{
  if(!runtime.media||!runtime.models.MediaUpload)throw new DraftFailure('JOB_CONFIGURATION_UNAVAILABLE');
  const row=await runtime.models.MediaUpload.findById(parse(objectId,req.params.intentId)).setOptions({timeoutMS:10000});if(!row||row.kind!=='audio'||String(row.jobId)!==req.params.id||!row.attemptId)throw new DraftFailure('ACCESS_DENIED',403);
  const admitted=await service.admit(parse(objectId,req.params.id),row.attemptId,res.locals.worker);return {row,...admitted};
 };
 router.post('/internal/jobs/:id/media-intents',worker,...json,run(async(req,res)=>{
  const input=parse(attemptInput,req.body),{job,state}=await service.admit(parse(objectId,req.params.id),input.attemptId,res.locals.worker);if(job.taskType!=='audio'||!runtime.media)throw new DraftFailure('ACCESS_DENIED',403);
  const row=await runtime.media.issueAudio({jobId:job._id,attemptId:job.attemptId,revisionId:job.revisionId,expectedEditVersion:state.rev.editVersion,sourceVersion:job.inputVersion.sourceVersion,textVersion:job.inputVersion.textVersion,languageCode:job.languageCode,registryVersion:job.inputSnapshot.registryVersion,voiceOrModelId:job.inputSnapshot.modelId},safeJob(job));
  return {intentId:String(row._id),status:row.status,expiresAt:row.expiresAt};
 }));
 router.put('/internal/jobs/:id/media-intents/:intentId/file',worker,run(async(req,res)=>{
  const deadline=Date.now()+90000,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000),abort=()=>controller.abort();req.once('aborted',abort);res.once('close',abort);
  try{const {row,job}=await ownedIntent(req,res);const result=await runtime.media.upload(String(row._id),safeJob(job),(kind,signal)=>readMultipart(req,kind,signal),{deadline,signal:controller.signal,admit:()=>service.admit(String(job._id),row.attemptId,res.locals.worker)});return {status:result.status,body:{data:result.data}};}
  finally{clearTimeout(timer);req.off('aborted',abort);res.off('close',abort);}
 }));
 router.post('/internal/jobs/:id/media-intents/:intentId/reconcile',worker,...json,run(async(req,res)=>{parse(z.strictObject({}),req.body);const {row,job}=await ownedIntent(req,res);const result=await runtime.media.reconcile(String(row._id),safeJob(job),{signal:AbortSignal.timeout(60000),admit:()=>service.admit(String(job._id),row.attemptId,res.locals.worker)});return {intentId:result.id,status:result.status};}));
 return router;
}
