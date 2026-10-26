import {createNavigationPolicy} from '../../../../packages/poc-routing/src/navigation.mjs';
// Wire/binary bridge is injected only after review. No provider or straight-line fallback.
export function createNavigation({workerFactory,geolocation,visible=()=>true,uuid=()=>crypto.randomUUID(),now,maxRoutePoints,maxCalculations,onChange=()=>{}}){
  const policy=createNavigationPolicy({maxRoutePoints,maxCalculations,now});
  let worker=null,watch=null,epoch=0,error=null;
  const emit=()=>onChange({...policy.snapshot(),error});
  const clearWatch=()=>{if(watch!==null)geolocation.clearWatch(watch);watch=null;};
  const terminate=()=>{epoch++;worker?.terminate();worker=null;};
  const calculate=async()=>{
    const snapshot=policy.snapshot();
    if(!snapshot.destination||snapshot.inflight||!snapshot.latestFix||!visible())return;
    let token;const generation=epoch;
    try{token=policy.beginCalculation(uuid());worker??=workerFactory();
      const result=await worker.calculate({token,position:snapshot.latestFix.position,accuracyMeters:snapshot.latestFix.accuracyMeters,destination:snapshot.destination});
      if(generation!==epoch)return;
      if(policy.acceptRoute(result))error=null;
    }catch(failure){if(generation!==epoch)return;if(token)policy.failCalculation(token.requestId);error=['NO_ROUTE','SNAP_NOT_FOUND','GRAPH_UNAVAILABLE','GRAPH_INCOMPATIBLE'].includes(failure.code)?failure.code:'CALCULATION_FAILED';}
    emit();
  };
  const observe=position=>{
    if(!visible())return;
    const result=policy.observeFix({timestamp:position.timestamp,position:[position.coords.longitude,position.coords.latitude],accuracyMeters:position.coords.accuracy});
    if(result.event==='arrived'){terminate();clearWatch();}
    else if(result.event==='reroute_eligible'||policy.snapshot().status==='loading_graph')void calculate();
    emit();
  };
  const startWatch=()=>{if(watch!==null||!visible())return;
    if(!geolocation){policy.gpsLost();error='GPS_UNAVAILABLE';emit();return;}
    watch=geolocation.watchPosition(observe,()=>{policy.gpsLost();error='GPS_UNAVAILABLE';emit();},{enableHighAccuracy:true});
  };
  return {snapshot:()=>({...policy.snapshot(),error}),
    start(destination){terminate();clearWatch();error=null;policy.setDestination(destination);startWatch();emit();},
    stop(){terminate();clearWatch();policy.cancel();error=null;emit();},
    visibilityChanged(){if(!visible()){clearWatch();const inflight=policy.snapshot().inflight;terminate();if(inflight)policy.failCalculation(inflight.requestId);policy.gpsLost();emit();}else if(policy.snapshot().destination)startWatch();},
    withdraw(poiId){const result=policy.withdraw(poiId);if(result.event==='destination_withdrawn'){terminate();clearWatch();emit();}},
    retry(){error=null;return calculate();},
  };
}
