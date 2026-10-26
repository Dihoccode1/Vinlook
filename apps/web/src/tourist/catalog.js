import {ApiError} from '../adapters/http.js';
// Keep state ownership in React; pagination may never mix snapshots/locales or duplicates.
export function appendPage(previous,next){
 if(previous.snapshotId!==next.snapshotId)throw new ApiError('CATALOG_CHANGED');
 const ids=new Set(previous.items.map(x=>x.id));
 if(next.items.some(x=>ids.has(x.id)))throw new ApiError('INVALID_RESPONSE');
 return {...next,items:[...previous.items,...next.items]};
}
export function publicMapStyle(value,{development=false}={}){
 if(!value)return null;
 try{const u=new URL(value);if(u.username||u.password||u.hash)throw Error();
  if(u.protocol!=='https:'&&!(development&&u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))throw Error();
  return u.href;
 }catch{throw new ApiError('INVALID_MAP_STYLE');}
}
export const formatTime=value=>{const seconds=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
