import {test} from 'node:test';import assert from 'node:assert/strict';
import {partitionGraph,tileId} from '../src/tiles.mjs';
import {importOsm,COUNTRY_PROFILE_VERSION} from '../src/importer.mjs';
import {osmFixture,importLimits} from './build-fixtures.mjs';
const limits={degrees:0.001,nodes:100,edges:100,tiles:100,tileNodes:100,tileEdges:100};
test('country default is explicit opt-in; bans/barriers/conditions and old strict profile remain',()=>{
  const fixture=osmFixture();delete fixture.ways[0].tags.foot;
  assert.ok(!importOsm(fixture,importLimits).graph.edges.some(e=>e.id.startsWith('w:10:')));
  assert.ok(importOsm(fixture,importLimits,{profileVersion:COUNTRY_PROFILE_VERSION}).graph.edges.some(e=>e.id.startsWith('w:10:')));
  for(const tags of [{access:'private'},{foot:'no'},{'foot:conditional':'yes @ sunrise'},{highway:'motorway'}]){
    const changed=structuredClone(fixture);Object.assign(changed.ways[0].tags,tags);
    assert.ok(!importOsm(changed,importLimits,{profileVersion:COUNTRY_PROFILE_VERSION}).graph.edges.some(e=>e.id.startsWith('w:10:')));
  }
});
test('all directed cross-tile edges survive with target identity/coordinates and component evidence',()=>{
  const graph=importOsm(osmFixture(),importLimits).graph,result=partitionGraph(graph,limits);
  const edges=[...result.tiles.values()].flatMap(t=>t.edges);assert.equal(edges.length,graph.edges.length);
  const residents=new Map([...result.tiles.values()].flatMap(t=>t.nodes.map(n=>[n[0],{tile:t.id,node:n}])));
  for(const tile of result.tiles.values())for(const edge of tile.edges){
    assert.equal(residents.get(edge[1]).tile,tile.id);assert.equal(residents.get(edge[2]).tile,tileId(edge.slice(3,5),limits.degrees));
    assert.equal(residents.get(edge[1]).node[3],residents.get(edge[2]).node[3]);
  }
  assert.equal(result.report.releaseReady,false);assert.equal(result.report.weakComponents,3);
  const reverse=partitionGraph({nodes:[...graph.nodes].reverse(),edges:[...graph.edges].reverse()},limits);
  assert.deepEqual([...result.tiles],[...reverse.tiles]);
});
test('tile budgets fail without trimming and missing targets cannot become connectors',()=>{
  const graph=importOsm(osmFixture(),importLimits).graph;
  assert.throws(()=>partitionGraph(graph,{...limits,tiles:1}));
  assert.throws(()=>partitionGraph({...graph,nodes:graph.nodes.slice(1)},limits));
});
