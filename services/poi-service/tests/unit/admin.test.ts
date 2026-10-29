import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { admin_routes } from '../../src/modules/admin/admin.routes.js';
import type { AdminRepository, AdminPoi } from '../../src/modules/admin/admin.repository.js';
import { decode_admin_image } from '../../src/modules/admin/admin.schema.js';

const input = { name:'Điểm thử',slug:'diem-thu',description:'Nội dung gốc',address:'TP.HCM',latitude:10.77,longitude:106.7,category:'history' as const,source_language:'vi' as const,is_published:false };
function setup() {
  let poi: AdminPoi | undefined; let conflict = false; let writes = 0;
  const repository: AdminRepository = {
    stats: async () => ({ total:poi?1:0,published:0,drafts:poi?1:0,with_images:0,categories:[] }),
    list: async query => ({ data:poi?[poi]:[],pagination:{total:poi?1:0,page:query.page,limit:query.limit} }),
    find: async () => poi,
    save: async (id, value) => { writes++; if(conflict)return false; poi={...value,id,source_language:value.source_language,image_url:null,image_credit:null,image_source_url:null,image_license_url:null,updated_at:'2026-10-28T00:00:00.000Z'};return true; },
  };
  const app=express();app.use('/admin',admin_routes(repository,'test-admin-key'));
  return {app,repository,writes:()=>writes,conflict:()=>{conflict=true;}};
}
test('admin API requires its server key and does not expose records anonymously',async()=>{
  const f=setup();await request(f.app).get('/admin/pois').expect(401);
  await request(f.app).post('/admin/pois').send(input).expect(401);assert.equal(f.writes(),0);
  const app=express();app.use('/admin',admin_routes(f.repository,''));await request(app).get('/admin/stats').expect(503);
});
test('admin creates drafts, validates updates and reports optimistic conflicts',async()=>{
  const f=setup();const created=await request(f.app).post('/admin/pois').set('x-admin-key','test-admin-key').send(input).expect(201);
  assert.equal(created.body.data.is_published,false);assert.match(created.body.data.id,/^[a-f0-9-]{36}$/);
  const url=`/admin/pois/${created.body.data.id}`;
  await request(f.app).put(url).set('x-admin-key','test-admin-key').send(input).expect(400);
  await request(f.app).put(url).set('x-admin-key','test-admin-key').send({...input,updated_at:created.body.data.updated_at,is_published:true}).expect(200);
  f.conflict();await request(f.app).put(url).set('x-admin-key','test-admin-key').send({...input,updated_at:created.body.data.updated_at}).expect(409);
  await request(f.app).get('/admin/pois?status=draft&q=thử').set('x-admin-key','test-admin-key').expect(200);
  await request(f.app).get('/admin/pois?page=-1').set('x-admin-key','test-admin-key').expect(400);
});
test('invalid coordinates, unknown fields and falsely declared image types never reach SQL',async()=>{
  const f=setup();const post=(body:unknown)=>request(f.app).post('/admin/pois').set('x-admin-key','test-admin-key').send(body);
  await post({...input,latitude:91}).expect(400);await post({...input,admin:true}).expect(400);
  await post({...input,image_credit:'Tester',image:{content_type:'image/png',base64:Buffer.from('not a real PNG file').toString('base64')}}).expect(400);
  await post({...input,image_source_url:'javascript:alert(1)'}).expect(400);assert.equal(f.writes(),0);
  assert.throws(()=>decode_admin_image({...input,image:{content_type:'image/jpeg',base64:'AAAA'}}),/IMAGE_CREDIT_REQUIRED/);
});

test('address lookup is protected, validates input and returns provider candidates', async () => {
  const f = setup(); let calls = 0;
  const app = express();
  app.use('/admin', admin_routes(f.repository, 'test-admin-key', async address => {
    calls++; assert.equal(address, 'Chợ Bến Thành');
    return [{ label: address, latitude: 10.772, longitude: 106.698 }];
  }));
  await request(app).get('/admin/geocode?q=hello').expect(401);
  await request(app).get('/admin/geocode?q=x').set('x-admin-key', 'test-admin-key').expect(400);
  const response = await request(app).get('/admin/geocode').query({ q: 'Chợ Bến Thành' }).set('x-admin-key', 'test-admin-key').expect(200);
  assert.equal(response.body.data[0].latitude, 10.772); assert.equal(calls, 1); assert.equal(f.writes(), 0);
});
