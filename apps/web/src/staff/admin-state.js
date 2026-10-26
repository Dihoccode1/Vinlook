import {localeCodes} from '../i18n/locales.js';
// UI preflight only; backend always revalidates authority/current versions/media.
export function publicationGaps(document) {
  const rev=document?.workingRevision;
  const gaps=[];
  if(!rev||rev.status!=='in_review')gaps.push('Revision is not in review');
  if(!rev?.entrance)gaps.push('Entrance is missing');
  if(!rev?.thumbnailAsset)gaps.push('Thumbnail is missing');
  for(const code of localeCodes){const row=document?.localizedContents?.find(r=>r.languageCode===code);
    if(!row||row.reviewStatus!=='approved'||!row.isSourceCurrent||!row.isAudioCurrent||!row.audioAsset?.url||!Number.isFinite(row.durationSeconds)||row.durationSeconds<90||row.durationSeconds>150)gaps.push(`${code}: current reviewed text/audio required`);
  }
  return gaps;
}
export function createAdminState(api) {
  let state={principal:null,document:null,input:null,busy:false,error:null,conflict:false,jobs:[]};
  const listeners=new Set();
  const set=patch=>{state={...state,...patch};for(const fn of listeners)fn();};
  const execute=async fn=>{
    if(state.busy)return;
    set({busy:true,error:null});
    try{return await fn();}catch(error){set({error:error.code??'SERVICE_UNAVAILABLE',conflict:error.status===409||state.conflict,
      ...(error.status===401?{principal:null,document:null,input:null,jobs:[]}: {})});throw error;}finally{set({busy:false});}
  };
  const read=async(poiId,keepInput=false)=>{const document=await api.read(poiId);set({document,conflict:false,...(!keepInput?{input:document.workingRevision??document.publishedRevision}: {})});return document;};
  return {
    subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},getSnapshot:()=>state,
    setInput:input=>set({input}),
    newDraft:input=>set({document:null,input,conflict:false,jobs:[],error:null}),
    login:(email,password)=>execute(async()=>set({principal:await api.login(email,password)})),
    logout(){api.logout();set({principal:null,document:null,input:null,jobs:[],error:null,conflict:false});},
    refreshAuthority:()=>execute(async()=>set({principal:await api.me()})),
    session:(operation,reason)=>execute(async()=>{if(operation==='open')await api.openSession();else await api.closeSession(state.principal.currentWorkSession.id,reason);set({principal:await api.me()});}),
    read:poiId=>execute(()=>read(poiId)),
    mutate:fn=>execute(async()=>{
      const principal=await api.me();set({principal});
      if(!principal.currentWorkSession)throw Object.assign(Error('WORK_SESSION_REQUIRED'),{code:'WORK_SESSION_REQUIRED',status:403});
      const result=await fn(api,state);
      const poiId=result?.poiId??state.document?.poi.id;
      if(poiId)await read(poiId);
      return result;
    }),
    jobs:()=>execute(async()=>set({jobs:(await api.jobs(state.document.workingRevision.id)).items})),
  };
}
