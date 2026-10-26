import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {NavigationPanel} from '../navigation/NavigationPanel.jsx';
import {createTouristNavigation} from '../navigation/runtime.js';
import {LanguageSelector} from '../i18n/LanguageSelector.jsx';
import {useLocale,useTouristTranslation} from '../i18n/provider.jsx';
import {createPlayer} from './player.js';
import {createTelemetry} from './telemetry.js';
import {identityForBrowser} from './browser-identity.js';
import {appendPage,formatTime} from './catalog.js';
import {touristCopy} from './copy.js';
const NativeMap=lazy(()=>import('./MapView.jsx').then(m=>({default:m.MapView})));
function DefaultMap(props){return props.styleUrl?<Suspense fallback={<p role="status">…</p>}><NativeMap {...props}/></Suspense>:<div className="tour-map"><div className="map-source-note" role="status"><span aria-hidden="true">◇</span><p>{props.labels.mapMissing}</p></div></div>;}
const emptyPage={items:[],nextCursor:null,snapshotId:null};
const unavailableUsage=Object.fromEntries(['presence','start','heartbeat','end'].map(k=>[k,()=>Promise.reject(Error('USAGE_BRIDGE_PENDING'))]));
function Picture({src,alt,className=''}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[src]);return failed?<div className={'picture-fallback '+className} aria-label={alt}>◇</div>:<img className={className} src={src} alt={alt} loading="lazy" onError={()=>setFailed(true)}/>;}
export function TouristApp({content,mapStyleUrl=null,usage=null,routing=null,MapComponent=DefaultMap}){
 const t=useTouristTranslation(),locale=useLocale(),copy=touristCopy(locale.locale);
 const [page,setPage]=useState(emptyPage),[status,setStatus]=useState('loading'),[query,setQuery]=useState(''),[mode,setMode]=useState('all');
 const [reload,setReload]=useState(0),[selectedId,setSelectedId]=useState(null),[detail,setDetail]=useState(null),[detailStatus,setDetailStatus]=useState('idle');
 const [position,setPosition]=useState(null),[gpsStatus,setGpsStatus]=useState('idle'),[playback,setPlayback]=useState({state:'idle',item:null}),[time,setTime]=useState(0);
 const [navigationState,setNavigationState]=useState(null);
 const navigation=useMemo(()=>routing?createTouristNavigation(routing,setNavigationState):null,[routing]);
 useEffect(()=>()=>navigation?.stop(),[navigation]);
 const player=useRef(null),geoRequest=useRef(0),loadGeneration=useRef(0),moreAbort=useRef(null);
 useEffect(()=>{
  const media=new Audio();media.preload='none';
  const telemetry=createTelemetry({usage:usage??unavailableUsage,identity:identityForBrowser()});
  const p=createPlayer({media,telemetry,onChange:s=>{setPlayback(s);if(s.state==='idle')setTime(0);}});player.current=p;telemetry.mount();
  const tick=()=>setTime(media.currentTime),offline=()=>telemetry.offline(),online=()=>telemetry.reconnect(),hide=()=>{p.close('page_closed');};
  media.addEventListener('timeupdate',tick);window.addEventListener('offline',offline);window.addEventListener('online',online);window.addEventListener('pagehide',hide);
  return()=>{p.dispose();telemetry.dispose();media.removeEventListener('timeupdate',tick);window.removeEventListener('offline',offline);window.removeEventListener('online',online);window.removeEventListener('pagehide',hide);player.current=null;};
 },[usage]);
 useEffect(()=>{player.current?.localeChanged(locale.locale);geoRequest.current++;setGpsStatus(previous=>previous==='loading'?'idle':previous);},[locale.locale]);
 useEffect(()=>{
  const controller=new AbortController(),generation=++loadGeneration.current;moreAbort.current?.abort();setPage(emptyPage);setStatus('loading');
  const timer=setTimeout(async()=>{if(!content){setStatus('configuration');return;}try{
   const result=mode==='nearby'&&position?await content.nearby({...position,locale:locale.locale,signal:controller.signal}):await content.list({locale:locale.locale,q:query.trim()||undefined,signal:controller.signal});
   if(generation===loadGeneration.current&&!controller.signal.aborted){setPage(mode==='nearby'?{...result,nextCursor:null,snapshotId:null}:result);setStatus('ready');}
  }catch{if(generation===loadGeneration.current&&!controller.signal.aborted)setStatus('error');}},200);
  return()=>{clearTimeout(timer);controller.abort();};
 },[content,locale.locale,query,mode,position,reload]);
 useEffect(()=>()=>moreAbort.current?.abort(),[]);
 useEffect(()=>{
  if(!selectedId||!content){setDetail(null);setDetailStatus('idle');return;}
  const controller=new AbortController();setDetail(null);setDetailStatus('loading');
  content.detail(selectedId,locale.locale,{signal:controller.signal}).then(item=>{if(!controller.signal.aborted){setDetail(item);setDetailStatus('ready');}}).catch(()=>{if(!controller.signal.aborted)setDetailStatus('error');});
  return()=>controller.abort();
 },[selectedId,content,locale.locale,reload]);
 function locate(){
  const request=++geoRequest.current;setGpsStatus('loading');
  if(!navigator.geolocation){setGpsStatus('unavailable');return;}
  navigator.geolocation.getCurrentPosition(value=>{if(request!==geoRequest.current)return;setPosition({lon:value.coords.longitude,lat:value.coords.latitude});setGpsStatus('ready');setQuery('');setMode('nearby');},error=>{if(request===geoRequest.current)setGpsStatus(error.code===1?'denied':'unavailable');},{enableHighAccuracy:false,timeout:10000,maximumAge:30000});
 }
 async function more(){
  if(!page.nextCursor||status!=='ready')return;const generation=loadGeneration.current,controller=new AbortController();moreAbort.current=controller;setStatus('more');
  try{const next=await content.list({locale:locale.locale,q:query.trim()||undefined,cursor:page.nextCursor,signal:controller.signal});if(generation===loadGeneration.current&&!controller.signal.aborted){setPage(appendPage(page,next));setStatus('ready');}}
  catch{if(generation===loadGeneration.current&&!controller.signal.aborted)setStatus('error');}
 }
 const stateText=status==='configuration'?copy.contentMissing:status==='error'?copy.connectError:status==='loading'?t('common.loading'):t('map.foundCount',{count:page.items.length});
 return <main className={'tour-shell'+(playback.item?' has-player':'')}>
  <header className="tour-header"><a href="/" className="tour-brand" aria-label="Vinlook"><span className="brand-mark" aria-hidden="true">v<span>↗</span></span>vinlook<span className="brand-dot">.</span></a><span className="city-caption">Ho Chi Minh City</span><div className="header-language"><LanguageSelector/></div></header>
  <div className="tour-workspace"><section className="tour-sidebar" aria-label={copy.list}>
   <div className="tour-intro"><p className="tour-eyebrow">{copy.guides}</p><h1>{t('preview.title')}</h1><p>{t('preview.subtitle')}</p></div>
   <form className="tour-search" onSubmit={e=>e.preventDefault()} role="search"><span aria-hidden="true">⌕</span><input aria-label={copy.search} placeholder={copy.search} value={query} maxLength={200} onChange={e=>{setQuery(e.target.value);setMode('all');}}/>{query&&<button type="button" aria-label={t('common.close')} onClick={()=>setQuery('')}>×</button>}</form>
   <div className="tour-filters"><button className={mode==='all'?'active':''} onClick={()=>{setMode('all');setQuery('');}}>{copy.all}</button><button className={mode==='nearby'?'active':''} onClick={locate} disabled={gpsStatus==='loading'}><span aria-hidden="true">◎ </span>{t('map.nearby')}</button></div>
   {['denied','unavailable'].includes(gpsStatus)&&<p role="status" className="tour-notice">{t(gpsStatus==='denied'?'map.locationDenied':'map.locationUnavailable')}</p>}
   {locale.mode==='offline'&&<p className="tour-notice" role="status">{copy.offline} · {t('offline.unavailable')}</p>}
   <div className="catalog-heading"><h2>{mode==='nearby'?t('map.nearby'):copy.all}</h2><p role="status" data-testid="catalog-status">{stateText}</p></div>
   {(status==='error'||status==='configuration')&&<button className="tour-retry" onClick={()=>setReload(x=>x+1)}>{t('common.retry')}</button>}
   {status==='ready'&&page.items.length===0&&<div className="tour-empty"><span aria-hidden="true">◇</span><h3>{mode==='nearby'?t('map.noNearby'):copy.empty}</h3><p>{copy.emptyBody}</p></div>}
   <ul className="tour-place-list" data-content-locale={page.items[0]?.languageCode??''}>{page.items.map((item,index)=><li key={item.id}><button className={'tour-place'+(selectedId===item.id?' selected':'')} onClick={()=>setSelectedId(item.id)} aria-label={`${copy.view}: ${item.nameEN}`} aria-pressed={selectedId===item.id}><Picture className="place-picture" src={item.thumbnail.url} alt=""/><span className="place-info"><span className="place-index">{String(index+1).padStart(2,'0')} · {formatTime(item.audio.durationSeconds)}</span><strong>{item.nameEN}</strong><span className="place-action">{t('poi.details')} ↗</span></span></button></li>)}</ul>
   {page.nextCursor&&<button className="tour-retry" onClick={()=>void more()} disabled={status!=='ready'}>{status==='more'?t('common.loading'):copy.more}</button>}
   <footer className="tour-list-footer"><span className="status-dot" aria-hidden="true"/> {copy.guides} · Vinlook · <a href="/credits/photos.html" lang="en">Photo credits</a></footer>
  </section>
  <section className="tour-map-panel" aria-label={t('map.title')}><MapComponent styleUrl={mapStyleUrl} items={page.items} selectedId={selectedId} position={navigationState?.latestFix?{lon:navigationState.latestFix.position[0],lat:navigationState.latestFix.position[1]}:position} route={navigationState?.route?.geometry??null} onSelect={setSelectedId} labels={{...copy,map:t('map.title'),error:t('common.error'),retry:t('common.retry')}}/>
   <div className="map-caption" dir="ltr"><span className="status-dot"/> HO CHI MINH CITY <span>10.7769° N · 106.7009° E</span></div>
   <button className="locate-control" onClick={locate} disabled={gpsStatus==='loading'} aria-label={t('map.locateMe')}>◎</button>
   {selectedId&&<section className="poi-detail" aria-label={t('poi.details')}><button className="detail-close" aria-label={t('common.close')} onClick={()=>setSelectedId(null)}>×</button>
    {detailStatus==='loading'&&<p role="status">{t('common.loading')}</p>}{detailStatus==='error'&&<div role="alert"><p>{copy.connectError}</p><button onClick={()=>setReload(x=>x+1)}>{t('common.retry')}</button></div>}
    {detail&&<><Picture className="detail-picture" src={detail.thumbnail.url} alt={detail.nameEN}/><div className="detail-body"><p className="tour-eyebrow">{copy.guides} · {formatTime(detail.audio.durationSeconds)}</p><h2>{detail.nameEN}</h2><button className="listen-button" onClick={()=>void player.current?.play(detail)}>▶ {t('audio.play')}</button><NavigationPanel controller={navigation} destination={routing?{poiId:detail.id,revisionId:detail.revisionId,graphVersion:routing.graphVersion,entrance:detail.entrance.coordinates}:null} name={detail.nameEN}/><h3>{t('poi.description')}</h3><p className="detail-text">{detail.text}</p></div></>}
   </section>}
  </section></div>
  {playback.item&&<section className="tour-mini-player" aria-label={copy.guides}><div className="mini-title"><span className="sound-glyph" aria-hidden="true">▂▅▇▃</span><div><strong>{playback.item.nameEN}</strong><span>{playback.item.languageCode} · {copy.guides}</span></div></div>
   <div className="mini-progress"><progress aria-label={copy.guides} value={time} max={playback.item.audio.durationSeconds}/><span dir="ltr">{formatTime(time)} / {formatTime(playback.item.audio.durationSeconds)}</span></div>
   <button className="mini-play" disabled={playback.state==='loading'} aria-label={t(playback.state==='playing'?'audio.pause':'audio.play')} onClick={()=>playback.state==='playing'?player.current?.pause():void player.current?.play(playback.item)}>{playback.state==='loading'?'…':playback.state==='playing'?'Ⅱ':'▶'}</button><button className="mini-close" aria-label={t('common.close')} onClick={()=>player.current?.close()}>×</button>
   {playback.state==='error'&&<p role="alert">{t('audio.unavailable')}</p>}
  </section>}
 </main>;
}
