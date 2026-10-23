import mongoose from 'mongoose';
import {createMediaModel} from '../media/model.js';
import {loadMediaConfig} from '../media/validation.js';
import {createCloudinaryAdapter} from '../media/provider.js';
import {createMediaService} from '../media/service.js';
import {loadAuthorizationConfig} from '../authorization.js';
import {createContentModels} from '../models/index.js';
import {createDurabilityModels} from '../durability/models.js';
import {createOutboxSender} from '../durability/sender.js';
export function loadContentConfig(mode,environment=process.env){
 if(!environment.CONTENT_MONGODB_URI)return null;
 const invalid=()=>{throw new Error('Invalid Content runtime configuration');};
 const uri=environment.CONTENT_MONGODB_URI;
 let url;try{url=new URL(uri);}catch{invalid();}
 if(!['mongodb:','mongodb+srv:'].includes(url.protocol)||!(url.pathname==='/vinlook_content'||mode==='test'&&/^\/vinlook_content_task0(?:12|19)$/.test(url.pathname)))invalid();
 const authorization=loadAuthorizationConfig(mode,environment);
 const origins=(environment.CONTENT_ALLOWED_ORIGINS??(mode==='development'?'http://localhost:5173,http://127.0.0.1:5173':'')).split(',').map(v=>v.trim());
 for(const value of origins){try{const origin=new URL(value);if(origin.origin!==value||!(origin.protocol==='https:'||mode!=='production'&&origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname)))invalid();}catch{invalid();}}
 return Object.freeze({uri,authorization,mode,media:loadMediaConfig(environment),origins:Object.freeze([...new Set(origins)])});
}
export async function verifyContentCatalog(connection,models){
 const collections=await connection.db.listCollections().toArray();
 if(collections.length!==Object.keys(models).length||collections.some(c=>c.type!=='collection'||Object.keys(c.options??{}).length))throw new Error('Content catalog mismatch');
 for(const model of Object.values(models)){
  if(!collections.some(c=>c.name===model.collection.name))throw new Error('Content catalog mismatch');
  const indexes=await model.collection.indexes(),expected=model.schema.indexes();
  if(indexes.length!==expected.length+1)throw new Error('Content catalog mismatch');
  for(const [key,opt]of expected){const actual=indexes.find(i=>JSON.stringify(i.key)===JSON.stringify(key));
   if(!actual||Boolean(actual.unique)!==Boolean(opt.unique)||actual.expireAfterSeconds!==undefined||actual.sparse||actual.hidden||actual.collation||JSON.stringify(actual.partialFilterExpression)!==JSON.stringify(opt.partialFilterExpression))throw new Error('Content catalog mismatch');
  }
 }
 for await(const row of models.POI.collection.find({},{projection:{mutationVersion:1}})){if(!Number.isSafeInteger(row.mutationVersion)||row.mutationVersion<0)throw new Error('Content data requires reviewed migration');}
}
export async function connectContentRuntime(config){
 const connection=mongoose.createConnection(config.uri,{autoCreate:false,autoIndex:false,bufferCommands:false,serverSelectionTimeoutMS:3000});
 try{
  await connection.asPromise();const models={...createContentModels(connection),...createDurabilityModels(connection)};const hasMedia=await connection.db.listCollections({name:'media_uploads'}).hasNext();if(config.media||hasMedia)models.MediaUpload=createMediaModel(connection);await verifyContentCatalog(connection,models);
  const sender=createOutboxSender(models.AuditOutbox,config.authorization);
  const runtime={connection,models,authorization:config.authorization,origins:config.origins,now:Date.now,start:()=>sender.start(),async close(){await sender.stop();await connection.close();}};
  if(config.media){runtime.media=createMediaService(runtime,createCloudinaryAdapter(config.media),{mode:config.mode});runtime.verifyThumbnail=runtime.media.verifyThumbnail;runtime.attachThumbnail=runtime.media.attachThumbnail;}
  return runtime;
 }catch{await connection.close().catch(()=>{});throw new Error('Content dependencies unavailable');}
}
