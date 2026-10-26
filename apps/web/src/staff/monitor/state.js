const count=value=>Number.isSafeInteger(value)&&value>=0;
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function monitorSummary(value){
  if(!timestamp(value?.asOf)||!timestamp(value?.refreshedAt)||!count(value.onlineVisitors)||!count(value.currentListeners)||!Array.isArray(value.byPoi)||value.byPoi.length>1000)throw Error('INVALID_SUMMARY');
  const ids=new Set();for(const row of value.byPoi){if(!/^[a-f0-9]{24}$/.test(row.poiId)||!count(row.currentListeners)||ids.has(row.poiId))throw Error('INVALID_SUMMARY');ids.add(row.poiId);}
  return {asOf:value.asOf,refreshedAt:value.refreshedAt,onlineVisitors:value.onlineVisitors,currentListeners:value.currentListeners,byPoi:value.byPoi.map(row=>({poiId:row.poiId,currentListeners:row.currentListeners}))};
}
// Semantic bridge only. Caller owns approved HTTP mapping and memory-only JWT.
export function createMonitor({api,now=Date.now,schedule=setInterval,cancel=clearInterval,visible=()=>true}){
  let state={authorized:false,summary:null,health:null,jobs:null,status:'unknown',error:null,lastSuccessAt:null},timer=null,epoch=0,busy=false;
  const listeners=new Set(),emit=patch=>{state={...state,...patch};for(const fn of listeners)fn();};
  const refresh=async()=>{
    if(!visible()||busy)return;busy=true;const generation=epoch;
    try{
      const principal=await api.authorize();
      if(generation!==epoch)return;
      if(principal?.account?.status!=='active'||!['Staff','Manager'].includes(principal.account.role))throw Object.assign(Error(),{status:403});
      emit({authorized:true});
      const results=await Promise.allSettled([api.summary(),api.health(),api.jobs()]);
      if(generation!==epoch)return;
      if(results.some(r=>r.status==='rejected'&&[401,403].includes(r.reason?.status)))throw Object.assign(Error(),{status:401});
      const [summary,health,jobs]=results;
      if(summary.status==='fulfilled'){
        const safe=monitorSummary(summary.value),fresh=now()-Date.parse(safe.refreshedAt)<=30000;
        emit({summary:safe,status:fresh?'fresh':'stale',lastSuccessAt:new Date(now()).toISOString(),error:fresh?null:'SAMPLE_STALE'});
      }else emit({status:state.summary?'stale':'unavailable',error:'SUMMARY_UNAVAILABLE'});
      emit({health:health.status==='fulfilled'?health.value:{status:'unavailable'},jobs:jobs.status==='fulfilled'?jobs.value:{status:'unavailable',counts:null}});
    }catch(error){if(generation!==epoch)return;if([401,403].includes(error.status))emit({authorized:false,summary:null,health:null,jobs:null,status:'unauthorized',error:'AUTHENTICATION_REQUIRED',lastSuccessAt:null});
      else emit({status:state.summary?'stale':'unavailable',error:'DEPENDENCY_UNAVAILABLE'});
    }finally{busy=false;}
  };
  return {subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},getSnapshot:()=>state,refresh,
    start(){if(timer===null){void refresh();timer=schedule(()=>void refresh(),30000);}},
    visibilityChanged(){if(visible()){if(timer===null){void refresh();timer=schedule(()=>void refresh(),30000);}}else{epoch++;if(timer!==null)cancel(timer);timer=null;}},
    stop(){epoch++;if(timer!==null)cancel(timer);timer=null;},
  };
}
