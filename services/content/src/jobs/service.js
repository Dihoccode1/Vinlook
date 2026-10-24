import {randomUUID} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
const resultBudgets=new AsyncLocalStorage();
import {executeMutation} from '../durability/transaction.js';
import {requestHash,canonical} from '../durability/validation.js';
import {DraftFailure,nextVersion} from '../drafts/validation.js';
import {languageCodes} from '../models/index.js';
import {manifest} from './validation.js';
const bad=(code='JOBS_UNAVAILABLE',status=503)=>{throw new DraftFailure(code,status);};
const object=v=>v?.toObject?v.toObject():v;
const pending=row=>{row.reviewStatus='pending';row.reviewedBy=null;row.reviewedAt=null;};
const equal=(a,b)=>canonical(object(a))===canonical(object(b));
export function createJobService(runtime){
 const {connection,models,now=Date.now}=runtime,Job=models.ProcessingJob,registry=manifest(runtime.processingManifest);
 const configured=()=>{if(!Job||!registry)bad('JOB_CONFIGURATION_UNAVAILABLE');};
 const options=session=>{const c=resultBudgets.getStore(),left=c?c.deadline-Date.now():10000;if(c?.signal?.aborted||left<=0)bad();return session?{}:{timeoutMS:Math.max(1,Math.min(10000,left))};};
 const event=(job,failed=false,action='job.complete')=>({poiId:String(job.poiId),actorId:String(job.requestedBy),workSessionId:String(job.workSessionId),action,result:{status:failed?'failed':'succeeded',errorCode:failed?'PROCESSING_FAILED':null}});
 async function audit(session,job,failed=false){const occurredAt=new Date(now()),eventId=randomUUID(),payload={...event(job,failed),eventId,occurredAt:occurredAt.toISOString()};await models.AuditOutbox.create([{eventId,payload,createdAt:occurredAt,nextAttemptAt:occurredAt,attemptCount:0}],{session});}
 async function transaction(fn,context){
  const left=()=>{if(context&&(context.signal?.aborted||context.deadline<=Date.now()))bad();return Math.max(1,Math.min(10000,context?context.deadline-Date.now():10000));};
  const session=await connection.startSession();let result;
  try{await session.withTransaction(async()=>{left();result=await fn(session);left();},{timeoutMS:left(),maxCommitTimeMS:Math.min(3000,left()),readPreference:'primary',writeConcern:{w:'majority'}});return result;}
  catch(error){if(error instanceof DraftFailure)throw error;bad();}finally{await session.endSession();}
 }
 async function target(revisionId,session){
  const rev=await models.POIRevision.findById(revisionId).session(session??null).setOptions(options(session)),poi=rev?await models.POI.findById(rev.poiId).session(session??null).setOptions(options(session)):null;
  if(!rev||!poi||poi.deletedAt||rev.status!=='draft')bad('STALE_JOB_INPUT',409);
  if(!Number.isSafeInteger(poi.mutationVersion)||poi.mutationVersion<0)bad('CONTENT_STATE_UNAVAILABLE');
  return {rev,poi};
 }
 async function touch(state,session){
  const counter=nextVersion(state.poi.mutationVersion),version=nextVersion(state.rev.editVersion);
  const changed=await models.POI.updateOne({_id:state.poi._id,mutationVersion:state.poi.mutationVersion,deletedAt:null},{$set:{mutationVersion:counter}},{session});if(changed.modifiedCount!==1)bad('EDIT_VERSION_CONFLICT',409);
  state.rev.editVersion=version;await state.rev.save({session});
 }
 function descriptor(rev,row,code,type){
  const config=registry.languages[code][type==='audio'?'audio':'translation'];
  return {inputVersion:{sourceVersion:rev.sourceVersion,textVersion:type==='audio'?row.textVersion:null,targetTextVersion:type==='translation'?(row?.textVersion??null):null,targetSourceVersion:type==='translation'?(row?.sourceVersion??null):null},inputSnapshot:{text:type==='audio'?row.text:rev.sourceTextEN,registryVersion:registry.registryVersion,modelId:config.modelId,execution:config.execution}};
 }
 async function current(job,session){
  try{await job.validate();}catch{bad('CONTENT_STATE_UNAVAILABLE');}
  const state=await target(job.revisionId,session);if(String(state.poi._id)!==String(job.poiId))bad('STALE_JOB_INPUT',409);
  const row=await models.LocalizedContent.findOne({revisionId:job.revisionId,languageCode:job.languageCode}).session(session??null).setOptions(options(session)),v=job.inputVersion;
  if(state.rev.sourceVersion!==v.sourceVersion)bad('STALE_JOB_INPUT',409);
  if(job.taskType==='audio'?!row||row.sourceVersion!==v.sourceVersion||row.textVersion!==v.textVersion||row.text!==job.inputSnapshot.text:(row?.textVersion??null)!==v.targetTextVersion||(row?.sourceVersion??null)!==v.targetSourceVersion||state.rev.sourceTextEN!==job.inputSnapshot.text)bad('STALE_JOB_INPUT',409);
  const config=registry.languages[job.languageCode][job.taskType==='audio'?'audio':'translation'];
  if(!config||job.inputSnapshot.registryVersion!==registry.registryVersion||config.modelId!==job.inputSnapshot.modelId||config.execution!==job.inputSnapshot.execution)bad('STALE_JOB_INPUT',409);
  return {...state,row};
 }
 async function createJob(session,state,row,code,type,principal){
  const d=descriptor(state.rev,row,code,type),hash=requestHash({taskType:type,languageCode:code,...d});
  const active=await Job.findOne({revisionId:state.rev._id,languageCode:code,taskType:type,status:{$in:['queued','running']}}).session(session);
  if(active){if(active.inputHash===hash)bad('JOB_ALREADY_ACTIVE',409);active.status='failed';active.error='STALE_INPUT';await active.save({session});await audit(session,active,true);}
  if(await Job.exists({revisionId:state.rev._id,languageCode:code,taskType:type,inputHash:hash,status:{$in:['failed','waiting_quota']}}).session(session))bad('JOB_REQUIRES_RETRY',409);
  const [job]=await Job.create([{poiId:state.poi._id,revisionId:state.rev._id,requestedBy:principal.account.id,workSessionId:principal.currentWorkSession.id,languageCode:code,taskType:type,...d,inputHash:hash,status:'queued',reclaimCount:0,retryCount:0}],{session});return job;
 }
 const scope=(p,operation,key,id,input)=>({actorId:p.account.id,workSessionId:p.currentWorkSession.id,operation,key,targetId:id,input});
 const view=job=>({id:String(job._id),poiId:String(job.poiId),revisionId:String(job.revisionId),languageCode:job.languageCode,taskType:job.taskType,status:job.status,inputVersion:object(job.inputVersion),reclaimCount:job.reclaimCount,retryCount:job.retryCount,createdAt:job.createdAt,updatedAt:job.updatedAt,leaseExpiresAt:job.leaseExpiresAt,error:job.error});
 async function owned(id,attemptId,caller,session,live=true){
  const job=await Job.findById(id).session(session??null).setOptions(options(session));if(!job)bad('JOB_NOT_FOUND',404);
  try{await job.validate();}catch{bad('CONTENT_STATE_UNAVAILABLE');}
  if(job.inputSnapshot.execution!==caller.execution)bad('ACCESS_DENIED',403);
  if(job.attemptId!==attemptId||live&&(job.status!=='running'||+job.leaseExpiresAt<=now()))bad('STALE_JOB_ATTEMPT',409);
  if(job.leaseOwner!==caller.id)bad('ACCESS_DENIED',403);
  return job;
 }
 const receipt=job=>({jobId:String(job._id),status:job.status,accepted:true});
 return {
  async process(id,input,p,key){configured();return executeMutation(connection,models,scope(p,'revision.process',key,id,input),async session=>{
   const state=await target(id,session);if(state.rev.editVersion!==input.expectedEditVersion)bad('EDIT_VERSION_CONFLICT',409);
   const rows=await models.LocalizedContent.find({revisionId:id}).session(session),en=rows.find(r=>r.languageCode==='en');if(!en||en.text!==state.rev.sourceTextEN||en.sourceVersion!==state.rev.sourceVersion)bad('CONTENT_STATE_UNAVAILABLE');
   const jobs=[];
   for(const code of languageCodes){const row=rows.find(r=>r.languageCode===code);
    const translation=code!=='en'&&(!row?.text||row.sourceVersion!==state.rev.sourceVersion);
    const audio=!translation&&(!row?.audioAsset||row.audioAsset.format!=='mp3'||!(row.durationSeconds>=90&&row.durationSeconds<=150)||row.audioAsset.textVersion!==row.textVersion||row.audioAsset.registryVersion!==registry.registryVersion||row.audioAsset.voiceOrModelId!==registry.languages[code].audio.modelId);
    if(translation||audio)jobs.push(await createJob(session,state,row,code,translation?'translation':'audio',p));
   }
   if(!jobs.length)bad('NO_WORK_REQUIRED',409);await touch(state,session);
   return {status:202,body:{data:{poiId:String(state.poi._id),revisionId:id,jobIds:jobs.map(j=>String(j._id)),status:'queued'}},events:[{poiId:String(state.poi._id),action:'job.create',result:{status:'succeeded',errorCode:null}}]};
  },now);},
  async retry(id,input,p,key){configured();return executeMutation(connection,models,scope(p,'job.retry',key,id,input),async session=>{
   const job=await Job.findById(id).session(session);if(!job)bad('JOB_NOT_FOUND',404);if(!['failed','waiting_quota'].includes(job.status))bad('JOB_NOT_RETRYABLE',409);
   if(job.error==='PROVIDER_OUTCOME_UNKNOWN'&&!input.acknowledgeProviderResend)bad('PROVIDER_RETRY_CONFIRMATION_REQUIRED',409);
   if(input.acknowledgeProviderResend&&job.error!=='PROVIDER_OUTCOME_UNKNOWN')bad('INVALID_INPUT',422);
   const state=await current(job,session);if(state.rev.editVersion!==input.expectedEditVersion)bad('EDIT_VERSION_CONFLICT',409);
   job.status='queued';job.retryCount=nextVersion(job.retryCount);job.reclaimCount=0;job.attemptId=null;job.leaseOwner=null;job.leaseExpiresAt=null;job.lastResultHash=null;job.acceptedAt=null;job.resultRef=null;job.error=null;job.requestedBy=p.account.id;job.workSessionId=p.currentWorkSession.id;
   await job.save({session});await touch(state,session);return {status:202,body:{data:{poiId:String(job.poiId),revisionId:String(job.revisionId),jobIds:[id],status:'queued'}},events:[{poiId:String(job.poiId),action:'job.retry',result:{status:'succeeded',errorCode:null}}]};
  },now);},
  async read(id){if(!Job)bad('JOB_CONFIGURATION_UNAVAILABLE');const job=await Job.findById(id).setOptions({timeoutMS:10000});if(!job)bad('JOB_NOT_FOUND',404);return view(job);},
  async list(revisionId){if(!Job)bad('JOB_CONFIGURATION_UNAVAILABLE');const jobs=await Job.find({revisionId}).sort({_id:1}).limit(1001).setOptions({timeoutMS:10000});if(jobs.length>1000)bad();return {items:jobs.map(view)};},
  async claim(caller,codes,existingSession=null){configured();const supported=codes.filter(code=>registry.languages[code]&&(registry.languages[code].audio.execution===caller.execution||caller.execution==='server_adapter'&&registry.languages[code].translation));if(!supported.length)bad('INVALID_CAPABILITIES',422);
   const claim=async session=>{
    const candidates=await Job.find({languageCode:{$in:supported},'inputSnapshot.execution':caller.execution,$or:[{status:'queued'},{status:'running',leaseExpiresAt:{$lte:new Date(now())}}]}).sort({createdAt:1,_id:1}).limit(32).session(session);
    for(const job of candidates){
     try{await current(job,session);}catch(error){if(error.code!=='STALE_JOB_INPUT')throw error;job.status='failed';job.error='STALE_INPUT';await job.save({session});await audit(session,job,true);continue;}
     if(job.status==='running'){if(job.reclaimCount>=3){job.status='failed';job.error='LEASE_RECLAIM_EXHAUSTED';await job.save({session});await audit(session,job,true);continue;}job.reclaimCount++;}
     job.status='running';job.attemptId=randomUUID();job.leaseOwner=caller.id;job.leaseExpiresAt=new Date(now()+300000);await job.save({session});return {job:{id:String(job._id),taskType:job.taskType,languageCode:job.languageCode,inputVersion:object(job.inputVersion),inputSnapshot:object(job.inputSnapshot),attemptId:job.attemptId,leaseExpiresAt:job.leaseExpiresAt,retryCount:job.retryCount}};
    }return {job:null};
   };return existingSession?claim(existingSession):transaction(claim);
  },
  async renew(id,attemptId,caller){configured();return transaction(async session=>{const job=await owned(id,attemptId,caller,session);await current(job,session);job.leaseExpiresAt=new Date(now()+300000);await job.save({session});return {jobId:id,leaseExpiresAt:job.leaseExpiresAt};});},
  async admit(id,attemptId,caller){configured();const job=await owned(id,attemptId,caller);const state=await current(job);return {job,state};},
  async result(id,input,caller,context){return resultBudgets.run(context,async()=>{configured();
   const hash=requestHash(input),before=await owned(id,input.attemptId,caller,null,false);
   if(before.lastResultHash){if(before.lastResultHash!==hash)bad('JOB_RESULT_CONFLICT',409);return receipt(before);}
   if(before.status!=='running'||+before.leaseExpiresAt<=now())bad('STALE_JOB_ATTEMPT',409);
   if(!equal(before.inputVersion,input.inputVersion))bad('STALE_JOB_INPUT',409);await current(before);
   const outcome=input.outcome;let media=null;
   if(outcome.status==='succeeded'){
    if(before.taskType==='translation'?!outcome.text:!outcome.mediaIntentId)bad('INVALID_JOB_OUTPUT',422);
    if(before.taskType==='audio'){
     if(!runtime.media||!models.MediaUpload)bad('JOB_CONFIGURATION_UNAVAILABLE');
     media=await models.MediaUpload.findOne({_id:outcome.mediaIntentId,jobId:before._id,attemptId:before.attemptId,status:'verified',kind:'audio'}).setOptions({timeoutMS:10000});if(!media)bad('INVALID_JOB_OUTPUT',422);
     const ref={publicId:media.publicId,url:media.url,format:media.format,textVersion:media.textVersion,registryVersion:media.registryVersion,voiceOrModelId:media.voiceOrModelId};
     const verified=await runtime.media.verifyAudioReference(ref,{poiId:String(before.poiId),sourceVersion:before.inputVersion.sourceVersion,textVersion:before.inputVersion.textVersion,languageCode:before.languageCode,signal:context.signal,deadline:context.deadline});
     if(!verified||verified.durationSeconds!==media.durationSeconds||media.voiceOrModelId!==before.inputSnapshot.modelId||media.registryVersion!==before.inputSnapshot.registryVersion)bad('INVALID_JOB_OUTPUT',422);media={document:media,ref};
    }
   }
   return transaction(async session=>{
    const job=await owned(id,input.attemptId,caller,session,false);if(job.lastResultHash){if(job.lastResultHash!==hash)bad('JOB_RESULT_CONFLICT',409);return receipt(job);}
    if(job.status!=='running'||+job.leaseExpiresAt<=now())bad('STALE_JOB_ATTEMPT',409);const state=await current(job,session);
    if(outcome.status==='succeeded'){
     let row=state.row;
     if(job.taskType==='translation'){
      if(!row)row=new models.LocalizedContent({revisionId:job.revisionId,languageCode:job.languageCode,sourceVersion:state.rev.sourceVersion,textVersion:1,text:outcome.text,reviewStatus:'pending'});
      else if(row.text!==outcome.text||row.sourceVersion!==state.rev.sourceVersion){row.textVersion=nextVersion(row.textVersion);row.text=outcome.text;row.sourceVersion=state.rev.sourceVersion;}
      pending(row);await row.save({session});
      const currentAudio=row.audioAsset&&row.audioAsset.textVersion===row.textVersion&&row.audioAsset.registryVersion===registry.registryVersion&&row.audioAsset.voiceOrModelId===registry.languages[row.languageCode].audio.modelId;
      if(!currentAudio)await createJob(session,state,row,row.languageCode,'audio',{account:{id:String(job.requestedBy)},currentWorkSession:{id:String(job.workSessionId)}});
     }else{
      const stored=await models.MediaUpload.findOne({_id:media.document._id,status:'verified',attemptId:job.attemptId,jobId:job._id}).session(session);if(!stored||stored.sha256!==media.document.sha256||stored.url!==media.document.url)bad('INVALID_JOB_OUTPUT',422);
      row.audioAsset=media.ref;row.durationSeconds=stored.durationSeconds;pending(row);await row.save({session});if(!stored.attachedAt){stored.attachedAt=new Date(now());await stored.save({session});}
     }
     job.resultRef={localizedContentId:row._id,textVersion:row.textVersion,mediaIntentId:media?.document._id??null};
    }
    job.status=outcome.status;job.error=outcome.status==='succeeded'?null:outcome.errorCode;job.lastResultHash=hash;job.acceptedAt=new Date(now());await touch(state,session);await job.save({session});await audit(session,job,outcome.status!=='succeeded');
    if(caller.execution==='server_adapter'&&models.ProviderCall){const ledger=await models.ProviderCall.findOne({jobId:job._id,retryCount:job.retryCount}).session(session);if(ledger){if(outcome.status==='succeeded'&&ledger.attemptId!==job.attemptId)bad('STALE_JOB_ATTEMPT',409);ledger.state=outcome.status==='succeeded'?'completed':outcome.errorCode==='PROVIDER_OUTCOME_UNKNOWN'?'uncertain':'failed';ledger.finishedAt=new Date(now());ledger.resultHash=hash;ledger.errorCode=outcome.status==='succeeded'?null:outcome.errorCode;await ledger.save({session});}}
    return receipt(job);
   },context);
  });},
 };
}
