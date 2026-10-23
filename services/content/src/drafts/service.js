import { randomUUID } from 'node:crypto';
import { executeMutation } from '../durability/transaction.js';
import { canonical } from '../durability/validation.js';
import { DraftFailure, nextVersion } from './validation.js';
const localizedFields=['languageCode','sourceVersion','textVersion','text','audioAsset','durationSeconds','reviewStatus','reviewedBy','reviewedAt'];
const revisionFields=['nameEN','location','entrance','thumbnailAsset','sourceTextEN','sourceVersion'];
const pick=(v,keys)=>Object.fromEntries(keys.map(k=>[k,v[k]]));
const pending=row=>{row.reviewStatus='pending';row.reviewedBy=null;row.reviewedAt=null;};
const data=(poi,rev)=>({poiId:String(poi._id),revisionId:String(rev._id),editVersion:rev.editVersion,status:'draft'});
export function createDraftService(runtime){
 const {connection,models,now=Date.now}=runtime;
 async function media(asset){if(asset!==null){if(!runtime.verifyThumbnail)throw new DraftFailure('MEDIA_VERIFICATION_UNAVAILABLE');if(await runtime.verifyThumbnail(asset)!==true)throw new DraftFailure('INVALID_MEDIA_REFERENCE',422);}}
 async function parent(id,session,write=true){
  const poi=await models.POI.findById(id).session(session);
  if(!poi)throw new DraftFailure('CONTENT_NOT_FOUND',404);
  if(write&&poi.deletedAt)throw new DraftFailure('POI_DELETED',409);
  if(!Number.isSafeInteger(poi.mutationVersion)||poi.mutationVersion<0)throw new DraftFailure('CONTENT_STATE_UNAVAILABLE');
  return poi;
 }
 async function guard(poi,session){
  const counter=nextVersion(poi.mutationVersion);
  const result=await models.POI.updateOne({_id:poi._id,deletedAt:null,mutationVersion:poi.mutationVersion},{$set:{mutationVersion:counter}},{session});
  if(result.modifiedCount!==1)throw new DraftFailure('EDIT_VERSION_CONFLICT',409);
 }
 function intent(poiId,action='poi.update'){return{poiId:String(poiId),action,result:{status:'succeeded',errorCode:null}};}
 async function insertAudit(session,principal,poiId,eventId,occurredAt){
  const payload={...intent(poiId),eventId,actorId:principal.account.id,workSessionId:principal.currentWorkSession.id,occurredAt:occurredAt.toISOString()};
  await models.AuditOutbox.create([{eventId,payload,createdAt:occurredAt,nextAttemptAt:occurredAt,attemptCount:0}],{session});
 }
 function scope(principal,operation,key,targetId,input){return{actorId:principal.account.id,workSessionId:principal.currentWorkSession.id,operation,key,targetId,input};}
 return {
  async create(input,principal,key){
   await media(input.thumbnailAsset);
   return executeMutation(connection,models,scope(principal,'poi.create',key,null,input),async session=>{
    const [poi]=await models.POI.create([{}],{session});
    const [rev]=await models.POIRevision.create([{...input,poiId:poi._id,revisionNumber:1,editVersion:0,sourceVersion:1,status:'draft',createdBy:principal.account.id}],{session});
    await models.LocalizedContent.create([{revisionId:rev._id,languageCode:'en',sourceVersion:1,textVersion:1,text:input.sourceTextEN,reviewStatus:'pending'}],{session});
    return{status:201,body:{data:data(poi,rev)},events:[intent(poi._id,'poi.create')]};
   },now);
  },
  async clone(id,input,principal,key){
   return executeMutation(connection,models,scope(principal,'revision.draft',key,id,input),async session=>{
    const poi=await parent(id,session);
    if(!poi.publishedRevisionId)throw new DraftFailure('NO_PUBLISHED_REVISION',409);
    if(String(poi.publishedRevisionId)!==input.expectedPublishedRevisionId)throw new DraftFailure('EDIT_VERSION_CONFLICT',409);
    if(await models.POIRevision.exists({poiId:poi._id,status:{$in:['draft','in_review']}}).session(session))throw new DraftFailure('WORKING_REVISION_EXISTS',409);
    const old=await models.POIRevision.findOne({_id:poi.publishedRevisionId,poiId:poi._id,status:'published'}).session(session);
    if(!old)throw new DraftFailure('CONTENT_STATE_UNAVAILABLE');
    const rows=await models.LocalizedContent.find({revisionId:old._id}).session(session);
    const en=rows.find(r=>r.languageCode==='en');
    if(!en||en.text!==old.sourceTextEN||en.sourceVersion!==old.sourceVersion||rows.some(r=>r.sourceVersion!==old.sourceVersion))throw new DraftFailure('CONTENT_STATE_UNAVAILABLE');
    try{await old.validate();for(const row of rows)await row.validate();}catch{throw new DraftFailure('CONTENT_STATE_UNAVAILABLE');}
    const last=await models.POIRevision.findOne({poiId:poi._id}).sort({revisionNumber:-1}).session(session);
    const revisionNumber=nextVersion(last.revisionNumber);
    await guard(poi,session);
    const [rev]=await models.POIRevision.create([{...pick(old.toObject(),revisionFields),poiId:poi._id,revisionNumber,editVersion:0,status:'draft',createdBy:principal.account.id}],{session});
    for(const row of rows)await models.LocalizedContent.create([{...pick(row.toObject(),localizedFields),revisionId:rev._id}],{session});
    return{status:201,body:{data:data(poi,rev)},events:[intent(poi._id)]};
   },now);
  },
  async patch(id,input,principal,code=null){
   if(code===null&&Object.hasOwn(input.changes,'thumbnailAsset'))await media(input.changes.thumbnailAsset);
   const eventId=randomUUID(),occurredAt=new Date(now());let output;
   for(let attempt=0;attempt<3;attempt++){
    const session=await connection.startSession();
    try{
     await session.withTransaction(async()=>{
      const rev=await models.POIRevision.findById(id).session(session);
      if(!rev)throw new DraftFailure('CONTENT_NOT_FOUND',404);
      const poi=await parent(rev.poiId,session);
      if(rev.status!=='draft')throw new DraftFailure('REVISION_NOT_EDITABLE',409);
      if(rev.editVersion!==input.expectedEditVersion)throw new DraftFailure('EDIT_VERSION_CONFLICT',409);
      let changed=false;
      if(code!==null){
       let row=await models.LocalizedContent.findOne({revisionId:rev._id,languageCode:code}).session(session);
       if(!row){row=new models.LocalizedContent({revisionId:rev._id,languageCode:code,sourceVersion:rev.sourceVersion,textVersion:1,text:input.text,reviewStatus:'pending'});changed=true;}
       else if(row.text!==input.text||row.sourceVersion!==rev.sourceVersion){row.text=input.text;row.sourceVersion=rev.sourceVersion;row.textVersion=nextVersion(row.textVersion);pending(row);changed=true;}
       if(changed)await row.save({session});
      }else{
       const oldSource=rev.sourceTextEN;
       for(const [field,value]of Object.entries(input.changes)){
        const current=rev.get(field);const plain=current?.toObject?current.toObject():current;
        if(canonical(plain)!==canonical(value)){rev.set(field,value);changed=true;}
       }
       if(rev.sourceTextEN!==oldSource){
        rev.sourceVersion=nextVersion(rev.sourceVersion);
        const rows=await models.LocalizedContent.find({revisionId:rev._id}).session(session);
        let en=rows.find(r=>r.languageCode==='en');
        if(!en){en=new models.LocalizedContent({revisionId:rev._id,languageCode:'en',sourceVersion:rev.sourceVersion,textVersion:1,text:rev.sourceTextEN,reviewStatus:'pending'});rows.push(en);}
        else{en.text=rev.sourceTextEN;en.sourceVersion=rev.sourceVersion;en.textVersion=nextVersion(en.textVersion);}
        for(const row of rows){pending(row);await row.save({session});}
       }
      }
      if(changed){await guard(poi,session);rev.editVersion=nextVersion(rev.editVersion);await rev.save({session});await insertAudit(session,principal,poi._id,eventId,occurredAt);}
      output={status:200,body:{data:data(poi,rev)}};
     },{timeoutMS:10000,maxCommitTimeMS:3000,readPreference:'primary',writeConcern:{w:'majority'}});
     return output;
    }catch(error){if(error instanceof DraftFailure)throw error;if(error.hasErrorLabel?.('TransientTransactionError')&&attempt<2)continue;throw new DraftFailure();}
    finally{await session.endSession();}
   }
  },
  async read(id){
   const poi=await parent(id,null,false);
   const published=poi.publishedRevisionId?await models.POIRevision.findOne({_id:poi.publishedRevisionId,poiId:poi._id,status:'published'}):null;
   if(poi.publishedRevisionId&&!published)throw new DraftFailure('CONTENT_STATE_UNAVAILABLE');
   const working=await models.POIRevision.findOne({poiId:poi._id,status:{$in:['draft','in_review']}});
   const rev=working??published;
   const rows=rev?await models.LocalizedContent.find({revisionId:rev._id}).sort({languageCode:1}):[];
   const view=v=>{if(!v)return null;const obj=v.toObject();const {_id,...rest}=obj;return{id:String(_id),...rest};};
   const poiView=view(poi);delete poiView.mutationVersion;
   return{poi:poiView,publishedRevision:view(published),workingRevision:view(working),localizedContents:rows.map(row=>({...view(row),isSourceCurrent:row.sourceVersion===rev.sourceVersion,isAudioCurrent:row.sourceVersion===rev.sourceVersion&&Boolean(row.audioAsset)&&row.audioAsset.textVersion===row.textVersion}))};
  },
 };
}
