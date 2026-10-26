import test from 'node:test';
import assert from 'node:assert/strict';
import {routingConfig} from '../../../apps/web/src/navigation/runtime.js';
test('directions stay unconfigured until a complete pinned HTTPS source is supplied',()=>{
 assert.equal(routingConfig({}),null);
 const good={VITE_ROUTING_MANIFEST_URL:'https://example.test/routing/v1/manifest.json',VITE_ROUTING_MANIFEST_SHA256:'a'.repeat(64),VITE_ROUTING_GRAPH_VERSION:'v1'};
 assert.equal(routingConfig(good).graphVersion,'v1');
 assert.throws(()=>routingConfig({...good,VITE_ROUTING_MANIFEST_SHA256:undefined}));
 assert.throws(()=>routingConfig({...good,VITE_ROUTING_MANIFEST_URL:'https://user:secret@example.test/manifest.json'}));
 assert.throws(()=>routingConfig({...good,VITE_ROUTING_MANIFEST_URL:'http://example.test/manifest.json'}));
});
