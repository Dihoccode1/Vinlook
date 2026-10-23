import {executeMutation} from '../durability/transaction.js';
import {DraftFailure,nextVersion} from '../drafts/validation.js';
const fail=(code,status=409)=>{throw new DraftFailure(code,status);};
const revFields=['nameEN','location','entrance','thumbnailAsset','sourceTextEN','sourceVersion'];
const localizedFields=['languageCode','sourceVersion','textVersion','text','audioAsset','durationSeconds'];
const pick=(v,fields)=>Object.fromEntries(fields.map(k=>[k,v[k]]));
export function createLifecycleService({connection,models,now=Date.now}){
 async function mutate(id,input,principal,key,restore){
  if(principal.account.role!=='Manager')fail('ACCESS_DENIED',403);
  const operation=restore?'poi.restore':'poi.delete';
  return executeMutation(connection,models,{actorId:principal.account.id,workSessionId:principal.currentWorkSession.id,operation,key,targetId:id,input},async session=>{
   const poi=await models.POI.findById(id).session(session);
   if(!poi)fail('CONTENT_NOT_FOUND',404);
   if(!Number.isSafeInteger(poi.mutationVersion)||poi.mutationVersion<0)fail('CONTENT_STATE_UNAVAILABLE',503);
   if(poi.mutationVersion!==input.expectedMutationVersion)fail('EDIT_VERSION_CONFLICT');
   if(restore?!poi.deletedAt:!!poi.deletedAt)fail(restore?'POI_NOT_DELETED':'POI_ALREADY_DELETED');
   const mutationVersion=nextVersion(poi.mutationVersion);
   let rev;
   if(restore){
    const working=await models.POIRevision.find({poiId:poi._id,status:{$in:['draft','in_review']}}).limit(2).session(session);
    if(working.length>1)fail('CONTENT_STATE_UNAVAILABLE',503);
    let published=null,publishedRows=[];
    if(poi.publishedRevisionId){
     published=await models.POIRevision.findOne({_id:poi.publishedRevisionId,poiId:poi._id,status:'published'}).session(session);if(!published)fail('CONTENT_STATE_UNAVAILABLE',503);
     publishedRows=await models.LocalizedContent.find({revisionId:published._id}).limit(17).session(session);
     const en=publishedRows.find(r=>r.languageCode==='en');
     if(!en||en.text!==published.sourceTextEN||publishedRows.some(r=>r.sourceVersion!==published.sourceVersion))fail('CONTENT_STATE_UNAVAILABLE',503);
     try{await published.validate();for(const row of publishedRows)await row.validate();}catch{fail('CONTENT_STATE_UNAVAILABLE',503);}
    }
    rev=working[0];
    if(rev){rev.status='draft';rev.editVersion=nextVersion(rev.editVersion);await rev.save({session});}
    else{
     if(!published)fail('CONTENT_STATE_UNAVAILABLE',503);
     const last=await models.POIRevision.findOne({poiId:poi._id}).sort({revisionNumber:-1}).session(session);
     [rev]=await models.POIRevision.create([{...pick(published.toObject(),revFields),poiId:poi._id,revisionNumber:nextVersion(last.revisionNumber),editVersion:0,status:'draft',createdBy:principal.account.id}],{session});
     for(const row of publishedRows)await models.LocalizedContent.create([{...pick(row.toObject(),localizedFields),revisionId:rev._id,reviewStatus:'pending',reviewedBy:null,reviewedAt:null}],{session});
    }
    await models.LocalizedContent.updateMany({revisionId:rev._id},{$set:{reviewStatus:'pending',reviewedBy:null,reviewedAt:null}},{session});
   }
   const change=restore?{deletedAt:null,deletedBy:null,publishedRevisionId:null}:{deletedAt:new Date(now()),deletedBy:principal.account.id};
   const changed=await models.POI.updateOne({_id:poi._id,mutationVersion:poi.mutationVersion,deletedAt:poi.deletedAt},{$set:{...change,mutationVersion}},{session});
   if(changed.modifiedCount!==1)fail('EDIT_VERSION_CONFLICT');
   return {status:200,body:{data:{poiId:id,status:restore?'restored':'deleted',...(restore?{revisionId:String(rev._id),editVersion:rev.editVersion}:{})}},events:[{poiId:id,action:operation,result:{status:'succeeded',errorCode:null}}]};
  },now);
 }
 return {delete:(...args)=>mutate(...args,false),restore:(...args)=>mutate(...args,true)};
}
