import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appendPage,publicMapStyle,formatTime} from '../../apps/web/src/tourist/catalog.js';
import {touristCopy} from '../../apps/web/src/tourist/copy.js';
import {localeCodes} from '../../apps/web/src/i18n/locales.js';
test('pagination refuses mixed snapshots and duplicate identities',()=>{
 const page={items:[{id:'one'}],snapshotId:'same',nextCursor:'cursor'};
 assert.deepEqual(appendPage(page,{items:[{id:'two'}],snapshotId:'same',nextCursor:null}).items,[{id:'one'},{id:'two'}]);
 assert.throws(()=>appendPage(page,{items:[{id:'two'}],snapshotId:'changed'}),e=>e.code==='CATALOG_CHANGED');
 assert.throws(()=>appendPage(page,{items:[{id:'one'}],snapshotId:'same'}),e=>e.code==='INVALID_RESPONSE');
});
test('map config permits explicit HTTPS or local dev only, no credentials or implicit source',()=>{
 assert.equal(publicMapStyle(),null);assert.equal(publicMapStyle('https://maps.example/style.json'),'https://maps.example/style.json');
 assert.equal(publicMapStyle('http://127.0.0.1:5176/style.json',{development:true}),'http://127.0.0.1:5176/style.json');
 for(const u of ['javascript:alert(1)','http://maps.example/style.json','https://user:password@maps.example/a','http://127.0.0.1/a','https://maps.example/a#secret'])assert.throws(()=>publicMapStyle(u),e=>e.code==='INVALID_MAP_STYLE');
});
test('tourist draft copy has all UI keys for each approved locale; timing handles unavailable values',()=>{
 for(const code of localeCodes){const copy=touristCopy(code);assert.equal(Object.keys(copy).length,12);assert.ok(Object.values(copy).every(x=>typeof x==='string'&&x.trim()));}
 assert.equal(formatTime(125.184),'2:05');assert.equal(formatTime(NaN),'0:00');assert.equal(formatTime(-1),'0:00');
});
