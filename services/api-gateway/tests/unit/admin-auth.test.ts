import test from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { admin_auth } from '../../src/middleware/admin-auth.js';
import {password_matches,failed_login_state} from '../../src/modules/auth/login-policy.js';
import { create_app } from '../../src/app.js';
import type { AuthStore, AdminUser } from '../../src/modules/auth/auth-store.js';

const salt = '1234567890abcdef1234567890abcdef';
const options = { username: 'admin', password_hash: `${salt}:${scryptSync('12345', salt, 64).toString('hex')}`, key: 'server-only-key' };
function setup(role: 'admin'|'staff' = 'admin', now=Date.now) {
  const app = express();
  const sessions = new Map<string, AdminUser>();
  const user = { id: 'USR001', username: options.username, password_hash: options.password_hash, role };
  let count=0,retry_at=0,locked=false;
  const store: AuthStore = { login: async(name,password)=>{
    if(name!==user.username)return {kind:'invalid'};
    if(locked)return {kind:'locked'};
    if(retry_at>now())return {kind:'cooldown',retry_after:Math.ceil((retry_at-now())/1000)};
    if(await password_matches(password,user.password_hash)){count=0;retry_at=0;return {kind:'success',user};}
    const state=failed_login_state(count,now());count=state.failed_login_count;retry_at=state.login_retry_at?.getTime()??0;locked=state.login_locked;
    if(locked){sessions.clear();return {kind:'locked'};}
    return state.retry_seconds?{kind:'cooldown',retry_after:state.retry_seconds}:{kind:'invalid'};
  }, find_user: async name => name === user.username ? user : undefined,
    create_session: async (hash, value) => { sessions.set(hash, value); return true; }, find_session: async hash => sessions.get(hash), revoke_session: async hash => { sessions.delete(hash); } };
  app.use('/api/admin', admin_auth(options, store));
  app.get('/api/admin/private', (req, res) => res.json({ authorized: req.get('x-admin-key') === options.key }));
  app.use('/api/admin', (_req, res) => res.json({ok:true}));
  return app;
}
test('login validates credentials, issues HttpOnly cookie, restores session and revokes logout', async () => {
  const app = setup(); const agent = request.agent(app);
  await agent.get('/api/admin/private').set('x-admin-key', options.key).expect(401);
  await agent.post('/api/admin/auth/login').send({ username: 'admin', password: '12345' }).expect(403);
  await agent.post('/api/admin/auth/login').set('x-vinlook-admin', '1').send({ username: 'admin', password: 'wrong' }).expect(401);
  const login = await agent.post('/api/admin/auth/login').set('x-vinlook-admin', '1').send({ username: 'admin', password: '12345' }).expect(200);
  const cookie = String(login.headers['set-cookie']);
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/);
  assert.ok(!JSON.stringify(login.body).includes(options.key));
  const session = await agent.get('/api/admin/auth/session').expect(200); assert.equal(session.body.data.username, 'admin');
  const private_response = await agent.get('/api/admin/private').set('x-admin-key', 'forged-key').expect(200); assert.equal(private_response.body.authorized, true);
  await agent.post('/api/admin/auth/logout').expect(403);
  await agent.post('/api/admin/auth/logout').set('x-vinlook-admin', '1').expect(204);
  await agent.get('/api/admin/private').expect(401);
  await request(app).get('/api/admin/private').set('Cookie', cookie.split(';')[0]!).expect(401);
});

test('staff session exposes role and allows POI tools but denies monitor and user management', async () => {
  const agent=request.agent(setup('staff'));
  const login=await agent.post('/api/admin/auth/login').set('x-vinlook-admin','1').send({username:'admin',password:'12345'}).expect(200);
  assert.equal(login.body.data.role,'staff');
  assert.equal((await agent.get('/api/admin/auth/session')).body.data.role,'staff');
  for(const path of ['/stats','/activity','/pois','/pois/123','/geocode?q=x']) await agent.get(`/api/admin${path}`).expect(200);
  await agent.post('/api/admin/pois/POI001/qr').set('x-vinlook-admin','1').expect(200);
  await agent.put('/api/admin/pois/123').set('x-vinlook-admin','1').send({}).expect(200);
  for(const path of ['/monitor','/users','/users/123','/private']) await agent.get(`/api/admin${path}`).expect(403);
  await agent.post('/api/admin/users').set('x-vinlook-admin','1').send({}).expect(403);
});
test('login applies 30s and 60s cooldowns then permanent account lock without counting blocked retries', async () => {
  let now=100000;const app=setup('admin',()=>now);const agent=request.agent(app);
  const login=(password='wrong')=>agent.post('/api/admin/auth/login').set('x-vinlook-admin','1').send({username:'admin',password});
  await login('12345').expect(200);
  for(let i=1;i<=15;i++){
    const response=await login().expect(i===15?423:i===5||i===10?429:401);
    if(i===5||i===10){const wait=i===5?30:60;assert.equal(Number(response.headers['retry-after']),wait);await login('12345').expect(429);now+=wait*1000-1;await login().expect(429);now++;}
  }
  now+=86400000;await login('12345').expect(423);await agent.get('/api/admin/auth/session').expect(401);
});

test('correct login resets failed counts and unknown accounts do not consume another account allowance',async()=>{
  const app=setup();const login=(username:string,password:string)=>request(app).post('/api/admin/auth/login').set('x-vinlook-admin','1').send({username,password});
  for(let i=0;i<7;i++)await login('missing','wrong').expect(401);
  for(let round=0;round<2;round++){for(let i=0;i<4;i++)await login('admin','wrong').expect(401);await login('admin','12345').expect(200);}
});

test('gateway guards all admin endpoints even when caller supplies a shared key', async () => {
  const app = create_app();
  for (const path of ['/stats', '/pois', '/monitor', '/activity', '/geocode?q=address']) {
    await request(app).get(`/api/admin${path}`).set('x-admin-key', options.key).expect(401);
  }
});
