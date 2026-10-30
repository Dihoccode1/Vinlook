import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {create_app} from '../../src/app.js';
import {qr_routes} from '../../src/modules/admin/qr.routes.js';
import type {PoiRepository} from '../../src/modules/pois/poi.repository.js';
import {qr_link,default_public_url} from '../../../../apps/admin-web/src/qr-link.js';

test('public QR lookup validates tokens and returns the selected published POI',async()=>{
  const token='a'.repeat(32);let lookups=0;
  const poi={id:'POI001',name:'QR destination'};
  const repository={find:async()=>poi} as unknown as PoiRepository;
  const app=create_app(repository,{ensure:async()=>undefined,resolve:async t=>{lookups++;return t===token?'POI001':undefined;}});
  await request(app).get('/pois/qr/bad').expect(400);assert.equal(lookups,0);
  const result=await request(app).get('/pois/qr/'+token).expect(200);assert.equal(result.body.data.id,'POI001');
  await request(app).get('/pois/qr/'+'b'.repeat(32)).expect(404);
  const blocked=await request(app).post('/admin/pois/POI001/qr');assert.ok([401,503].includes(blocked.status));
});
test('admin QR creation validates POI codes and exposes a stable QR path',async()=>{
  const app=express();app.use(qr_routes({resolve:async()=>undefined,ensure:async id=>id==='POI001'?{poi_id:id,qr_token:'a'.repeat(32),qr_image_url:null,created_at:new Date(),updated_at:new Date()}:undefined}));
  await request(app).post('/pois/bad/qr').expect(400);
  await request(app).post('/pois/POI999/qr').expect(404);
  const result=await request(app).post('/pois/POI001/qr').expect(200);
  assert.equal(result.body.data.qr_path,'/qr/'+'a'.repeat(32));
});
test('QR links use the public map origin and reject executable or ambiguous base URLs',()=>{
  const token='a'.repeat(32);
  assert.equal(qr_link('https://vinlook.example',token),'https://vinlook.example/qr/'+token);
  assert.equal(default_public_url('http://127.0.0.1:5174'),'http://127.0.0.1:5173');
  assert.equal(default_public_url('https://admin.example','https://map.example'),'https://map.example');
  for(const base of ['javascript:alert(1)','https://u:p@example.com','https://example.com/path','https://example.com/?q=1'])assert.throws(()=>qr_link(base,token));
});
