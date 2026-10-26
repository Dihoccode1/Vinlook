import {ApiError,createTransport} from './http.js';
import {isLocale} from '../i18n/locales.js';
const uuid=value=>{if(typeof value!=='string'||value.length!==36||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value))throw new ApiError('INVALID_INPUT');return value;};
// Public telemetry only: no JWT, cookies, query fields, GPS or automatic retries.
export function createUsageAdapter(origin,options){
  const request=createTransport(origin,options);
  const post=(path,body)=>request(`/api/v1/${path}`,{method:'POST',body});
  return {
    presence:browserId=>post('presence/heartbeat',{browserId:uuid(browserId)}),
    start:(browserId,playbackId,poiId,languageCode)=>{
      if(typeof poiId!=='string'||poiId.length!==24||!/^[a-f0-9]{24}$/.test(poiId)||!isLocale(languageCode))throw new ApiError('INVALID_INPUT');
      return post('listening/start',{browserId:uuid(browserId),playbackId:uuid(playbackId),poiId,languageCode});
    },
    heartbeat:(browserId,playbackId)=>post(`listening/${uuid(playbackId)}/heartbeat`,{browserId:uuid(browserId)}),
    end:(browserId,playbackId,reason)=>{
      if(!['completed','page_closed','closed','replaced'].includes(reason))throw new ApiError('INVALID_INPUT');
      return post(`listening/${uuid(playbackId)}/end`,{browserId:uuid(browserId),reason});
    },
  };
}
