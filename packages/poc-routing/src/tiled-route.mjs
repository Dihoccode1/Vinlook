import {RoutingFailure,validPoint,distanceMeters,project,GEOMETRY_EPSILON_METERS as EPS} from './core.mjs';
import {tileId} from './tiles.mjs';
import {buildInstructions} from './guidance.mjs';
const fail=code=>{throw new RoutingFailure(code);};
class Heap{
 values=[];
 push(item){const a=this.values;a.push(item);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].cost<=a[i].cost)break;[a[p],a[i]]=[a[i],a[p]];i=p;}}
 pop(){const a=this.values,first=a[0],last=a.pop();if(a.length){a[0]=last;let i=0;for(;;){let c=2*i+1;if(c>=a.length)break;if(c+1<a.length&&a[c+1].cost<a[c].cost)c++;if(a[i].cost<=a[c].cost)break;[a[i],a[c]]=[a[c],a[i]];i=c;}}return first;}
}
/** Full directed graph search, loading source-owned adjacency only when a node is settled. */
export async function calculateTiledRoute(store,{position,accuracyMeters,entrance,entranceToleranceMeters,limits,signal}={}){
 if(!validPoint(position)||!validPoint(entrance)||!Number.isFinite(accuracyMeters)||accuracyMeters<0)fail('INVALID_POSITION');
 if(accuracyMeters>50)fail('GPS_UNCERTAIN');
 if(!Number.isFinite(entranceToleranceMeters)||entranceToleranceMeters<0||entranceToleranceMeters>50||!limits
  ||!['snapCandidates','settled','states','relaxations','heapEntries','resultPoints'].every(k=>Number.isSafeInteger(limits[k])&&limits[k]>0))fail('CALCULATION_FAILED');
 const check=()=>{if(signal?.aborted)fail('CALCULATION_FAILED');};
 const entryIds=new Set(store.entries.map(e=>e.id));
 const snaps=async(point,isEnd)=>{
  const lat=50/111000,lon=lat/Math.cos(point[1]*Math.PI/180),found=[];
  for(const entry of store.entries){check();const b=entry.snapBounds;
   if(b[0]>point[0]+lon||b[2]<point[0]-lon||b[1]>point[1]+lat||b[3]<point[1]-lat)continue;
   const tile=await store.load(entry.id);check();const nodes=new Map(tile.nodes.map(n=>[n[0],n]));
   for(const edge of tile.edges){const from=nodes.get(edge[1]),a=from.slice(1,3),to=edge.slice(3,5),p=project(point,a,to);
    if(p.distanceMeters>50+EPS||isEnd&&p.distanceMeters>entranceToleranceMeters+EPS)continue;
    if(found.length>=limits.snapCandidates)fail('CALCULATION_FAILED');
    found.push({...p,edge,from:a,to});
   }
  }
  found.sort((a,b)=>a.distanceMeters-b.distanceMeters||(a.edge[0]<b.edge[0]?-1:1));return found;
 };
 const starts=await snaps(position,false),ends=await snaps(entrance,true);if(!starts.length||!ends.length)fail('SNAP_NOT_FOUND');
 const states=new Map(),goals=new Map(),heap=new Heap(),indexes=new WeakMap();let best=null,relaxations=0,settled=0;
 const index=tile=>{let value=indexes.get(tile);if(!value){const nodes=new Map(tile.nodes.map(n=>[n[0],n])),adjacency=new Map();for(const e of tile.edges){if(!adjacency.has(e[1]))adjacency.set(e[1],[]);adjacency.get(e[1]).push(e);}value={nodes,adjacency};indexes.set(tile,value);}return value;};
 const push=(id,point,cost,previous,start,name)=>{
  if(!Number.isFinite(cost)||cost>Number.MAX_SAFE_INTEGER)fail('CALCULATION_FAILED');
  const old=states.get(id);if(old&&(old.point[0]!==point[0]||old.point[1]!==point[1]))fail('GRAPH_INCOMPATIBLE');
  if(old&&old.cost<=cost)return;
  if(!old&&states.size>=limits.states||heap.values.length>=limits.heapEntries)fail('CALCULATION_FAILED');
  states.set(id,{id,point,cost,previous,start,name,closed:false});heap.push({id,cost});
 };
 const consider=(cost,start,end,node=null,direct=false)=>{if(!best||cost<best.cost)best={cost,start,end,node,direct};};
 for(const end of ends){const key=end.edge[1];if(!goals.has(key))goals.set(key,[]);goals.get(key).push({end,cost:end.fraction*end.edge[5]});
  if(end.fraction===1){if(!goals.has(end.edge[2]))goals.set(end.edge[2],[]);goals.get(end.edge[2]).push({end,cost:0});}}
 for(const start of starts){
  push(start.edge[2],start.to,start.distanceMeters+(1-start.fraction)*start.edge[5],null,start,start.edge[6]);
  if(start.fraction===0)push(start.edge[1],start.from,start.distanceMeters,null,start,null);
  for(const end of ends)if(start.edge[0]===end.edge[0]&&start.fraction<=end.fraction)
   consider(start.distanceMeters+(end.fraction-start.fraction)*start.edge[5]+end.distanceMeters,start,end,null,true);
 }
 while(heap.values.length){check();const item=heap.pop(),current=states.get(item.id);if(current.closed||current.cost!==item.cost)continue;
  if(best&&current.cost>best.cost)break;if(++settled>limits.settled)fail('CALCULATION_FAILED');current.closed=true;
  const owner=tileId(current.point,store.degrees);if(!entryIds.has(owner))fail('GRAPH_INCOMPATIBLE');
  const tile=await store.load(owner);check();const indexed=index(tile),resident=indexed.nodes.get(current.id);
  if(!resident||resident[1]!==current.point[0]||resident[2]!==current.point[1])fail('GRAPH_INCOMPATIBLE');
  for(const goal of goals.get(current.id)??[])consider(current.cost+goal.cost+goal.end.distanceMeters,current.start,goal.end,current.id);
  for(const edge of indexed.adjacency.get(current.id)??[]){if(++relaxations>limits.relaxations)fail('CALCULATION_FAILED');
   push(edge[2],edge.slice(3,5),current.cost+edge[5],current.id,current.start,edge[6]);
  }
 }
 if(!best)fail('NO_ROUTE');
 const geometry=[],names=[],append=(point,name)=>{const last=geometry.at(-1);if(!last||last[0]!==point[0]||last[1]!==point[1]){if(geometry.length>=limits.resultPoints)fail('CALCULATION_FAILED');geometry.push([...point]);names.push(name);}};
 append(best.start.point,null);
 if(!best.direct){const chain=[];for(let id=best.node;id!==null;){const node=states.get(id);if(!node||chain.length>=limits.states)fail('GRAPH_INCOMPATIBLE');chain.push(node);id=node.previous;}
  for(const node of chain.reverse())append(node.point,node.name);
 }
 append(best.end.point,best.end.edge[6]);if(geometry.length===1){if(limits.resultPoints<2)fail('CALCULATION_FAILED');geometry.push([...geometry[0]]);names.push(null);}
 const unverified=best.start.distanceMeters>accuracyMeters+EPS;
 const instructions=buildInstructions(geometry,{turnByTurn:!unverified,segmentNames:names}),warnings=[];
 if(unverified)warnings.push('UNVERIFIED_CONNECTOR');if(instructions.some(s=>s.maneuver!=='arrive'&&s.streetName===null))warnings.push('MISSING_STREET_NAME');
 return {geometry,distanceMeters:Math.max(0,best.cost-best.start.distanceMeters-best.end.distanceMeters),instructions,
  snappedStart:[...best.start.point],snappedEnd:[...best.end.point],warnings,settled};
}
