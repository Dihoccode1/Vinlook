import {createNavigation} from './controller.js';
import {createRouteWorkerClient} from '../../../../packages/poc-routing/src/route-client.mjs';
export function routingConfig(env){
 const url=env.VITE_ROUTING_MANIFEST_URL,hash=env.VITE_ROUTING_MANIFEST_SHA256,version=env.VITE_ROUTING_GRAPH_VERSION;
 if(!url&&!hash&&!version)return null;
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||!/^https:\/\//.test(url)
  ||!/^[a-f0-9]{64}$/.test(hash??'')||!/^[A-Za-z0-9._-]{1,100}$/.test(version??''))throw Error('INVALID_ROUTING_CONFIG');
 return Object.freeze({manifestUrl:parsed.href,manifestSha256:hash,graphVersion:version});
}
export function createTouristNavigation(source,onChange){
 const config={graphVersion:source.graphVersion,limits:{nodes:1500000,edges:3500000,indexEntries:10000000,snapCandidates:1000,queryEdges:100000,searchSettled:200000},maxRequests:30,maxResultPoints:20000,entranceToleranceMeters:2};
 return createNavigation({onChange,geolocation:navigator.geolocation,visible:()=>document.visibilityState!=='hidden',maxRoutePoints:20000,maxCalculations:30,
  workerFactory:()=>createRouteWorkerClient({config,timeoutMilliseconds:60000,tiles:{...source,
   limits:{manifestBytes:3000000,tileBytes:1000000,cacheBytes:32000000,tiles:16384,tileNodes:25000,tileEdges:50000,requests:500,timeoutMilliseconds:15000},
   searchLimits:{snapCandidates:1000,settled:200000,states:300000,relaxations:1000000,heapEntries:500000}}})});
}
