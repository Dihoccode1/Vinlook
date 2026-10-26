import React, {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createContentAdapter} from '../src/adapters/content.js';
import {identityForBrowser} from '../src/tourist/browser-identity.js';
import {createTelemetry} from '../src/tourist/telemetry.js';
import {createPlayer} from '../src/tourist/player.js';
import {LocaleProvider, useLocale, useTouristTranslation} from '../src/i18n/provider.jsx';
import {LanguageSelector} from '../src/i18n/LanguageSelector.jsx';
import '../src/styles.css';

// Separate Vite dev entry; never imported by the production entry point.
if (!import.meta.env.DEV) throw Error('FIXTURE_FORBIDDEN');
const events = [], identity = identityForBrowser();
const usage = Object.fromEntries(['presence','start','heartbeat','end'].map(name => [name, async(...args) => {events.push([name,...args]);}]));
const telemetry = createTelemetry({usage, identity});
const media = document.createElement('audio');
media.preload = 'none';
const listeners = new Set();
let playerState = {state:'idle',item:null};
const player = createPlayer({media,telemetry,onChange:state=>{playerState=state;for(const fn of listeners)fn(state);}});
const fixturePoi = (n, locale) => ({id:n.toString(16).padStart(24,'0'),revisionId:(n+100).toString(16).padStart(24,'0'),
  nameEN:`Fixture place ${String(n).padStart(2,'0')}`,location:{type:'Point',coordinates:[106.7+n/1000,10.7]},
  entrance:{type:'Point',coordinates:[106.7+n/1000,10.7]},thumbnail:{url:`https://fixture.invalid/image-${n}.png`},
  languageCode:locale,text:`[TEST FIXTURE · ${locale} · ${n}] Synthetic DTO, not reviewed tourist content.`,
  audio:{url:`https://fixture.invalid/${n}/${locale}.mp3`,durationSeconds:120}});
let scenario='ready';
const content = createContentAdapter('https://fixture.invalid',{fetcher:async url=>{
  const locale=url.searchParams.get('language');
  if(scenario==='error') throw Error('labelled fixture failure');
  const items=scenario==='empty'?[]:Array.from({length:15},(_,n)=>fixturePoi(n+1,locale));
  const q=url.searchParams.get('q')?.toLowerCase();
  const data={items:q?items.filter(item=>item.nameEN.toLowerCase().includes(q)):items,nextCursor:null,snapshotId:'labelled-fixture'};
  return new Response(JSON.stringify({data,requestId:'labelled-fixture'}),{headers:{'Content-Type':'application/json'}});
}});
window.touristFixture={identity,events,player,media,get playerState(){return playerState;}};
function Fixture(){
  const locale=useLocale(),t=useTouristTranslation();
  const [items,setItems]=useState([]),[state,setState]=useState('loading'),[q,setQ]=useState(''),[selected,setSelected]=useState(null);
  const [playback,setPlayback]=useState(playerState),[browser,setBrowser]=useState(null);
  const [gps,setGps]=useState(null),[reload,setReload]=useState(0);
  useEffect(()=>{let stale=false;setState('loading');setSelected(null);
    content.list({locale:locale.locale,q:q.trim()||undefined}).then(data=>{if(!stale){setItems(data.items);setState(data.items.length?'ready':'empty');}})
      .catch(()=>{if(!stale)setState('error');});return()=>{stale=true;};
  },[locale.locale,q,reload]);
  useEffect(()=>{listeners.add(setPlayback);void identity().then(setBrowser);telemetry.mount();
    const offline=()=>telemetry.offline(),online=()=>telemetry.reconnect();
    window.addEventListener('offline',offline);window.addEventListener('online',online);
    const unload=()=>telemetry.dispose();window.addEventListener('pagehide',unload);
    return()=>{listeners.delete(setPlayback);player.dispose();telemetry.dispose();window.removeEventListener('offline',offline);window.removeEventListener('online',online);window.removeEventListener('pagehide',unload);};
  },[]);
  useEffect(()=>player.localeChanged(locale.locale),[locale.locale]);
  return <main style={{maxWidth:1000,margin:'auto',padding:24,display:'grid',gap:20}}>
    <aside role="note" style={{background:'#fff1bd',color:'#422e00',padding:16,borderRadius:8}}>
      <strong>LOCAL TEST FIXTURE — NOT LIVE ACCEPTANCE</strong><p>API DTO and player harness. 15 synthetic records; no map, approved narration, offline package or live telemetry. Audio URLs deliberately unavailable.</p>
    </aside>
    <h1 style={{fontSize:28,fontWeight:700}}>Vinlook · Tourist adapters</h1><LanguageSelector/>
    <p data-testid="identity-quality">Telemetry identity: {browser?.quality??'initializing'}</p>
    <label>Fixture scenario <select aria-label="Fixture scenario" onChange={e=>{scenario=e.target.value;setReload(n=>n+1);}} defaultValue="ready">
      <option value="ready">15 synthetic POIs</option><option value="empty">Empty</option><option value="error">Network failure</option>
    </select></label>
    <label>Search names <input aria-label="Search names" value={q} onChange={e=>setQ(e.target.value)} style={{border:'1px solid',padding:8,maxWidth:'100%'}}/></label>
    <button onClick={()=>navigator.geolocation?.getCurrentPosition(()=>setGps('available'),()=>setGps('denied'))}>{t('map.locateMe')}</button>
    {gps==='denied'&&<p role="status">{t('map.locationDenied')}</p>}
    <p role="status" data-testid="catalog-state">{state==='ready'?t('map.foundCount',{count:items.length}):t(`common.${state==='loading'?'loading':state==='empty'?'empty':'error'}`)}</p>
    {state==='error'&&<button onClick={()=>setReload(n=>n+1)}>{t('common.retry')}</button>}
    {state==='ready'&&<ul style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(240px,100%),1fr))',gap:12}}>{items.map(item=><li key={item.id} style={{border:'1px solid #d2ddd5',padding:12,borderRadius:8}}><button onClick={()=>setSelected(item)}>{item.nameEN}</button></li>)}</ul>}
    {selected&&<section aria-label="POI fixture details" style={{border:'1px solid #d2ddd5',padding:16}}>
      <h2>{selected.nameEN}</h2><p>{selected.text}</p><button onClick={()=>setSelected(null)}>{t('common.close')} sheet</button>
      <button onClick={()=>void player.play(selected)}>{t('audio.play')}</button>
    </section>}
    {playback.item&&<section aria-label="Mini player" style={{border:'1px solid #d2ddd5',padding:16}}>
      <p>{playback.item.nameEN} · {playback.item.languageCode} · <span data-testid="player-state">{playback.state}</span></p>
      <button onClick={()=>playback.state==='playing'?player.pause():void player.play(playback.item)}>{t(playback.state==='playing'?'audio.pause':'audio.play')}</button>
      <button onClick={()=>player.close()}>{t('common.close')} audio</button>
    </section>}
  </main>;
}
createRoot(document.getElementById('root')).render(<LocaleProvider><Fixture/></LocaleProvider>);
