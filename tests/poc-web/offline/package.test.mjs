import {test} from 'node:test';import assert from 'node:assert/strict';import {createPackageStore,sha256} from '../../../apps/web/src/offline/package-store.js';
const bytes=new TextEncoder().encode('LABELLED SYNTHETIC PACKAGE BYTES').buffer;
async function fixture(){const files=new Map();let active=null,marked=new Set();const file={id:'fixture-shell',byteLength:bytes.byteLength,sha256:await sha256(bytes)};
  const descriptor=version=>({packageVersion:version,files:[file],provenance:'fixture'});
  const storage={active:async()=>active,file:async(v,id)=>files.get(v+id),putFile:async(v,id,b)=>files.set(v+id,b),activate:async d=>{active=d;}};
  const shell={prepare:async()=>{},markReady:async v=>marked.add(v),isReady:async v=>marked.has(v)};
  return {files,descriptor,storage,shell};}
test('verified candidate activates; checksum/network/marker failure keeps old; reopen detects eviction',async()=>{
  const f=await fixture();let fail=false,marker=false;
  const store=createPackageStore({...f,manifestAdapter:async value=>value,fetchFile:async()=>{if(fail)throw Error('network');return bytes;}});
  await store.download(f.descriptor('old'));assert.equal((await store.reopen()).status,'ready');
  fail=true;await assert.rejects(store.download(f.descriptor('new')));assert.equal((await f.storage.active()).packageVersion,'old');
  fail=false;await assert.rejects(store.download({...f.descriptor('bad'),files:[{...f.descriptor('bad').files[0],sha256:'0'.repeat(64)}]}),{code:'CHECKSUM_MISMATCH'});
  f.shell.isReady=async v=>v==='old';await assert.rejects(store.download(f.descriptor('marker')),{code:'SHELL_INCOMPLETE'});assert.equal((await f.storage.active()).packageVersion,'old');
  f.files.clear();assert.equal((await store.reopen()).status,'incomplete');
});
test('quota and unapproved manifest fail closed; complete withdrawal only; no cleanup old data',async()=>{
  const f=await fixture();const pending=createPackageStore({...f,fetchFile:async()=>bytes});await assert.rejects(pending.download(f.descriptor('a')),{code:'MANIFEST_REVIEW_PENDING'});
  const store=createPackageStore({...f,manifestAdapter:async d=>d,fetchFile:async()=>bytes,estimate:async()=>({quota:10,usage:0})});await assert.rejects(store.download(f.descriptor('a')),{code:'QUOTA_INSUFFICIENT'});
  let hidden=[];await assert.rejects(store.withdraw({complete:false,poiIds:[]},ids=>hidden=ids),{code:'WITHDRAWAL_INCOMPLETE'});assert.deepEqual(hidden,[]);
  await store.withdraw({complete:true,snapshotId:'fixture',poiIds:['000000000000000000000001']},ids=>hidden=ids);assert.equal(hidden.length,1);
});

test('browser estimate/persistence refusal and broken UI callbacks do not prevent verified activation',async()=>{
  const f=await fixture(),changes=[];
  const store=createPackageStore({...f,manifestAdapter:async d=>d,fetchFile:async()=>bytes,estimate:async()=>{throw Error();},persist:async()=>{throw Error();},onChange(){throw Error('render');}});
  const unsubscribe=store.subscribe(()=>changes.push(store.getSnapshot()));store.subscribe(()=>{throw Error('listener');});
  await store.download(f.descriptor('optional-hints'));assert.equal(store.getSnapshot().status,'ready');
  assert.equal(changes[0].persistent,false);assert.equal(changes.at(-1).verifiedBytes,bytes.byteLength);
  assert.equal((await store.reopen()).status,'ready');unsubscribe();
});

test('corrupt active metadata cannot be Ready and reopening storage errors fail safely',async()=>{
  const f=await fixture();f.shell.isReady=async()=>true;
  for(const value of [{packageVersion:'bad',files:[]},{packageVersion:'',files:f.descriptor('a').files},{packageVersion:'bad',files:[null]}]){
    await f.storage.activate(value);const store=createPackageStore({...f,manifestAdapter:async d=>d,fetchFile:async()=>bytes});
    assert.equal((await store.reopen()).status,'incomplete');assert.equal(store.getSnapshot().error,'LOCAL_DATA_MISSING');
  }
  f.storage.active=async()=>{throw Error('IDB unavailable');};
  const store=createPackageStore({...f});assert.equal((await store.reopen()).status,'incomplete');
});

test('verified bytes are monotonic and concurrent reopen cannot overwrite an active download',async()=>{
  const f=await fixture();let resolve;
  const store=createPackageStore({...f,manifestAdapter:async d=>d,fetchFile:()=>new Promise(done=>resolve=done)});
  const pending=store.download(f.descriptor('progress'));await new Promise(done=>setImmediate(done));
  assert.equal(store.getSnapshot().status,'downloading');assert.equal(store.getSnapshot().verifiedBytes,0);
  await assert.rejects(store.reopen(),{code:'DOWNLOAD_IN_PROGRESS'});resolve(bytes);await pending;
  assert.equal(store.getSnapshot().verifiedBytes,bytes.byteLength);assert.equal(store.getSnapshot().status,'ready');
});
