import {timingSafeEqual} from 'node:crypto';
import {identifier} from './validation.js';
import {publicKey} from '../public/validation.js';
import {DraftFailure} from '../drafts/validation.js';
export function workerConfig(environment=process.env,now=Date.now()){
 const values=['CONTENT_WORKER_ID','CONTENT_WORKER_KEY_B64URL','CONTENT_WORKER_OLD_KEY_B64URL','CONTENT_WORKER_OLD_KEY_EXPIRES_AT'];if(values.every(k=>environment[k]===undefined))return null;
 const invalid=()=>{throw Error('Invalid worker configuration');};
 try{
  const id=identifier.parse(environment.CONTENT_WORKER_ID),key=publicKey(environment.CONTENT_WORKER_KEY_B64URL);if(!key)invalid();
  const forbidden=[environment.CONTENT_IDENTITY_SERVICE_KEY_B64URL,environment.CONTENT_PUBLIC_CURSOR_KEY_B64URL];if(forbidden.includes(environment.CONTENT_WORKER_KEY_B64URL))invalid();
  let old=null,expiresAt=null;
  if(environment.CONTENT_WORKER_OLD_KEY_B64URL!==undefined||environment.CONTENT_WORKER_OLD_KEY_EXPIRES_AT!==undefined){old=publicKey(environment.CONTENT_WORKER_OLD_KEY_B64URL,environment.CONTENT_WORKER_KEY_B64URL);expiresAt=Date.parse(environment.CONTENT_WORKER_OLD_KEY_EXPIRES_AT);if(!old||forbidden.includes(environment.CONTENT_WORKER_OLD_KEY_B64URL)||!Number.isFinite(expiresAt)||new Date(expiresAt).toISOString()!==environment.CONTENT_WORKER_OLD_KEY_EXPIRES_AT||expiresAt<=now||expiresAt>now+86400000)invalid();}
  return {id,key,old,expiresAt};
 }catch{invalid();}
}
export function workerPrincipal(config,id,value,now){
 if(!config)throw new DraftFailure('JOB_CONFIGURATION_UNAVAILABLE');
 let candidate;try{candidate=publicKey(value);}catch{}
 if(!candidate||id!==config.id||!(timingSafeEqual(candidate,config.key)||config.old&&now<config.expiresAt&&timingSafeEqual(candidate,config.old)))throw new DraftFailure('WORKER_AUTHENTICATION_REQUIRED',401);
 return {id:config.id,execution:'local_worker'};
}
