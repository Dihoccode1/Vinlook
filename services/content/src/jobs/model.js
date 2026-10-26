import mongoose from 'mongoose';
import {languageCodes} from '../models/index.js';
import {inputVersion,snapshot} from './validation.js';
import {uuid,requestHash} from '../durability/validation.js';
const {Schema}=mongoose,nested={_id:false,strict:'throw',versionKey:false};
const number=(min=0,max=Number.MAX_SAFE_INTEGER)=>({type:Number,cast:false,required:true,min,max,validate:Number.isSafeInteger});
const nullableNumber=()=>({...number(1),required:false,default:null,validate:v=>v===null||Number.isSafeInteger(v)});
const date=()=>({type:Date,default:null,validate:v=>v===null||Number.isFinite(+v)});
export function createJobModel(connection){
 if(connection.models.ProcessingJob)return connection.models.ProcessingJob;
 const schema=new Schema({poiId:{type:Schema.Types.ObjectId,required:true,immutable:true},revisionId:{type:Schema.Types.ObjectId,required:true,immutable:true},requestedBy:{type:Schema.Types.ObjectId,required:true},workSessionId:{type:Schema.Types.ObjectId,required:true},languageCode:{type:String,enum:languageCodes,required:true,immutable:true},taskType:{type:String,enum:['translation','audio'],required:true,immutable:true},status:{type:String,enum:['queued','running','succeeded','failed','waiting_quota'],required:true},
  inputVersion:{type:new Schema({sourceVersion:number(1),textVersion:nullableNumber(),targetTextVersion:nullableNumber(),targetSourceVersion:nullableNumber()},nested),required:true,immutable:true},inputSnapshot:{type:new Schema({text:{type:String,required:true,maxlength:20000},registryVersion:{type:String,required:true},modelId:{type:String,required:true},execution:{type:String,required:true,enum:['local_worker','server_adapter']}},nested),required:true,immutable:true},inputHash:{type:String,required:true,match:/^[a-f0-9]{64}$/,immutable:true},
  attemptId:{type:String,default:null,validate:v=>v===null||uuid.safeParse(v).success},leaseOwner:{type:String,default:null,match:/^[A-Za-z0-9._-]{1,64}$/},leaseExpiresAt:date(),uploadResumedAt:date(),uploadResumeCount:{...number(0,2),default:0},reclaimCount:number(0,3),retryCount:number(),lastResultHash:{type:String,default:null,match:/^[a-f0-9]{64}$/},acceptedAt:date(),resultRef:{type:new Schema({localizedContentId:{type:Schema.Types.ObjectId,required:true},textVersion:number(1),mediaIntentId:{type:Schema.Types.ObjectId,default:null}},nested),default:null},error:{type:String,default:null,enum:[null,'STALE_INPUT','LEASE_RECLAIM_EXHAUSTED','PROVIDER_FAILED','QUOTA_EXHAUSTED','INVALID_OUTPUT','PROVIDER_OUTCOME_UNKNOWN']},
  workerObservedAt:date(),
 },{collection:'processing_jobs',strict:'throw',autoCreate:false,autoIndex:false,bufferCommands:false,versionKey:false,timestamps:true});
 schema.pre('validate',function(){
  const bad=p=>this.invalidate(p,'Invalid job state');
  if(!inputVersion.safeParse(this.inputVersion?.toObject()).success)bad('inputVersion');if(!snapshot.safeParse(this.inputSnapshot?.toObject()).success)bad('inputSnapshot');
  const v=this.inputVersion;
  if(v&&(this.taskType==='audio'?(v.textVersion===null||v.targetTextVersion!==null||v.targetSourceVersion!==null):(v.textVersion!==null||(v.targetTextVersion===null)!==(v.targetSourceVersion===null)||this.languageCode==='en')))bad('inputVersion');
  if((this.attemptId===null)!==(this.leaseOwner===null)||(this.attemptId===null)!==(this.leaseExpiresAt===null))bad('attemptId');
  if(this.status==='running'&&!this.attemptId)bad('attemptId');
  if(this.status==='queued'&&(this.attemptId||this.lastResultHash||this.acceptedAt||this.resultRef||this.error))bad('status');
  if(this.status==='succeeded'&&(!this.attemptId||!this.lastResultHash||!this.acceptedAt||!this.resultRef||this.error))bad('status');
  if(['failed','waiting_quota'].includes(this.status)&&!this.error)bad('error');
  if(this.status==='running'&&(this.error||this.lastResultHash||this.acceptedAt||this.resultRef))bad('status');
  if((this.lastResultHash===null)!==(this.acceptedAt===null))bad('acceptedAt');
  if(this.resultRef&&(this.status!=='succeeded'||(this.taskType==='audio')!==(this.resultRef.mediaIntentId!==null)))bad('resultRef');
  try{if(this.inputHash!==requestHash({taskType:this.taskType,languageCode:this.languageCode,inputVersion:this.inputVersion.toObject(),inputSnapshot:this.inputSnapshot.toObject()}))bad('inputHash');}catch{bad('inputHash');}
 });
 schema.index({status:1,createdAt:1,_id:1});schema.index({status:1,leaseExpiresAt:1});schema.index({revisionId:1,createdAt:1});schema.index({revisionId:1,languageCode:1,taskType:1},{unique:true,partialFilterExpression:{status:{$in:['queued','running']}}});
 return connection.model('ProcessingJob',schema);
}
