import express from 'express';
import {z} from 'zod';
import {protectedRequest} from '../authorization.js';
import {uuid} from '../durability/validation.js';
import {DraftFailure,parse,objectId,version} from '../drafts/validation.js';
import {createLifecycleService} from './service.js';
export const lifecycleInput=z.strictObject({expectedMutationVersion:version});
export function lifecycleRouter(runtime){
 const router=express.Router(),service=createLifecycleService(runtime);
 const auth=protectedRequest(runtime.authorization,{roles:['Manager'],requireSession:true});
 const json=[(req,res,next)=>req.is('application/json')?next():next(new DraftFailure('UNSUPPORTED_MEDIA_TYPE',415)),express.json({limit:16384,strict:true})];
 for(const action of ['delete','restore'])router.post('/admin/pois/:id/'+action,auth,...json,async(req,res,next)=>{
  try{const result=await service[action](parse(objectId,req.params.id),parse(lifecycleInput,req.body),res.locals.principal,parse(uuid,req.get('Idempotency-Key')));res.status(result.status).json({...result.body,requestId:res.locals.requestId});}catch(error){next(error);}
 });return router;
}
