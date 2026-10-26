import {useState} from 'react';
import {useTouristTranslation} from '../i18n/provider.jsx';
export function OfflinePanel({store,manifest}){
  const t=useTouristTranslation(),[state,setState]=useState({status:'not_downloaded'}),[busy,setBusy]=useState(false);
  const download=async()=>{setBusy(true);try{await store.download(manifest);setState(await store.reopen());}catch(error){setState({status:'incomplete',error:error.code??'DOWNLOAD_FAILED'});}finally{setBusy(false);}};
  return <section><h2>{t('offline.prepare')}</h2><p>{manifest?.packageVersion??t('common.unavailable')}</p><p>{manifest?.files?.reduce((sum,file)=>sum+file.byteLength,0)??'—'} bytes · English</p>
    <p role="status">{t(state.status==='ready'?'offline.ready':state.status==='incomplete'?'offline.downloadFailed':'offline.unavailable')}</p>
    {state.error&&<p>{state.error}</p>}<button disabled={busy||!store||!manifest} onClick={()=>void download()}>{t(busy?'offline.downloading':'offline.prepare')}</button></section>;
}
