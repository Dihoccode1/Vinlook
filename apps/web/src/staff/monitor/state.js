const count=value=>Number.isSafeInteger(value)&&value>=0;
const timestamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function monitorSummary(value){
  if(!timestamp(value?.asOf)||!timestamp(value?.refreshedAt)||!count(value.onlineVisitors)||!count(value.currentListeners)||!Array.isArray(value.byPoi)||value.byPoi.length>1000)throw Error('INVALID_SUMMARY');
  const ids=new Set();for(const row of value.byPoi){if(!row||!/^[a-f0-9]{24}$/.test(row.poiId)||!count(row.currentListeners)||ids.has(row.poiId))throw Error('INVALID_SUMMARY');ids.add(row.poiId);}
  return {asOf:value.asOf,refreshedAt:value.refreshedAt,onlineVisitors:value.onlineVisitors,currentListeners:value.currentListeners,byPoi:value.byPoi.map(row=>({poiId:row.poiId,currentListeners:row.currentListeners}))};
}
export function monitorHealth(value){
  if(!Array.isArray(value?.components)||value.components.length>30)return {status:'unavailable',components:[]};
  const names=new Set(),components=[];
  for(const row of value.components){
    if(!row||typeof row.name!=='string'||!/^[a-zA-Z0-9 _-]{1,64}$/.test(row.name)||names.has(row.name)||!['up','unknown','unavailable','stale'].includes(row.status)||!(row.checkedAt==null||timestamp(row.checkedAt)))return {status:'unavailable',components:[]};
    names.add(row.name);components.push({name:row.name,status:row.status,checkedAt:row.checkedAt??null});
  }
  return {status:'ok',components};
}
export function monitorJobs(value){
  const keys=['queued','running','succeeded','failed','waiting_quota'];
  if(value?.status!=='ok'||!keys.every(key=>count(value.counts?.[key])))return {status:'unavailable',counts:null};
  return {status:'ok',counts:Object.fromEntries(keys.map(key=>[key,value.counts[key]]))};
}
// Semantic bridge only. Caller owns approved HTTP mapping and memory-only JWT.
export function createMonitor({api,now=Date.now,schedule=setInterval,cancel=clearInterval,visible=()=>true}){
  let state={authorized:false,summary:null,health:null,jobs:null,status:'unknown',error:null,lastSuccessAt:null},timer=null,epoch=0,busy=null;
  const listeners=new Set(),emit=patch=>{state={...state,...patch};for(const fn of listeners)fn();};
  const refresh=async()=>{
    if(!visible()||busy===epoch)return;const generation=epoch;busy=generation;
    try{
      const principal=await api.authorize();
      if(generation!==epoch)return;
      if(principal?.account?.status!=='active'||!['Staff','Manager'].includes(principal.account.role))throw Object.assign(Error(),{status:403});
      emit({authorized:true});
      // An authorization failure must clear protected data without waiting for a hung sibling request.
      const settle=call=>Promise.resolve().then(call).then(value=>({status:'fulfilled',value}),reason=>{
        if([401,403].includes(reason?.status))throw reason;
        return {status:'rejected',reason};
      });
      const results=await Promise.all([settle(()=>api.summary()),settle(()=>api.health()),settle(()=>api.jobs())]);
      if(generation!==epoch)return;
      if(results.some(r=>r.status==='rejected'&&[401,403].includes(r.reason?.status)))throw Object.assign(Error(),{status:401});
      const [summary,health,jobs]=results;
      if(summary.status==='fulfilled'){
        const safe=monitorSummary(summary.value),fresh=[safe.refreshedAt,safe.asOf].every(time=>now()-Date.parse(time)>=0&&now()-Date.parse(time)<=30000);
        emit({summary:safe,status:fresh?'fresh':'stale',lastSuccessAt:new Date(now()).toISOString(),error:fresh?null:'SAMPLE_STALE'});
      }else emit({status:state.summary?'stale':'unavailable',error:'SUMMARY_UNAVAILABLE'});
      emit({health:monitorHealth(health.status==='fulfilled'?health.value:null),jobs:monitorJobs(jobs.status==='fulfilled'?jobs.value:null)});
    }catch(error){if(generation!==epoch)return;if([401,403].includes(error.status))emit({authorized:false,summary:null,health:null,jobs:null,status:'unauthorized',error:'AUTHENTICATION_REQUIRED',lastSuccessAt:null});
      else emit({status:state.summary?'stale':'unavailable',error:'DEPENDENCY_UNAVAILABLE',health:{status:'unavailable',components:[]},jobs:{status:'unavailable',counts:null}});
    }finally{if(busy===generation)busy=null;}
  };
  return {subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},getSnapshot:()=>state,refresh,
    start(){if(timer===null){void refresh();timer=schedule(()=>void refresh(),30000);}},
    visibilityChanged(){if(visible()){if(timer===null){void refresh();timer=schedule(()=>void refresh(),30000);}}else{epoch++;if(timer!==null)cancel(timer);timer=null;if(state.summary)emit({status:'stale',error:'POLLING_PAUSED'});}},
    stop(){epoch++;if(timer!==null)cancel(timer);timer=null;},
  };
}
