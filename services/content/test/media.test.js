import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Readable} from 'node:stream';
import sharp from 'sharp';
import {mkdtempSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import mongoose from 'mongoose';
import {createMediaModel} from '../src/media/model.js';
import {loadMediaConfig} from '../src/media/validation.js';
import {probeMedia} from '../src/media/probe.js';
import {readMultipart} from '../src/media/multipart.js';
import {createCloudinaryAdapter,signUpload,digest,originalUrl} from '../src/media/provider.js';
import {intent,png,mp3,multipart} from './media-fixtures.js';
const config={cloud:'fixture_cloud',key:'synthetic-key',secret:'synthetic-secret'};
test('private media config rejects partial/control/host injection without echoing values',()=>{
 assert.equal(loadMediaConfig({}),null);assert.equal(loadMediaConfig({CLOUDINARY_CLOUD_NAME:config.cloud,CLOUDINARY_API_KEY:config.key,CLOUDINARY_API_SECRET:config.secret}).cloud,config.cloud);
 for(const env of [{CLOUDINARY_API_KEY:'synthetic-private-value'},{CLOUDINARY_CLOUD_NAME:'https://evil.invalid',CLOUDINARY_API_KEY:'x',CLOUDINARY_API_SECRET:'x'}])assert.throws(()=>loadMediaConfig(env),e=>!e.message.includes('synthetic-private-value'));
});
test('strict durable intent schema validates namespace/state/versions with no TTL or implicit connection',async()=>{
 const connection=mongoose.createConnection();try{const Model=createMediaModel(connection),value=intent();await new Model(value).validate();assert.equal(connection.readyState,0);assert.equal(Model.schema.options.strict,'throw');assert.equal(Model.schema.indexes().length,3);assert.ok(Model.schema.indexes().every(([,o])=>o.expireAfterSeconds===undefined));
 for(const patch of [{publicId:'arbitrary'},{expectedEditVersion:'0'},{status:'verified'},{resourceType:'video'},{expiresAt:value.createdAt},{sha256:'a'.repeat(64)},{kind:'audio'},{apiSecret:'forbidden'}])await assert.rejects(async()=>new Model({...value,...patch}).validate());
 }finally{await connection.close();}
});
test('real isolated image decoder emits bounded canonical WebP and rejects invalid/oversized geometry',async t=>{
 const output=await probeMedia('thumbnail',await png());assert.equal(output.metadata.format,'webp');assert.equal(output.metadata.width,16);assert.equal(output.metadata.height,12);assert.equal(output.metadata.sha256,digest(output.bytes));t.diagnostic(`image probe child RSS observed ${output.peakRss} bytes`);
 for(const bytes of [Buffer.from('<svg/>'),Buffer.from('not an image'),(await png()).subarray(0,15)])await assert.rejects(probeMedia('thumbnail',bytes));
 const wide=await sharp({create:{width:1601,height:1,channels:3,background:'red'}}).png().toBuffer();await assert.rejects(probeMedia('thumbnail',wide));
 await assert.rejects(probeMedia('thumbnail',Buffer.alloc(2097153)),{code:'INVALID_MEDIA'});
});
test('bounded MP3 full-frame scan/parser accepts structural mono and rejects stereo/truncation/duration',async t=>{
 const output=await probeMedia('audio',mp3());assert.equal(output.metadata.format,'mp3');assert.ok(output.metadata.durationSeconds>=120&&output.metadata.durationSeconds<121);assert.equal(output.metadata.sha256,digest(output.bytes));t.diagnostic(`audio probe child RSS observed ${output.peakRss} bytes`);
 for(const seconds of [90,150])assert.equal((await probeMedia('audio',mp3(seconds,false,48000))).metadata.durationSeconds,seconds);
 for(const bytes of [mp3(120,true),mp3(30),mp3(151),mp3().subarray(0,mp3().length-2),Buffer.from('not audio')])await assert.rejects(probeMedia('audio',bytes));
});
test('multipart enforces one named file, inclusive byte limits and rejects malformed/extra parts',async()=>{
 const read=({headers,bytes})=>{const req=Readable.from([bytes]);req.headers=headers;return readMultipart(req,'thumbnail');};
 const file=Buffer.alloc(2097152);assert.equal((await read(multipart(file))).length,file.length);
 await assert.rejects(read(multipart(Buffer.alloc(2097153))),{status:413});await assert.rejects(read(multipart(Buffer.from('ok'),{extra:true})),{status:400});await assert.rejects(read(multipart(Buffer.from('ok'),{name:'wrong'})),{status:400});
 await assert.rejects(read({headers:{'content-type':'text/plain'},bytes:Buffer.from('x')}),{status:415});
});
test('audio verification requests detailed metadata; missing duration and changed bytes still fail closed',async()=>{
 const buffer=Buffer.from('original-audio-fixture'),value={...intent(),kind:'audio',resourceType:'video',publicId:intent().publicId.replace('/thumbnail/','/audio/'),format:'mp3',bytes:buffer.length,sha256:digest(buffer),durationSeconds:100.992,startedAt:new Date('2026-10-23T12:00:00.000Z'),providerVersion:null};
 let mode='normal',metadataRequests=0,cdnRequests=0;
 const adapter=createCloudinaryAdapter(config,{fetchImpl:async(url)=>{
  if(url.includes('/resources/')){
   metadataRequests++;const detailed=new URL(url).searchParams.get('media_metadata')==='true';
   assert.equal(detailed,true);
   return Response.json({public_id:value.publicId,resource_type:'video',type:'upload',format:'mp3',version:7,asset_id:'audio-fixture',bytes:buffer.length,created_at:value.startedAt.toISOString(),...(detailed&&mode!=='missing'?{duration:mode==='wrong'?101.992:100.992,audio:{channels:1}}:{})});
  }
  cdnRequests++;return new Response(mode==='corrupt'?Buffer.from('changed'):buffer);
 }});
 assert.equal((await adapter.verify(value)).providerVersion,7);assert.equal(metadataRequests,1);assert.equal(cdnRequests,1);
 for(mode of ['missing','wrong','corrupt'])await assert.rejects(adapter.verify(value));
});

test('provider signs only fixed server params and verifies independent metadata/original digest',async()=>{
 const buffer=Buffer.from('canonical-fixture-bytes'),value={...intent(),format:'webp',bytes:buffer.length,sha256:digest(buffer),width:16,height:12,startedAt:new Date('2026-10-23T12:00:00.000Z'),providerVersion:null};let calls=0;
 const fake=async(url,options)=>{calls++;assert.equal(options.redirect,'error');if(url.endsWith('/image/upload')){assert.equal(options.body.get('public_id'),value.publicId);assert.equal(options.body.get('overwrite'),'false');const params={public_id:value.publicId,overwrite:'false',type:'upload',timestamp:options.body.get('timestamp')};assert.equal(options.body.get('signature'),signUpload(params,config.secret));return Response.json({public_id:value.publicId,version:7});}
 if(url.includes('/resources/'))return Response.json({public_id:value.publicId,resource_type:'image',type:'upload',format:'webp',version:7,asset_id:'fixture-asset',bytes:value.bytes,width:16,height:12,created_at:value.startedAt.toISOString(),secure_url:'http://evil.invalid/ignored'});
 assert.equal(url,originalUrl(config,value,7));return new Response(buffer);
 };
 const adapter=createCloudinaryAdapter(config,{fetchImpl:fake});assert.equal(await adapter.upload(value,buffer),7);const ref=await adapter.verify(value);assert.equal(ref.url,originalUrl(config,value,7));assert.equal(calls,3);
 const altered={...value,sha256:'a'.repeat(64)};await assert.rejects(adapter.verify(altered));assert.throws(()=>originalUrl(config,{...value,publicId:'http://evil.invalid'},7));
});
test('probe deadline kills child instead of merely racing a still-running native decode',async()=>{const started=Date.now();await assert.rejects(probeMedia('thumbnail',await png(),{timeoutMs:1}));assert.ok(Date.now()-started<3000);});

test('probe does not inherit private environment or parent --env-file flags',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'vinlook-task019-env-')),file=join(directory,'probe.env');writeFileSync(file,'CLOUDINARY_API_SECRET=synthetic-private-fixture\n');
 const args=[...process.execArgv],previous=process.env.CLOUDINARY_API_SECRET;process.execArgv.push('--env-file='+file);process.env.CLOUDINARY_API_SECRET='synthetic-private-parent';
 try{const result=await probeMedia('thumbnail',await png());assert.equal(result.metadata.width,16);}finally{process.execArgv.splice(0,process.execArgv.length,...args);if(previous===undefined)delete process.env.CLOUDINARY_API_SECRET;else process.env.CLOUDINARY_API_SECRET=previous;unlinkSync(file);rmdirSync(directory);}
});
