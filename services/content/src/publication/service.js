import {randomUUID} from 'node:crypto';
import {executeMutation} from '../durability/transaction.js';
import {canonical} from '../durability/validation.js';
import {DraftFailure,nextVersion} from '../drafts/validation.js';
import {languageCodes} from '../models/index.js';
import {approvedRegistry} from './validation.js';

const fail=(code,status=409)=>{throw new DraftFailure(code,status);};
const plain=v=>v?.toObject?v.toObject():v;
const snapshot=state=>canonical(JSON.parse(JSON.stringify({poi:plain(state.poi),rev:plain(state.rev),rows:state.rows.map(plain)})));
const result=(poi,rev)=>({status:200,body:{data:{poiId:String(poi._id),revisionId:String(rev._id),editVersion:rev.editVersion,status:rev.status}}});
export function createPublicationService(runtime){
 const {connection,models,now=Date.now}=runtime;
 // No mutable client/config object can switch provenance between preflight and commit.
 const registry=approvedRegistry(runtime.publicationRegistry);
 const budget=context=>{
  if(context?.signal?.aborted||!Number.isFinite(context?.deadline)||context.deadline<=Date.now())fail('PUBLICATION_VERIFICATION_UNAVAILABLE',503);
  return Math.max(1,Math.min(10000,context.deadline-Date.now()));
 };
 const options=(context,session)=>{const remaining=budget(context);return session?{}:{timeoutMS:remaining};};
 async function read(id,input,state,context,session){
  budget(context);
  const rev=await models.POIRevision.findById(id).session(session??null).setOptions(options(context,session));
  if(!rev)fail('CONTENT_NOT_FOUND',404);
  const poi=await models.POI.findById(rev.poiId).session(session??null).setOptions(options(context,session));
  if(!poi)fail('CONTENT_STATE_UNAVAILABLE',503);
  if(poi.deletedAt)fail('POI_DELETED');
  if(!Number.isSafeInteger(poi.mutationVersion)||poi.mutationVersion<0)fail('CONTENT_STATE_UNAVAILABLE',503);
  if(rev.editVersion!==input.expectedEditVersion)fail('EDIT_VERSION_CONFLICT');
  if(rev.status!==state)fail('REVISION_STATE_CONFLICT');
  if(poi.publishedRevisionId){
   const old=await models.POIRevision.findOne({_id:poi.publishedRevisionId,poiId:poi._id,status:'published'}).session(session??null).setOptions(options(context,session));
   if(!old)fail('CONTENT_STATE_UNAVAILABLE',503);
  }
  const rows=await models.LocalizedContent.find({revisionId:rev._id}).sort({languageCode:1}).session(session??null).setOptions(options(context,session));
  try{await rev.validate();for(const row of rows)await row.validate();}catch{fail('CONTENT_STATE_UNAVAILABLE',503);}
  return {poi,rev,rows};
 }
 function current(rev,row){
  if(!row||row.sourceVersion!==rev.sourceVersion||typeof row.text!=='string'||!row.text.trim()||row.languageCode==='en'&&row.text!==rev.sourceTextEN)fail('PUBLICATION_NOT_READY');
 }
 function audio(rev,row){
  current(rev,row);
  if(!row.audioAsset||row.audioAsset.format!=='mp3'||row.audioAsset.textVersion!==row.textVersion||!Number.isFinite(row.durationSeconds)||row.durationSeconds<90||row.durationSeconds>150)fail('PUBLICATION_NOT_READY');
  if(!registry)fail('PUBLICATION_VERIFICATION_UNAVAILABLE',503);
  if(row.audioAsset.registryVersion!==registry.registryVersion||row.audioAsset.voiceOrModelId!==registry.languages[row.languageCode]?.voiceOrModelId)fail('PUBLICATION_NOT_READY');
 }
 function ready(state){
  const {rev,rows}=state;
  if(!rev.entrance||!rev.thumbnailAsset||rows.length!==16||new Set(rows.map(r=>r.languageCode)).size!==16||languageCodes.some(code=>!rows.some(r=>r.languageCode===code)))fail('PUBLICATION_NOT_READY');
  for(const row of rows){audio(rev,row);if(row.reviewStatus!=='approved'||!row.reviewedBy||!row.reviewedAt)fail('PUBLICATION_NOT_READY');}
 }
 async function verify(state,context,code=null){
  if(!registry||!runtime.media?.verifyAudioReference||code===null&&!runtime.verifyThumbnail)fail('PUBLICATION_VERIFICATION_UNAVAILABLE',503);
  const {poi,rev,rows}=state;
  try{
   if(code===null){budget(context);if(await runtime.verifyThumbnail(plain(rev.thumbnailAsset),{poiId:String(poi._id),signal:context.signal,deadline:context.deadline})!==true)fail('INVALID_MEDIA_REFERENCE',422);}
   for(const row of rows.filter(r=>code===null||r.languageCode===code)){
    budget(context);
    const verified=await runtime.media.verifyAudioReference(plain(row.audioAsset),{poiId:String(poi._id),sourceVersion:rev.sourceVersion,textVersion:row.textVersion,languageCode:row.languageCode,signal:context.signal,deadline:context.deadline});
    if(!verified||verified.durationSeconds!==row.durationSeconds)fail('INVALID_MEDIA_REFERENCE',422);
   }
   budget(context);
  }catch(error){if(error instanceof DraftFailure)throw error;fail('PUBLICATION_VERIFICATION_UNAVAILABLE',503);}
 }
 async function save(state,session,context){
  budget(context);
  const {poi,rev}=state;
  rev.editVersion=nextVersion(rev.editVersion);
  const updated=await models.POI.updateOne({_id:poi._id,deletedAt:null,mutationVersion:poi.mutationVersion},{$set:{mutationVersion:nextVersion(poi.mutationVersion),...(rev.status==='published'?{publishedRevisionId:rev._id}:{})}},{session,...options(context,session)});
  if(updated.modifiedCount!==1)fail('EDIT_VERSION_CONFLICT');
  await rev.save({session,...options(context,session)});
 }
 const event=(poi,action,reason)=>({poiId:String(poi._id),action,result:{status:'succeeded',errorCode:null},...(reason?{reason}:{})});
 async function change(id,input,principal,kind,context,code){
  const stateName=kind==='return'?'in_review':'draft';
  const before=await read(id,input,stateName,context);
  if(kind==='review'){
   const row=before.rows.find(r=>r.languageCode===code);
   if(!row||row.sourceVersion!==before.rev.sourceVersion)fail('PUBLICATION_NOT_READY');
   if(row.textVersion!==input.expectedTextVersion)fail('EDIT_VERSION_CONFLICT');
   if(input.decision==='approved'){audio(before.rev,row);await verify(before,context,code);}
  }else if(kind==='submit'){ready(before);await verify(before,context);}
  const expected=snapshot(before),eventId=randomUUID(),occurredAt=new Date(now());
  for(let attempt=0;attempt<3;attempt++){
   budget(context);const session=await connection.startSession();let output;
   try{
    await session.withTransaction(async()=>{
     const state=await read(id,input,stateName,context,session);
     if(snapshot(state)!==expected)fail('EDIT_VERSION_CONFLICT');
     if(kind==='review'){
      const row=state.rows.find(r=>r.languageCode===code);
      row.reviewStatus=input.decision;row.reviewedBy=principal.account.id;row.reviewedAt=occurredAt;
      await row.save({session,...options(context,session)});
     }else state.rev.status=kind==='submit'?'in_review':'draft';
     await save(state,session,context);
     const payload={...event(state.poi,kind==='review'?'content.review':`revision.${kind}`,input.reason),eventId,actorId:principal.account.id,workSessionId:principal.currentWorkSession.id,occurredAt:occurredAt.toISOString()};
     await models.AuditOutbox.create([{eventId,payload,createdAt:occurredAt,nextAttemptAt:occurredAt,attemptCount:0}],{session,...options(context,session)});
     budget(context);output=result(state.poi,state.rev);
    },{timeoutMS:budget(context),maxCommitTimeMS:Math.min(3000,budget(context)),readPreference:'primary',writeConcern:{w:'majority'}});
    return output;
   }catch(error){if(error instanceof DraftFailure)throw error;if(error.hasErrorLabel?.('TransientTransactionError')&&attempt<2)continue;fail('CONTENT_UNAVAILABLE',503);}
   finally{await session.endSession();}
  }
 }
 return {
  review:(id,input,p,code,c)=>change(id,input,p,'review',c,code),
  submit:(id,input,p,c)=>change(id,input,p,'submit',c),
  return:(id,input,p,c)=>{if(p.account.role!=='Manager')fail('ACCESS_DENIED',403);return change(id,input,p,'return',c);},
  async publish(id,input,p,key,context){
   if(p.account.role!=='Manager')fail('ACCESS_DENIED',403);
   const scope={actorId:p.account.id,workSessionId:p.currentWorkSession.id,operation:'revision.publish',key,targetId:id,input};
   const old=await models.IdempotencyRecord.findOne({actorId:p.account.id,operation:scope.operation,key}).setOptions(options(context)).lean();
   // Let the existing transaction primitive validate/replay/quarantine. No provider on replay.
   if(old&&(old.status!=='completed'||+new Date(old.expiresAt)>now()))return executeMutation(connection,models,scope,async()=>fail('IDEMPOTENCY_RECONCILIATION_REQUIRED',503),now,context);
   let before;
   try{
    before=await read(id,input,'in_review',context);
    if((before.poi.publishedRevisionId?String(before.poi.publishedRevisionId):null)!==input.expectedPublishedRevisionId)fail('EDIT_VERSION_CONFLICT');
    ready(before);await verify(before,context);
   }catch(error){
    // Another identical request may commit between the first replay read and preflight.
    const raced=await models.IdempotencyRecord.findOne({actorId:p.account.id,operation:scope.operation,key}).setOptions(options(context)).lean();
    if(raced&&(raced.status!=='completed'||+new Date(raced.expiresAt)>now()))return executeMutation(connection,models,scope,async()=>fail('IDEMPOTENCY_RECONCILIATION_REQUIRED',503),now,context);
    throw error;
   }
   const expected=snapshot(before);
   return executeMutation(connection,models,scope,async session=>{
    const state=await read(id,input,'in_review',context,session);
    if(snapshot(state)!==expected)fail('EDIT_VERSION_CONFLICT');
    ready(state);state.rev.status='published';await save(state,session,context);budget(context);
    return {...result(state.poi,state.rev),events:[event(state.poi,'revision.publish')]};
   },now,context);
  },
 };
}
