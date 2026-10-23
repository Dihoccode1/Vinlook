import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {MediaFailure,limits} from './validation.js';
export function probeMedia(kind,bytes,{signal,timeoutMs=5000}={}){
 if(!['thumbnail','audio'].includes(kind)||!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>limits[kind])return Promise.reject(new MediaFailure('INVALID_MEDIA',422));
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(new MediaFailure());return;}
  const environment=Object.fromEntries(['SystemRoot','WINDIR','PATH','TEMP','TMP'].filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));
  const child=fork(fileURLToPath(new URL('./probe-worker.js',import.meta.url)),[],{execArgv:[],serialization:'advanced',stdio:['ignore','ignore','ignore','ipc'],windowsHide:true,env:environment});
  let settled=false;const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);child.kill();error?reject(error):resolve(result);};
  const abort=()=>finish(new MediaFailure());const timer=setTimeout(abort,timeoutMs);signal?.addEventListener('abort',abort,{once:true});
  child.once('error',()=>finish(new MediaFailure()));child.once('exit',()=>finish(new MediaFailure()));
  child.once('message',value=>{if(value.isolated!==true)return finish(new MediaFailure());if(!value.ok)return finish(new MediaFailure('INVALID_MEDIA',422));finish(null,{bytes:Buffer.from(value.bytes),metadata:value.metadata,peakRss:value.peakRss});});
  child.send({kind,bytes},error=>{if(error)finish(new MediaFailure());});
 });
}
