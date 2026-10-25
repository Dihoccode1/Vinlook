import {loadAdapterConfig,processingManifest,publicationRegistry} from '../adapters/config.js';
import {createAdapterModels} from '../adapters/models.js';
import {createAdapterRunner} from '../adapters/runner.js';
import {createGeminiProvider} from '../adapters/provider.js';
import {createTranscoder,verifyBinaries} from '../adapters/transcode.js';
import mongoose from 'mongoose';
import {createJobModel} from '../jobs/model.js';
import {workerConfig} from '../jobs/credentials.js';
import {publicKey} from '../public/validation.js';
import {createMediaModel} from '../media/model.js';
import {loadMediaConfig} from '../media/validation.js';
import {createCloudinaryAdapter} from '../media/provider.js';
import {createMediaService} from '../media/service.js';
import {loadAuthorizationConfig} from '../authorization.js';
import {createContentModels} from '../models/index.js';
import {createDurabilityModels} from '../durability/models.js';
import {createOutboxSender} from '../durability/sender.js';
export function loadContentConfig(mode,environment=process.env){
 const adapters=loadAdapterConfig(environment);
 if(!environment.CONTENT_MONGODB_URI){if(adapters)throw new Error('Invalid Content runtime configuration');return null;}
 const invalid=()=>{throw new Error('Invalid Content runtime configuration');};
 const uri=environment.CONTENT_MONGODB_URI;
 let url;try{url=new URL(uri);}catch{invalid();}
 if(!['mongodb:','mongodb+srv:'].includes(url.protocol)||!(url.pathname==='/vinlook_content'||mode==='test'&&/^\/vinlook_content_task0(?:12|14|16|19)$/.test(url.pathname)))invalid();
 const authorization=loadAuthorizationConfig(mode,environment);
 const origins=(environment.CONTENT_ALLOWED_ORIGINS??(mode==='development'?'http://localhost:5173,http://127.0.0.1:5173':'')).split(',').map(v=>v.trim());
 for(const value of origins){try{const origin=new URL(value);if(origin.origin!==value||!(origin.protocol==='https:'||mode!=='production'&&origin.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname)))invalid();}catch{invalid();}}
 return Object.freeze({uri,authorization,mode,adapters,worker:workerConfig(environment),publicCursorKey:publicKey(environment.CONTENT_PUBLIC_CURSOR_KEY_B64URL,environment.CONTENT_IDENTITY_SERVICE_KEY_B64URL),media:loadMediaConfig(environment),origins:Object.freeze([...new Set(origins)])});
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
  await connection.asPromise();const models={...createContentModels(connection),...createDurabilityModels(connection)};const hasMedia=await connection.db.listCollections({name:'media_uploads'}).hasNext();if(config.media||hasMedia)models.MediaUpload=createMediaModel(connection);const hasJobs=await connection.db.listCollections({name:'processing_jobs'}).hasNext();if(config.worker||hasJobs)models.ProcessingJob=createJobModel(connection);const hasAdapters=await connection.db.listCollections({name:'provider_calls'}).hasNext();const hasControls=await connection.db.listCollections({name:'provider_controls'}).hasNext();if(config.adapters||hasAdapters||hasControls)Object.assign(models,createAdapterModels(connection));if(config.adapters&&(!models.ProcessingJob||!config.media))throw new Error('Adapter dependencies missing');await verifyContentCatalog(connection,models);
  const sender=createOutboxSender(models.AuditOutbox,config.authorization);
  const runtime={connection,models,worker:config.worker,publicCursorKey:config.publicCursorKey,authorization:config.authorization,origins:config.origins,now:Date.now,start:()=>sender.start(),async close(){await runtime.adapters?.close();await sender.stop();await connection.close();}};
  if(config.worker){runtime.processingManifest=processingManifest;runtime.publicationRegistry=publicationRegistry;}
  if(config.media){runtime.media=createMediaService(runtime,createCloudinaryAdapter(config.media),{mode:config.mode});runtime.verifyThumbnail=runtime.media.verifyThumbnail;runtime.attachThumbnail=runtime.media.attachThumbnail;}
  if(config.adapters){await verifyBinaries(config.adapters);runtime.processingManifest=processingManifest;runtime.publicationRegistry=publicationRegistry;runtime.adapters=createAdapterRunner(runtime,config.adapters,{provider:createGeminiProvider(config.adapters),transcode:createTranscoder(config.adapters)});}
  return runtime;
 }catch{await connection.close().catch(()=>{});throw new Error('Content dependencies unavailable');}
}
