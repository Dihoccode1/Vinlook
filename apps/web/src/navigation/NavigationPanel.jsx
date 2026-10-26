import {useEffect,useSyncExternalStore} from 'react';
import {useTouristTranslation} from '../i18n/provider.jsx';
export function NavigationPanel({controller,destination,name}){
  const t=useTouristTranslation();
  if(!controller||!destination)return <section aria-label={t('navigation.directions')}><h2>{t('navigation.directions')}</h2><p role="status">{t('common.unavailable')}</p></section>;
  return <ActiveNavigation controller={controller} destination={destination} name={name}/>;
}
function ActiveNavigation({controller,destination,name}){
  const t=useTouristTranslation(),state=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  useEffect(()=>{const change=()=>controller.visibilityChanged();document.addEventListener('visibilitychange',change);return()=>{document.removeEventListener('visibilitychange',change);controller.stop();};},[controller]);
  useEffect(()=>()=>controller.stop(),[controller,destination.poiId,destination.revisionId,destination.graphVersion]);
  const active=Boolean(state.destination),calculating=['calculating','loading_graph'].includes(state.status);
  const message=state.error==='GPS_PERMISSION_DENIED'?'map.locationDenied':state.error==='GPS_UNAVAILABLE'||['gps_unavailable','gps_uncertain'].includes(state.status)?'map.locationUnavailable':state.status==='arrived'?'navigation.arrive':state.status==='route_unavailable'||state.error?'navigation.noRoute':calculating?'navigation.calculating':'navigation.directions';
  return <section aria-label={t('navigation.directions')} style={{padding:16,display:'grid',gap:12,border:'1px solid #d7dfd9',borderRadius:12}}><h2>{t('navigation.directions')}</h2><p role="status">{t(message)}</p>
    {!active&&<button onClick={()=>controller.start(destination)}>{t('navigation.walkTo',{name})}</button>}
    {active&&<><p>{name}</p>{state.status==='route_unavailable'&&<button onClick={()=>void controller.retry()}>{t('common.retry')}</button>}<button onClick={()=>controller.stop()}>{t('common.cancel')}</button></>}
    {state.guidance&&<div lang="en" dir="ltr"><p>{Math.round(state.guidance.distanceMeters)} m</p>
      {state.guidance.warnings.includes('UNVERIFIED_CONNECTOR')&&<p role="status">The connection from your position to the route is unverified. Only departure and arrival guidance is available.</p>}
      {state.guidance.warnings.includes('MISSING_STREET_NAME')&&<p>Some streets have no name in the map data.</p>}
      <ol>{state.guidance.instructions.map((step,index)=><li key={index}>{step.text}{step.distanceMeters>0&&<span> · {Math.round(step.distanceMeters)} m</span>}</li>)}</ol>
    </div>}
  </section>;
}
