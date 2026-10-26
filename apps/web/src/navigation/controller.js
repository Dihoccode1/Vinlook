import {createNavigationPolicy} from '../../../../packages/poc-routing/src/navigation.mjs';
// Wire/binary bridge is injected only after review. No provider or straight-line fallback.
export function createNavigation({workerFactory,geolocation,visible=()=>true,uuid=()=>crypto.randomUUID(),now,maxRoutePoints,maxCalculations,onChange=()=>{}}){
  const policy=createNavigationPolicy({maxRoutePoints,maxCalculations,now});
  let worker=null,watch=null,epoch=0,watchEpoch=0,error=null,guidance=null,snapshot={...policy.snapshot(),error:null,guidance:null};
  const listeners=new Set();
  const view=()=>({...policy.snapshot(),error,guidance:guidance?{...guidance,instructions:guidance.instructions.map(step=>({...step})),warnings:[...guidance.warnings]}:null});
  const emit=()=>{snapshot=view();onChange(snapshot);for(const listener of listeners)listener();};
  const clearWatch=()=>{watchEpoch++;if(watch!==null)geolocation.clearWatch(watch);watch=null;};
  const terminate=()=>{epoch++;const previous=worker;worker=null;try{previous?.terminate();}catch{/* Never reuse a failed Worker. */}};
  const calculate=async()=>{
    const snapshot=policy.snapshot();
    if(!snapshot.destination||snapshot.inflight||!snapshot.latestFix||!visible())return;
    let token;const generation=epoch;
    try{token=policy.beginCalculation(uuid());worker??=workerFactory();
      const result=await worker.calculate({token,position:snapshot.latestFix.position,accuracyMeters:snapshot.latestFix.accuracyMeters,destination:snapshot.destination});
      if(generation!==epoch)return;
      const nextGuidance=readGuidance(result,maxRoutePoints);
      if(policy.acceptRoute(result)){error=null;guidance=nextGuidance;}
      else{policy.failCalculation(token.requestId);error='GRAPH_INCOMPATIBLE';terminate();}
    }catch(failure){if(generation!==epoch)return;if(token)policy.failCalculation(token.requestId);error=['NO_ROUTE','SNAP_NOT_FOUND','GRAPH_UNAVAILABLE','GRAPH_INCOMPATIBLE'].includes(failure.code)?failure.code:'CALCULATION_FAILED';terminate();}
    emit();
  };
  const observe=position=>{
    if(!visible())return;
    const result=policy.observeFix({timestamp:position.timestamp,position:[position.coords.longitude,position.coords.latitude],accuracyMeters:position.coords.accuracy});
    if(result.event==='arrived'){terminate();clearWatch();}
    else if(result.event==='reroute_eligible'||policy.snapshot().status==='loading_graph'){error=null;void calculate();}
    else if(!['gps_unavailable','gps_uncertain'].includes(policy.snapshot().status))error=null;
    emit();
  };
  const startWatch=()=>{if(watch!==null||!visible())return;
    if(!geolocation){policy.gpsLost();error='GPS_UNAVAILABLE';emit();return;}
    const generation=watchEpoch;
    try{watch=geolocation.watchPosition(position=>{if(generation===watchEpoch&&visible())observe(position);},failure=>{if(generation!==watchEpoch||!visible())return;policy.gpsLost();error=failure?.code===1?'GPS_PERMISSION_DENIED':'GPS_UNAVAILABLE';emit();},{enableHighAccuracy:true});}
    catch{policy.gpsLost();error='GPS_UNAVAILABLE';emit();}
  };
  return {snapshot:view,getSnapshot:()=>snapshot,
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    start(destination){terminate();clearWatch();error=null;guidance=null;policy.setDestination(destination);startWatch();emit();},
    stop(){terminate();clearWatch();policy.cancel();error=null;guidance=null;emit();},
    visibilityChanged(){if(!visible()){clearWatch();const inflight=policy.snapshot().inflight;terminate();if(inflight)policy.failCalculation(inflight.requestId);policy.gpsLost();emit();}else if(policy.snapshot().destination)startWatch();},
    withdraw(poiId){const result=policy.withdraw(poiId);if(result.event==='destination_withdrawn'){terminate();clearWatch();guidance=null;emit();}},
    retry(){error=null;return calculate();},
  };
}

function readGuidance(result,limit){
  if(result.instructions===undefined)return null; // Older geometry-only bridge remains supported.
  const steps=result.instructions,warnings=result.warnings;
  if(!Number.isFinite(result.distanceMeters)||result.distanceMeters<0||!Array.isArray(steps)||steps.length<2||steps.length>limit
    ||!Array.isArray(warnings)||warnings.length>2||warnings.some(value=>!['UNVERIFIED_CONNECTOR','MISSING_STREET_NAME'].includes(value))
    ||steps[0]?.maneuver!=='depart'||steps.at(-1)?.maneuver!=='arrive'
    ||steps.some((step,index)=>!step||!['depart','continue','left','right','u_turn','arrive'].includes(step.maneuver)
      ||!Number.isSafeInteger(step.geometryIndex)||step.geometryIndex<0||step.geometryIndex>=result.geometry.length
      ||index>0&&step.geometryIndex<steps[index-1].geometryIndex
      ||!Number.isFinite(step.distanceMeters)||step.distanceMeters<0||typeof step.text!=='string'||!step.text.trim()||step.text.length>2048))throw Error('INVALID_GUIDANCE');
  return {distanceMeters:result.distanceMeters,instructions:steps.map(({maneuver,geometryIndex,distanceMeters,text})=>({maneuver,geometryIndex,distanceMeters,text})),warnings:[...warnings]};
}
