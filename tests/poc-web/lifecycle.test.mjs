import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserIdentity} from '../../apps/web/src/tourist/browser-identity.js';
import {createTelemetry} from '../../apps/web/src/tourist/telemetry.js';
import {createPlayer} from '../../apps/web/src/tourist/player.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function storage(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};}
test('simultaneous first-use tabs share one UUID; another browser gets a separate identity',async()=>{
  let chain=Promise.resolve(),n=0;
  const locks={request:(_name,fn)=>{const operation=chain.then(fn);chain=operation.catch(()=>{});return operation;}};
  const shared=storage();const make=store=>createBrowserIdentity({storage:store,locks,uuid:()=>uuid(++n)});
  const [a,b,c]=await Promise.all([make(shared)(),make(shared)(),make(storage())()]);
  assert.equal(a.browserId,b.browserId);assert.notEqual(a.browserId,c.browserId);assert.equal(a.quality,'shared');
});
test('coordination/storage unavailable uses stable memory fallback and never blocks tourism',async()=>{
  const store=storage();let n=0;
  const init=createBrowserIdentity({storage:store,uuid:()=>uuid(++n)});
  assert.deepEqual(await init(),await init());assert.equal((await init()).quality,'best-effort');
  const denied=createBrowserIdentity({storage:{getItem(){throw Error('denied');}},uuid:()=>uuid(++n)});
  assert.equal((await denied()).reason,'storage-unavailable');
});
function setup(){
  const events=[];let active=true,interval,n=0;
  const usage=Object.fromEntries(['presence','start','heartbeat','end'].map(name=>[name,async(...args)=>events.push([name,...args])]));
  const telemetry=createTelemetry({usage,identity:async()=>({browserId:uuid(100)}),online:()=>active,uuid:()=>uuid(++n),
    schedule:(fn,ms)=>{assert.equal(ms,30000);interval=fn;return 1;},cancel:()=>{interval=null;}});
  return {events,telemetry,tick:()=>interval?.(),online:value=>{active=value;if(!value)telemetry.offline();}};
}
test('start/replaced captures distinct playback; pause keeps heartbeat; close/unload end only current',async()=>{
  const s=setup();s.telemetry.mount();const first=s.telemetry.start('poi-a','en');
  s.tick();const second=s.telemetry.start('poi-b','vi');await flush();
  assert.notEqual(first,second);
  assert.deepEqual(s.events.filter(e=>e[0]==='start').map(e=>e.slice(2)),[[first,'poi-a','en'],[second,'poi-b','vi']]);
  assert.ok(s.events.some(e=>e[0]==='end'&&e[2]===first&&e[3]==='replaced'));
  s.telemetry.dispose();await flush();assert.ok(s.events.some(e=>e[0]==='end'&&e[2]===second&&e[3]==='page_closed'));
  const count=s.events.length;s.tick();s.telemetry.start('poi-c','en');await flush();assert.equal(s.events.length,count);
});
test('offline events are dropped, reconnect only admits currently active playback',async()=>{
  const s=setup();s.telemetry.mount();await flush();s.online(false);
  s.telemetry.start('old','ja');s.tick();s.telemetry.end('closed');s.telemetry.start('current','en');await flush();
  const before=s.events.length;s.online(true);s.telemetry.reconnect();await flush();
  const fresh=s.events.slice(before);assert.equal(fresh.some(e=>e.includes('old')),false);assert.ok(fresh.some(e=>e[0]==='start'&&e.includes('current')));
});
test('telemetry rejected promises/synchronous errors cannot escape into the player',async()=>{
  const telemetry=createTelemetry({usage:{start(){throw Error('unavailable');},end:async()=>{throw Error('unavailable');}},identity:async()=>({browserId:uuid(1)}),online:()=>true,uuid:()=>uuid(2)});
  assert.doesNotThrow(()=>telemetry.start('poi','en'));telemetry.end('closed');await flush();
});
class Media extends EventTarget {
  calls=[];src='';
  pause(){this.calls.push('pause');}load(){}removeAttribute(){this.src='';}
  async play(){this.calls.push('play');if(this.reject)throw Error('autoplay rejected');}
}
test('no autoplay, pause/resume same playback, locale stop requires a new Play and closes old audio',async()=>{
  const s=setup(),media=new Media(),states=[];
  const player=createPlayer({media,telemetry:s.telemetry,onChange:s=>states.push(s.state)});
  const poi={id:'poi',languageCode:'ja',audio:{url:'https://fixture.example.test/ja.mp3'}};
  assert.deepEqual(media.calls,[]);await player.play(poi);player.pause();s.tick();await player.play(poi);await flush();
  assert.equal(s.events.filter(e=>e[0]==='start').length,1);
  player.localeChanged('en');await flush();assert.equal(states.at(-1),'idle');
  assert.equal(s.events.filter(e=>e[0]==='end').length,1);assert.equal(media.calls.filter(c=>c==='play').length,2);
  media.reject=true;await player.play({...poi,languageCode:'en'});await flush();assert.equal(states.at(-1),'error');
  player.dispose();
});
