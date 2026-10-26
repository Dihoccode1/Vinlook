import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionGraph} from '../src/tiles.mjs';
import {calculateTiledRoute} from '../src/tiled-route.mjs';
import {calculateGuidance} from '../src/guidance.mjs';
import {createGraph,distanceMeters} from '../src/core.mjs';
import {p,node,edge,generatedGraph,limits as coreLimits} from './core-fixtures.mjs';
const limits={snapCandidates:100,settled:100,states:100,relaxations:100,heapEntries:100,resultPoints:100};
function fixture(disconnected=false){
 const nodes=[node('a',0),node('b',200),node('c',200,200),node('d',400,200)];
 const edges=[edge('ab','a','b',201,{streetName:'A'}),edge('bc','b','c',201,{streetName:'B'}),edge('cd','c','d',201,{streetName:'C'})];
 if(disconnected)edges.splice(1,1);
 const graph={nodes,edges},degrees=0.001,{tiles}=partitionGraph(graph,{degrees,nodes:100,edges:100,tiles:100,tileNodes:100,tileEdges:100});
 const loaded=[];const store={degrees,entries:[...tiles.values()].map(t=>({id:t.id,snapBounds:t.snapBounds})),async load(id){loaded.push(id);return tiles.get(id);}};
 const request={position:p(50),accuracyMeters:5,entrance:p(350,200),entranceToleranceMeters:1,limits};
 return {graph,store,request,loaded,tiles};
}
test('cross-tile directed path matches existing monolithic guidance including partial edge costs',async()=>{
 const f=fixture(),actual=await calculateTiledRoute(f.store,f.request);
 const expected=calculateGuidance(createGraph(f.graph,coreLimits),{...f.request,maxResultPoints:100});
 assert.deepEqual(actual.geometry,expected.geometry);assert.ok(Math.abs(actual.distanceMeters-expected.distanceMeters)<1e-8);
 assert.deepEqual(actual.instructions,expected.instructions);assert.ok(new Set(f.loaded).size>=3);
 assert.ok(actual.distanceMeters>distanceMeters(f.request.position,f.request.entrance));
});
test('respects one-way and disconnected topology instead of drawing an endpoint line',async()=>{
 const f=fixture();await assert.rejects(calculateTiledRoute(f.store,{...f.request,position:f.request.entrance,entrance:f.request.position}),{code:'NO_ROUTE'});
 const d=fixture(true);await assert.rejects(calculateTiledRoute(d.store,d.request),{code:'NO_ROUTE'});
});
test('enforces GPS and entrance connector rules and suppresses turns for unverified start',async()=>{
 const f=fixture();await assert.rejects(calculateTiledRoute(f.store,{...f.request,accuracyMeters:51}),{code:'GPS_UNCERTAIN'});
 await assert.rejects(calculateTiledRoute(f.store,{...f.request,entrance:p(350,205)}),{code:'SNAP_NOT_FOUND'});
 const r=await calculateTiledRoute(f.store,{...f.request,position:p(50,20),accuracyMeters:5});
 assert.ok(r.warnings.includes('UNVERIFIED_CONNECTOR'));assert.equal(r.instructions.length,2);
});
test('bounds search, validates cross-tile resident identity and handles cancellation',async()=>{
 const f=fixture();await assert.rejects(calculateTiledRoute(f.store,{...f.request,limits:{...limits,settled:1}}),{code:'CALCULATION_FAILED'});
 const controller=new AbortController();controller.abort();await assert.rejects(calculateTiledRoute(f.store,{...f.request,signal:controller.signal}),{code:'CALCULATION_FAILED'});
 const bad=fixture();const load=bad.store.load;bad.store.load=async id=>{const t=await load(id);return {...t,nodes:t.nodes.map(n=>n[0]==='b'?[n[0],n[1]+0.00001,n[2],n[3]]:n)};};
 await assert.rejects(calculateTiledRoute(bad.store,bad.request),{code:'GRAPH_INCOMPATIBLE'});
});
test('can arrive at an edge terminal node with no outgoing edges',async()=>{
 const f=fixture();const r=await calculateTiledRoute(f.store,{...f.request,position:p(350,200),entrance:p(400,200)});
 assert.ok(r.distanceMeters>49&&r.distanceMeters<52);assert.deepEqual(r.snappedEnd,p(400,200));
});
test('A* terminal heuristic agrees with monolithic snapped routing on directed generated topologies',async()=>{
 for(let seed=1;seed<=20;seed++){
  const graph=generatedGraph(seed),degrees=0.001,{tiles}=partitionGraph(graph,{degrees,nodes:100,edges:1000,tiles:100,tileNodes:100,tileEdges:1000});
  const store={degrees,entries:[...tiles.values()].map(t=>({id:t.id,snapBounds:t.snapBounds})),async load(id){return tiles.get(id);}};
  const request={position:graph.nodes[0].point,accuracyMeters:5,entrance:graph.nodes.at(-1).point,entranceToleranceMeters:1,limits:{...limits,relaxations:10000,heapEntries:10000}};
  let expected,actual;try{expected=calculateGuidance(createGraph(graph,coreLimits),{...request,maxResultPoints:100});}catch(e){expected={code:e.code};}
  try{actual=await calculateTiledRoute(store,request);}catch(e){actual={code:e.code};}
  assert.equal(actual.code,expected.code,`seed${seed}`);if(!actual.code)assert.ok(Math.abs(actual.distanceMeters-expected.distanceMeters)<1e-5,`seed${seed}`);
 }
});
