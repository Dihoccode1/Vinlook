import mongoose from 'mongoose';
import {languageCodes} from '../models/index.js';
import {uuid} from '../durability/validation.js';
const {Schema}=mongoose;
const finite=v=>v===null||Number.isFinite(v.getTime());
const count=(min=0)=>({type:Number,cast:false,min,max:Number.MAX_SAFE_INTEGER,validate:v=>v===null||Number.isSafeInteger(v)});
const oid=()=>({type:Schema.Types.ObjectId,required:true,immutable:true});
export function createMediaModel(connection){
 if(connection.models.MediaUpload)return connection.models.MediaUpload;
 const schema=new Schema({uploadId:{type:String,required:true,immutable:true,validate:v=>uuid.safeParse(v).success},kind:{type:String,enum:['thumbnail','audio'],required:true,immutable:true},
 poiId:oid(),revisionId:oid(),jobId:{type:Schema.Types.ObjectId,default:null,immutable:true},attemptId:{type:String,default:null,immutable:true,validate:v=>v===null||uuid.safeParse(v).success},actorId:oid(),workSessionId:oid(),expectedEditVersion:{...count(),required:true,immutable:true},
 sourceVersion:{...count(1),default:null},textVersion:{...count(1),default:null},languageCode:{type:String,enum:[...languageCodes,null],default:null},registryVersion:{type:String,match:/^[A-Za-z0-9._-]{1,100}$/,default:null},voiceOrModelId:{type:String,maxlength:200,default:null,validate:v=>v===null||v.trim()===v&&v.length>0&&!/[\x00-\x1f\x7f]/.test(v)},
 publicId:{type:String,required:true,immutable:true,maxlength:512},resourceType:{type:String,required:true,enum:['image','video'],immutable:true},format:{type:String,enum:['webp','mp3',null],default:null},
 status:{type:String,required:true,enum:['issued','uploading','verified','rejected','uncertain']},createdAt:{type:Date,required:true,immutable:true,validate:finite},expiresAt:{type:Date,required:true,immutable:true,validate:finite},
 startedAt:{type:Date,default:null,validate:finite},finishedAt:{type:Date,default:null,validate:finite},attachedAt:{type:Date,default:null,validate:finite},safeErrorCode:{type:String,enum:['INVALID_MEDIA','UPLOAD_FAILED','UPLOAD_UNCERTAIN','STALE_INPUT','DEPENDENCY_UNAVAILABLE',null],default:null},
 sha256:{type:String,match:/^[a-f0-9]{64}$/,default:null},bytes:{...count(1),default:null},width:{...count(1),default:null},height:{...count(1),default:null},
 durationSeconds:{type:Number,cast:false,default:null,validate:v=>v===null||Number.isFinite(v)&&v>0},bitrate:{type:Number,cast:false,default:null,validate:v=>v===null||Number.isFinite(v)&&v>0},
 providerVersion:{...count(1),default:null},providerAssetId:{type:String,maxlength:200,default:null},url:{type:String,maxlength:1500,default:null,validate:v=>{if(v===null)return true;try{const u=new URL(v);return u.href===v&&u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}}},
 },{collection:'media_uploads',strict:'throw',autoCreate:false,autoIndex:false,bufferCommands:false,versionKey:false});
 schema.pre('validate',function(){
 const fail=path=>this.invalidate(path,'Invalid media state');const audio=this.kind==='audio';
 const path=`/${this.poiId}/${this.revisionId}/${this.kind}/${this.uploadId}`;
 if(!/^vinlook\/(development|test|production)\//.test(this.publicId??'')||!this.publicId?.endsWith(path)||this.publicId!==`vinlook/${this.publicId?.split('/')[1]}${path}`)fail('publicId');
 if(this.resourceType!==(audio?'video':'image'))fail('resourceType');
 if(audio?this.attemptId===null:this.attemptId!==null)fail('attemptId');
 for(const k of ['jobId','sourceVersion','textVersion','languageCode','registryVersion','voiceOrModelId'])if(audio?this[k]===null:this[k]!==null)fail(k);
 if(+this.expiresAt!==+this.createdAt+900000)fail('expiresAt');
 if(this.status!=='issued'&&!this.startedAt)fail('startedAt');
 if(this.status==='issued'&&this.startedAt!==null)fail('startedAt');
 if(this.status==='issued'&&['sha256','format','bytes','providerVersion','providerAssetId','url','finishedAt','attachedAt','safeErrorCode'].some(k=>this[k]!==null))fail('status');
 if(['rejected','uncertain'].includes(this.status)&&!this.finishedAt)fail('finishedAt');
 if(this.startedAt&&(+this.startedAt<+this.createdAt||+this.startedAt>=+this.expiresAt))fail('startedAt');
 if(this.sha256!==null){if(!this.bytes||this.bytes>(audio?3145728:2097152)||this.format!==(audio?'mp3':'webp'))fail('bytes');
 if(audio){if(this.width!==null||this.height!==null||!(this.durationSeconds>=90&&this.durationSeconds<=150)||!this.bitrate)fail('durationSeconds');}
 else if(!this.width||!this.height||this.width>1600||this.height>1600||this.durationSeconds!==null||this.bitrate!==null)fail('width');}
 else if(['format','bytes','width','height','durationSeconds','bitrate'].some(k=>this[k]!==null))fail('sha256');
 if(this.status==='verified'&&(!this.sha256||!this.providerVersion||!this.providerAssetId||!this.url||!this.finishedAt||this.safeErrorCode!==null))fail('status');
 if(['rejected','uncertain'].includes(this.status)&&!this.safeErrorCode)fail('safeErrorCode');
 if(this.attachedAt&&this.status!=='verified')fail('attachedAt');
 });
 schema.index({uploadId:1},{unique:true});schema.index({publicId:1},{unique:true});schema.index({status:1,createdAt:1});
 return connection.model('MediaUpload',schema);
}
