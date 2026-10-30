import test from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { admin_auth } from '../../src/admin-auth.js';
import { create_app } from '../../src/app.js';
import type { AuthStore, AdminUser } from '../../src/auth-store.js';

const salt = '1234567890abcdef1234567890abcdef';
const options = { username: 'admin', password_hash: `${salt}:${scryptSync('12345', salt, 64).toString('hex')}`, key: 'server-only-key' };
function setup(role: 'admin'|'staff' = 'admin') {
  const app = express();
  const sessions = new Map<string, AdminUser>();
  const user = { id: 'POI001', username: options.username, password_hash: options.password_hash, role };
  const store: AuthStore = { find_user: async name => name === user.username ? user : undefined,
    create_session: async (hash, value) => { sessions.set(hash, value); }, find_session: async hash => sessions.get(hash), revoke_session: async hash => { sessions.delete(hash); } };
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
test('login limits repeated password guesses', async () => {
  const app = setup();
  for (let i = 0; i < 5; i++) await request(app).post('/api/admin/auth/login').set('x-vinlook-admin', '1').send({ username: 'admin', password: 'wrong' }).expect(401);
  const response = await request(app).post('/api/admin/auth/login').set('x-vinlook-admin', '1').send({ username: 'admin', password: '12345' }).expect(429);
  assert.ok(Number(response.headers['retry-after']) > 0);
});
test('gateway guards all admin endpoints even when caller supplies a shared key', async () => {
  const app = create_app();
  for (const path of ['/stats', '/pois', '/monitor', '/activity', '/geocode?q=address']) {
    await request(app).get(`/api/admin${path}`).set('x-admin-key', options.key).expect(401);
  }
});
