import express from 'express';
import {mediaRouter} from '../media/router.js';
import {randomUUID} from 'node:crypto';
import {protectedRequest} from '../authorization.js';
import {uuid,MutationFailure} from '../durability/validation.js';
import {createDraftService} from './service.js';
import {DraftFailure,parse,objectId,createInput,cloneInput,patchInput,languageInput,locale} from './validation.js';
const messages={INVALID_INPUT:'Invalid content input',CONTENT_NOT_FOUND:'Content was not found',POI_DELETED:'The POI is deleted',REVISION_NOT_EDITABLE:'The revision is not editable',EDIT_VERSION_CONFLICT:'The content has changed; reload before editing',WORKING_REVISION_EXISTS:'A working revision already exists',NO_PUBLISHED_REVISION:'No published revision exists',VERSION_EXHAUSTED:'The version limit was reached',IDEMPOTENCY_CONFLICT:'The idempotency key conflicts with the request',INVALID_MEDIA_REFERENCE:'The media reference is invalid',MEDIA_VERIFICATION_UNAVAILABLE:'Media verification is unavailable',IDEMPOTENCY_RECONCILIATION_REQUIRED:'The mutation requires reconciliation'};
export function draftRouter(runtime){
 const router=express.Router();const service=createDraftService(runtime);
 router.use((req,res,next)=>{
  res.set('Cache-Control','no-store');res.locals.requestId=randomUUID();
  const origin=req.get('Origin');if(origin&&!runtime.origins.includes(origin))return next(new DraftFailure('ACCESS_DENIED',403));
  if(origin){res.set('Access-Control-Allow-Origin',origin);res.vary('Origin');}
  if(req.method==='OPTIONS'){
   res.set('Access-Control-Allow-Methods','GET,POST,PATCH,PUT,OPTIONS');res.set('Access-Control-Allow-Headers','Authorization,Content-Type,Idempotency-Key');return res.status(204).end();
  }
  if(req.originalUrl.includes('?'))return next(new DraftFailure('INVALID_INPUT',422));next();
 });
 router.use(mediaRouter(runtime));
 const auth=write=>protectedRequest(runtime.authorization,{roles:['Staff','Manager'],requireSession:write});
 const json=[(req,res,next)=>req.is('application/json')?next():next(new DraftFailure('UNSUPPORTED_MEDIA_TYPE',415)),express.json({limit:131072,strict:true})];
 const key=req=>parse(uuid,req.get('Idempotency-Key'));
 const run=fn=>async(req,res,next)=>{try{const result=await fn(req,res.locals.principal);res.status(result.status).json({...result.body,requestId:res.locals.requestId});}catch(error){next(error);}};
 router.post('/admin/pois',auth(true),...json,run((req,p)=>service.create(parse(createInput,req.body),p,key(req))));
 router.post('/admin/pois/:id/draft',auth(true),...json,run((req,p)=>service.clone(parse(objectId,req.params.id),parse(cloneInput,req.body),p,key(req))));
 router.patch('/admin/revisions/:id',auth(true),...json,run((req,p)=>service.patch(parse(objectId,req.params.id),parse(patchInput,req.body),p)));
 router.patch('/admin/revisions/:id/languages/:code',auth(true),...json,run((req,p)=>service.patch(parse(objectId,req.params.id),parse(languageInput,req.body),p,parse(locale,req.params.code))));
 router.get('/admin/pois/:id',auth(false),run(async req=>({status:200,body:{data:await service.read(parse(objectId,req.params.id))}})));
 router.use((error,req,res,_next)=>{
  let status=503,code='CONTENT_UNAVAILABLE';
  if(error instanceof MutationFailure){status=error.status;code=error.code;}
  else if(error.type==='entity.too.large'){status=413;code='PAYLOAD_TOO_LARGE';}
  else if(error.type==='entity.parse.failed'){status=400;code='MALFORMED_JSON';}
  const message=messages[code]??({ACCESS_DENIED:'Access is denied',UNSUPPORTED_MEDIA_TYPE:'JSON content is required',PAYLOAD_TOO_LARGE:'The request is too large',MALFORMED_JSON:'Malformed JSON'}[code])??'Content is temporarily unavailable';
  res.status(status).json({error:{code,message,requestId:res.locals.requestId??randomUUID()}});
 });return router;
}
