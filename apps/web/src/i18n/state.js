import {isLocale,direction} from './locales.js';
export const resourceVersion='ui-v1';
export function createLocaleStore({online=true}={}){
 const listeners=new Set(),changes=new Set();
 let snapshot=Object.freeze({locale:'en',direction:'ltr',resourceVersion,mode:online?'online':'offline',reconnectNotice:false,announcement:online?'':'offline'});
 const publish=(next,reason)=>{
  const previous=snapshot;snapshot=Object.freeze(next);
  if(previous.locale!==next.locale){const event=Object.freeze({previousLocale:previous.locale,locale:next.locale,reason});for(const listener of changes)listener(event);}
  for(const listener of listeners)listener();
 };
 return Object.freeze({
  getSnapshot:()=>snapshot,
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  subscribeLocaleChange(listener){changes.add(listener);return()=>changes.delete(listener);},
  setLocale(code){
   if(!isLocale(code))throw new Error('INVALID_LOCALE');
   if(snapshot.mode==='offline'&&code!=='en')throw new Error('OFFLINE_ENGLISH_ONLY');
   if(snapshot.locale===code&&!snapshot.reconnectNotice)return;
   publish({...snapshot,locale:code,direction:direction(code),reconnectNotice:false,announcement:'changed'},'manual');
  },
  setConnectivity(mode){
   if(!['online','offline'].includes(mode))throw new Error('INVALID_CONNECTIVITY');
   if(snapshot.mode===mode)return;
   publish({...snapshot,mode,locale:'en',direction:'ltr',reconnectNotice:mode==='online',announcement:mode==='offline'?'offline':'reconnected'},mode==='offline'?'offline':'reconnected');
  },
  dismissReconnect(){if(snapshot.reconnectNotice)publish({...snapshot,reconnectNotice:false,announcement:''},'dismissed');},
 });
}
