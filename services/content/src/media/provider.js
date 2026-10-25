import {createHash} from 'node:crypto';
import {MediaFailure,limits} from './validation.js';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function signUpload(params,secret){return createHash('sha256').update(Object.keys(params).sort().map(k=>`${k}=${params[k]}`).join('&')+secret).digest('hex');}
export function originalUrl(config,row,version=row.providerVersion){
 if(!Number.isSafeInteger(version)||version<1||!/^vinlook\/(development|test|production)\/[a-f0-9]{24}\/[a-f0-9]{24}\/(thumbnail|audio)\/[a-f0-9-]{36}$/.test(row.publicId)||!['image','video'].includes(row.resourceType)||!['webp','mp3'].includes(row.format))throw new MediaFailure();
 return`https://res.cloudinary.com/${config.cloud}/${row.resourceType}/upload/v${version}/${row.publicId}.${row.format}`;
}
async function bytes(response,maximum){
 if(!response.body)throw new MediaFailure();const reader=response.body.getReader(),parts=[];let length=0;
 try{for(;;){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>maximum)throw new MediaFailure();parts.push(r.value);}return Buffer.concat(parts,length);}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export function createCloudinaryAdapter(config,{fetchImpl=fetch}={}){
 const root=`https://api.cloudinary.com/v1_1/${config.cloud}`;
 const json=async(url,options,signal,timeout)=>{
  const r=await fetchImpl(url,{...options,redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(timeout)]):AbortSignal.timeout(timeout)});
  const buffer=await bytes(r,65536);
  if(!r.ok){const error=new MediaFailure();error.providerStatus=r.status;throw error;}
  if(!/^application\/json(?:;|$)/i.test(r.headers.get('content-type')??''))throw new MediaFailure();
  try{return JSON.parse(buffer.toString('utf8'));}catch{throw new MediaFailure();}
 };
 return{
  async upload(row,buffer,signal){
   const timestamp=Math.floor(Date.now()/1000),params={public_id:row.publicId,overwrite:'false',type:'upload',timestamp};
   const form=new FormData();for(const[k,v]of Object.entries(params))form.append(k,String(v));form.append('api_key',config.key);form.append('signature',signUpload(params,config.secret));form.append('file',new Blob([buffer]),`asset.${row.format}`);
   let result;try{result=await json(`${root}/${row.resourceType}/upload`,{method:'POST',body:form},signal,30000);}catch(error){if([400,401,403,404,413,415,422].includes(error.providerStatus))error.definitiveUpload=true;throw error;}
   if(result.public_id!==row.publicId||!Number.isSafeInteger(result.version)||result.version<1)throw new MediaFailure();
   return result.version;
  },
  async verify(row,signal){
   if(!row.sha256||!row.bytes||!row.startedAt)throw new MediaFailure();
   const url=`${root}/resources/${row.resourceType}/upload/${encodeURIComponent(row.publicId)}${row.kind==='audio'?'?media_metadata=true':''}`;
   const metadata=await json(url,{headers:{Authorization:'Basic '+Buffer.from(config.key+':'+config.secret).toString('base64')}},signal,10000);
   const created=Date.parse(metadata.created_at),start=+new Date(row.startedAt);
   if(metadata.public_id!==row.publicId||metadata.resource_type!==row.resourceType||metadata.type!=='upload'||metadata.format!==row.format||!Number.isSafeInteger(metadata.version)||metadata.version<1||typeof metadata.asset_id!=='string'||!metadata.asset_id.length||metadata.asset_id.length>200||metadata.bytes!==row.bytes||!Number.isFinite(created)||created<start-5000||created>start+90000||row.providerVersion!==null&&row.providerVersion!==undefined&&metadata.version!==row.providerVersion)throw new MediaFailure();
   if(row.kind==='thumbnail'&&(metadata.width!==row.width||metadata.height!==row.height))throw new MediaFailure();
   if(row.kind==='audio'&&(!Number.isFinite(metadata.duration)||Math.abs(metadata.duration-row.durationSeconds)>.1||metadata.audio?.channels!==undefined&&metadata.audio.channels!==1))throw new MediaFailure();
   const expected=originalUrl(config,row,metadata.version);
   const response=await fetchImpl(expected,{redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});
   if(response.status!==200)throw new MediaFailure();const original=await bytes(response,limits[row.kind]);
   if(original.length!==row.bytes||digest(original)!==row.sha256)throw new MediaFailure();
   return{providerVersion:metadata.version,providerAssetId:metadata.asset_id,url:expected};
  },
 };
}
