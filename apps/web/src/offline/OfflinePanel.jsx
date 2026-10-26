import {useEffect,useState,useSyncExternalStore} from 'react';
import {useTouristTranslation} from '../i18n/provider.jsx';
const absent={status:'not_downloaded'},emptySubscribe=()=>()=>{},emptySnapshot=()=>absent;
export function OfflinePanel({store,manifest}){
  const t=useTouristTranslation(),state=useSyncExternalStore(store?.subscribe??emptySubscribe,store?.getSnapshot??emptySnapshot);
  const [busy,setBusy]=useState(false),[failure,setFailure]=useState(null);
  useEffect(()=>{let active=true;setFailure(null);if(!store)return;setBusy(true);void store.reopen().catch(error=>{if(active)setFailure(error.code??'LOCAL_DATA_MISSING');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[store]);
  const download=async()=>{setBusy(true);setFailure(null);try{await store.download(manifest);await store.reopen();}catch(error){setFailure(error.code??'DOWNLOAD_FAILED');}finally{setBusy(false);}};
  const total=Array.isArray(manifest?.files)?manifest.files.reduce((sum,file)=>sum+(Number.isSafeInteger(file?.byteLength)&&file.byteLength>0?file.byteLength:NaN),0):NaN;
  const downloading=['downloading','verifying'].includes(state.status),ready=state.status==='ready',sameVersion=ready&&state.packageVersion===manifest?.packageVersion;
  return <section aria-label={t('offline.prepare')} style={{display:'grid',gap:12,padding:20,border:'1px solid #d7dfd9',borderRadius:16,background:'white',minWidth:0}}><h2>{t('offline.prepare')}</h2><p>{manifest?.packageVersion??t('common.unavailable')}</p><p>{Number.isSafeInteger(total)?total:'—'} bytes</p><p>{t('offline.englishNotice')}</p>
    <p role="status">{t(downloading?'offline.downloading':ready?'offline.ready':state.status==='incomplete'||failure?'offline.downloadFailed':'offline.unavailable')}</p>
    {ready&&<p>{state.packageVersion}</p>}{ready&&!sameVersion&&manifest&&<p>{t('offline.updateAvailable')}</p>}
    {downloading&&<><progress aria-label={t('offline.downloading')} max={state.totalBytes} value={state.verifiedBytes??0}/><p>{state.verifiedBytes??0} / {state.totalBytes} bytes · {state.verifiedFiles} / {state.totalFiles}</p></>}
    {(failure||state.error)&&<p role="alert">{failure??state.error}</p>}<button style={{padding:'12px 16px',borderRadius:8,background:'#185c46',color:'white',minHeight:44,opacity:busy||downloading||sameVersion||!store||!manifest?.packageVersion?0.5:1}} disabled={busy||downloading||sameVersion||!store||!manifest} onClick={()=>void download()}>{t(busy||downloading?'offline.downloading':'offline.prepare')}</button></section>;
}
