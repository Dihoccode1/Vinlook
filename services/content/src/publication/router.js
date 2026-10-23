import express from 'express';
import {protectedRequest} from '../authorization.js';
import {uuid} from '../durability/validation.js';
import {DraftFailure,parse,objectId} from '../drafts/validation.js';
import {locale,reviewInput,submitInput,returnInput,publishInput} from './validation.js';
import {createPublicationService} from './service.js';
export function publicationDeadline(req,res,next){
  const controller=new AbortController(),timer=setTimeout(()=>{
   controller.abort();
   // Do not leave an unfinished JSON body holding the request beyond the absolute budget.
   if(!req.complete&&!res.headersSent){
    res.set('Connection','close');res.once('finish',()=>req.destroy());
    res.status(503).json({error:{code:'PUBLICATION_VERIFICATION_UNAVAILABLE',message:'Publication verification is unavailable',requestId:res.locals.requestId}});
   }
  },60000);
  const abort=()=>controller.abort();req.once('aborted',abort);res.once('close',abort);
  res.once('close',()=>{clearTimeout(timer);req.off('aborted',abort);});
  res.locals.publication={deadline:Date.now()+60000,signal:controller.signal};next();
}
export function publicationRouter(runtime){
 const router=express.Router(),service=createPublicationService(runtime);
 const deadline=publicationDeadline;
 const auth=manager=>protectedRequest(runtime.authorization,{roles:manager?['Manager']:['Staff','Manager'],requireSession:true});
 const json=[(req,res,next)=>req.is('application/json')?next():next(new DraftFailure('UNSUPPORTED_MEDIA_TYPE',415)),express.json({limit:16384,strict:true})];
 const run=fn=>async(req,res,next)=>{try{const r=await fn(req,res.locals.principal,res.locals.publication);res.status(r.status).json({...r.body,requestId:res.locals.requestId});}catch(error){next(error);}};
 const prefix='/admin/revisions/:id';
 router.post(prefix+'/languages/:code/review',deadline,auth(false),...json,run((r,p,c)=>service.review(parse(objectId,r.params.id),parse(reviewInput,r.body),p,parse(locale,r.params.code),c)));
 router.post(prefix+'/submit',deadline,auth(false),...json,run((r,p,c)=>service.submit(parse(objectId,r.params.id),parse(submitInput,r.body),p,c)));
 router.post(prefix+'/return',deadline,auth(true),...json,run((r,p,c)=>service.return(parse(objectId,r.params.id),parse(returnInput,r.body),p,c)));
 router.post(prefix+'/publish',deadline,auth(true),...json,run((r,p,c)=>service.publish(parse(objectId,r.params.id),parse(publishInput,r.body),p,parse(uuid,r.get('Idempotency-Key')),c)));
 return router;
}
