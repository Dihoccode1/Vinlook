import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createReadiness as identityProbe} from '../../identity/src/readiness.js';
import {createReadiness as contentProbe} from '../../content/src/readiness.js';
import {createApp as identityApp} from '../../identity/src/app.js';
import {createApp as contentApp} from '../../content/src/app.js';
for(const [name,createReadiness,createApp] of [['Identity',identityProbe,identityApp],['Content',contentProbe,contentApp]]){
  test(`${name} checks writable replica set, deduplicates probes and fails closed`,async()=>{
    let calls=0,primary=true,broken=false;
    const connection={readyState:1,db:{command:async()=>{calls++;if(broken)throw Error('private URI');},
      admin:()=>({command:async()=>({isWritablePrimary:primary,setName:'synthetic'})})}};
    const ready=createReadiness(connection);
    const a=ready(),b=ready();assert.equal(a,b);assert.equal(await a,true);assert.equal(calls,1);
    primary=false;assert.equal(await ready(),false);primary=true;broken=true;assert.equal(await ready(),false);
    connection.readyState=0;assert.equal(await ready(),false);
  });
  test(`${name} health returns200 only for verified runtime; errors stay redacted`,async t=>{
    let available=true;
    const runtime={ready:async()=>{if(!available)throw Error('private URI');return true;},
      config:{proxyCidrs:[],origins:[]},models:{},origins:[],now:Date.now};
    const server=createApp(runtime).listen(0,'127.0.0.1');await once(server,'listening');
    t.after(()=>new Promise(resolve=>server.close(resolve)));
    const url=`http://127.0.0.1:${server.address().port}/health/ready`;
    const response=await fetch(url);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual((await response.json()).data,{status:'ready'});
    available=false;const failed=await fetch(url);assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('private'));
  });
}
