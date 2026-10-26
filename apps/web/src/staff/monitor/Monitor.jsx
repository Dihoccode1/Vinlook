import {useEffect,useMemo,useSyncExternalStore} from 'react';
import {createMonitor} from './state.js';
import './monitor.css';
export function Monitor({api}){
  return <div className="monitor" lang="en" dir="ltr">{api?<Dashboard api={api}/>:<main><p className="monitor-eyebrow">VINLOOK / OPERATIONS</p><h1>Monitoring unavailable</h1><p>Approved Usage HTTP bridge is pending. Sign in through the staff host when integration is ready.</p></main>}</div>;
}
function Dashboard({api}){
  const store=useMemo(()=>createMonitor({api,visible:()=>document.visibilityState==='visible'}),[api]);
  const state=useSyncExternalStore(store.subscribe,store.getSnapshot);
  useEffect(()=>{store.start();const changed=()=>store.visibilityChanged();document.addEventListener('visibilitychange',changed);return()=>{store.stop();document.removeEventListener('visibilitychange',changed);};},[store]);
  if(!state.authorized)return <main><p className="monitor-eyebrow">VINLOOK / OPERATIONS</p><h1>Monitoring</h1><p role="status">{state.status==='unauthorized'?'Sign in with an active Staff or Manager account.':state.status==='unavailable'?'Service unavailable; no verified counts.':'Checking current authority…'}</p></main>;
  return <main><header className="monitor-header"><div><p className="monitor-eyebrow">VINLOOK / OPERATIONS</p><h1>Current usage</h1><p>System-wide activity · refreshes every 30 seconds while visible</p></div><button onClick={()=>void store.refresh()}>Refresh now</button></header>
    <p className={`monitor-status ${state.status==='fresh'?'is-fresh':''}`} role="status">{state.status} · {state.error??'Verified sample'}</p>
    <section aria-label="Current counts" className="monitor-counts"><article><p>Online visitors: <strong>{state.summary?.onlineVisitors??'Unavailable'}</strong></p><span>Distinct browsers</span></article><article><p>Current listeners: <strong>{state.summary?.currentListeners??'Unavailable'}</strong></p><span>Includes paused playback</span></article></section>
    <section className="monitor-times" aria-label="Sample timestamps"><p>As of: <time>{state.summary?.asOf??'Unknown'}</time></p><p>Sample refreshed: <time>{state.summary?.refreshedAt??'Unknown'}</time></p><p>Last success: <time>{state.lastSuccessAt??'None'}</time></p></section>
    <p className="monitor-note">Paused playback still counts as a listener. Each browser counts once globally. A browser may listen to different POIs in different tabs; the sum of POI rows may exceed the global count. No visitor locations are collected here.</p>
    <section aria-label="Listeners by POI"><h2>Listening across the city</h2>{state.summary?<div className="monitor-table"><table><caption>Current listeners by POI</caption><thead><tr><th scope="col">POI</th><th scope="col">Listeners</th></tr></thead><tbody>{state.summary.byPoi.map(row=><tr key={row.poiId}><td>{row.poiId}</td><td>{row.currentListeners}</td></tr>)}</tbody></table>{state.summary.byPoi.length===0&&<p>No POI listeners in the verified sample.</p>}</div>:<p>No verified POI sample available.</p>}</section>
    <div className="monitor-panels"><section aria-label="Dependency health"><h2>Dependencies</h2>{state.health?.status==='ok'&&state.health.components.length?state.health.components.map(row=><article className="monitor-health" key={row.name}><strong>{row.name}</strong><span>{row.status}</span><small>Checked: {row.checkedAt??'unknown'}</small></article>):<p>Unavailable — no verified dependency sample.</p>}</section>
    <section aria-label="Job status"><h2>Jobs</h2><p>{state.jobs?.status??'unknown'}</p>{state.jobs?.status==='ok'&&state.jobs.counts?<dl className="monitor-jobs">{Object.entries(state.jobs.counts).map(([name,value])=><div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>:<p>No complete verified job sample.</p>}</section></div>
  </main>;
}
