import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createTileStore} from '../src/tile-store.mjs';
import {TILE_FORMAT} from '../src/tiles.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
function fixture(change=()=>{}){
 const tiles=[{id:'100_100',nodes:[['a',1.001,1.001,'a']],edges:[['ab','a','b',1.011,1.001,1200,'Street']]},
  {id:'101_100',nodes:[['b',1.011,1.001,'a']],edges:[]}].map(t=>({format:TILE_FORMAT,graphVersion:'test-v1',profileVersion:'vn-foot-v1',...t}));
 change(tiles);
 const payloads=new Map(tiles.map(t=>[`https://example.test/tiles/${t.id}.json`,JSON.stringify(t)]));
 const manifest={format:TILE_FORMAT,graphVersion:'test-v1',profileVersion:'vn-foot-v1',degrees:0.01,topology:'outgoing-owned-by-source-node',tiles:tiles.map(t=>{
  const raw=JSON.stringify(t);return {id:t.id,url:`tiles/${t.id}.json`,sha256:hash(raw),bytes:Buffer.byteLength(raw),nodes:t.nodes.length,edges:t.edges.length,snapBounds:[1,1,1.02,1.01]};
 })};
 const raw=JSON.stringify(manifest);payloads.set('https://example.test/manifest.json',raw);
 const calls=[];
 const config={manifestUrl:'https://example.test/manifest.json',manifestSha256:hash(raw),graphVersion:'test-v1',limits:{manifestBytes:10000,tileBytes:1000,cacheBytes:1000,tiles:10,tileNodes:10,tileEdges:10,requests:20,timeoutMilliseconds:1000},fetcher:async(url,options)=>{calls.push({url,options});return new Response(payloads.get(url),{status:payloads.has(url)?200:404});}};
 return {config,calls,payloads,manifest};
}
test('fetches pinned manifest and only requested tiles; keeps directed cross-tile edge unchanged',async()=>{
 const f=fixture(),store=await createTileStore(f.config);assert.equal(f.calls.length,1);
 const [a,b]=await Promise.all([store.load('100_100'),store.load('100_100')]);assert.equal(a,b);assert.equal(f.calls.length,2);
 assert.deepEqual(a.edges[0],['ab','a','b',1.011,1.001,1200,'Street']);assert.equal(Object.isFrozen(a.edges[0]),true);
 assert.equal(f.calls[1].options.credentials,'omit');assert.equal(f.calls[1].options.redirect,'error');
 store.close();await assert.rejects(store.load('101_100'),{code:'GRAPH_UNAVAILABLE'});assert.equal(store.stats().cachedTiles,0);
});
test('rejects modified bytes, wrong manifest pin and hash-valid invalid topology',async()=>{
 const f=fixture();f.payloads.set('https://example.test/tiles/100_100.json','{}');const s=await createTileStore(f.config);
 await assert.rejects(s.load('100_100'),{code:'GRAPH_INCOMPATIBLE'});
 await assert.rejects(createTileStore({...f.config,manifestSha256:'0'.repeat(64)}),{code:'GRAPH_INCOMPATIBLE'});
 const bad=fixture(t=>{t[0].edges[0][1]='not-resident';});const b=await createTileStore(bad.config);await assert.rejects(b.load('100_100'),{code:'GRAPH_INCOMPATIBLE'});
});
test('bounds streamed bytes and request count and refuses unknown tile without fetching',async()=>{
 const f=fixture(),s=await createTileStore({...f.config,limits:{...f.config.limits,requests:1}});
 await assert.rejects(s.load('999_999'),{code:'GRAPH_INCOMPATIBLE'});assert.equal(f.calls.length,1);
 await assert.rejects(s.load('100_100'),{code:'CALCULATION_FAILED'});assert.equal(f.calls.length,1);
 const big=fixture();big.payloads.set('https://example.test/tiles/100_100.json',' '.repeat(1001));const b=await createTileStore(big.config);await assert.rejects(b.load('100_100'),{code:'GRAPH_INCOMPATIBLE'});
});
test('cache evicts by encoded byte budget and reloads verified data',async()=>{
 const f=fixture(),max=Math.max(...f.manifest.tiles.map(t=>t.bytes));const s=await createTileStore({...f.config,limits:{...f.config.limits,tileBytes:max,cacheBytes:max}});
 await s.load('100_100');await s.load('101_100');assert.equal(s.stats().cachedTiles,1);await s.load('100_100');assert.equal(f.calls.length,4);
});
