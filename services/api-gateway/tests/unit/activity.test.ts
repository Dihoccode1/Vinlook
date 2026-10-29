import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { activity_routes, create_activity_tracker } from '../../src/activity.js';

const id='11111111-1111-4111-8111-111111111111';
test('activity counts sessions and playback once, expires stale sessions and ignores out-of-order updates',()=>{
  let clock=0;const tracker=create_activity_tracker(()=>clock);
  tracker.heartbeat({id,sequence:1,active:true,listening:false});
  tracker.heartbeat({id,sequence:2,active:true,listening:true});
  assert.deepEqual(tracker.snapshot(),{visitors:1,listeners:1});
  tracker.heartbeat({id,sequence:3,active:false,listening:false});
  tracker.heartbeat({id,sequence:2,active:true,listening:true});
  assert.deepEqual(tracker.snapshot(),{visitors:0,listeners:0});
  tracker.heartbeat({id,sequence:4,active:true,listening:true});clock=45001;
  assert.deepEqual(tracker.snapshot(),{visitors:0,listeners:0});
});
test('heartbeat accepts only anonymous session state and admin counters require a key',async()=>{
  const app=express();app.use('/api',activity_routes('admin-key'));
  await request(app).get('/api/admin/activity').expect(401);
  await request(app).post('/api/activity/heartbeat').send({id,sequence:1,active:true,listening:true}).expect(204);
  const result=await request(app).get('/api/admin/activity').set('x-admin-key','admin-key').expect(200);
  assert.deepEqual(result.body.data,{visitors:1,listeners:1});assert.equal(result.headers['cache-control'],'no-store');
  await request(app).post('/api/activity/heartbeat').send({id,sequence:2,active:true,listening:true,latitude:10}).expect(400);
  await request(app).post('/api/activity/heartbeat').send({id:'invalid',sequence:2,active:true,listening:true}).expect(400);
});
