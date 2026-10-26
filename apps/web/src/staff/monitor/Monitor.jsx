import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {createMonitor} from './state.js';
export function Monitor({api}){
  return <div lang="en" dir="ltr">{api?<Dashboard api={api}/>:<main><h1>Monitoring unavailable</h1><p>Approved Usage HTTP bridge is pending. Sign in through the staff host when integration is ready.</p></main>}</div>;
}
function Dashboard({api}){
  const store=useMemo(()=>createMonitor({api,visible:()=>document.visibilityState==='visible'}),[api]);
  const state=useSyncExternalStore(store.subscribe,store.getSnapshot);
  useEffect(()=>{store.start();const changed=()=>store.visibilityChanged();document.addEventListener('visibilitychange',changed);return()=>{store.stop();document.removeEventListener('visibilitychange',changed);};},[store]);
  if(!state.authorized)return <main><h1>Monitoring</h1><p role="status">{state.status==='unauthorized'?'Sign in with an active Staff or Manager account.':state.status==='unavailable'?'Service unavailable; no verified counts.':'Checking current authority…'}</p></main>;
  return <main style={{maxWidth:1000,padding:24,margin:'auto',display:'grid',gap:20}}><h1 style={{fontSize:28,fontWeight:700}}>Current usage</h1><p role="status">{state.status} · {state.error??'Verified sample'}</p>
    <button onClick={()=>void store.refresh()}>Refresh now</button>
    <section aria-label="Current counts"><p>Online visitors: <strong>{state.summary?.onlineVisitors??'Unavailable'}</strong></p><p>Current listeners: <strong>{state.summary?.currentListeners??'Unavailable'}</strong></p>
    <p>As of: {state.summary?.asOf??'Unknown'} · Sample refreshed: {state.summary?.refreshedAt??'Unknown'} · Last success: {state.lastSuccessAt??'None'}</p></section>
    <p>Paused playback still counts as a listener. Each browser counts once globally. A browser may listen to different POIs in different tabs; the sum of POI rows may exceed the global count. No visitor locations are collected here.</p>
    <table><caption>Current listeners by POI</caption><thead><tr><th>POI</th><th>Listeners</th></tr></thead><tbody>{state.summary?.byPoi.map(row=><tr key={row.poiId}><td>{row.poiId}</td><td>{row.currentListeners}</td></tr>)}</tbody></table>
    <section aria-label="Dependency health"><h2>Dependencies</h2>{state.health?.components?.map(row=><p key={row.name}>{row.name}: {['up','unknown','unavailable','stale'].includes(row.status)?row.status:'unknown'} · checked {row.checkedAt??'unknown'}</p>)??<p>Unavailable</p>}</section>
    <section aria-label="Job status"><h2>Jobs</h2><p>{state.jobs?.status??'unknown'}</p>{state.jobs?.status==='ok'&&state.jobs.counts?Object.entries(state.jobs.counts).filter(([name])=>['queued','running','succeeded','failed','waiting_quota'].includes(name)).map(([name,value])=><p key={name}>{name}: {value}</p>):<p>No complete verified job sample.</p>}</section>
  </main>;
}
