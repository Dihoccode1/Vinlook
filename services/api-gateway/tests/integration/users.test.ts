import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,scryptSync} from 'node:crypto';
import sql from 'mssql';
import request from 'supertest';
import {create_app} from '../../src/app.js';
import {auth_pool} from '../../src/auth-store.js';

test('SQL-backed account creation, roles, password reset, locking and session revocation',async()=>{
  const pool=await auth_pool();const admin_id=randomUUID();const suffix=randomUUID().slice(0,8);const username=`test_admin_${suffix}`,staffname=`test_staff_${suffix}`;
  const salt=randomUUID();const hash=`${salt}:${scryptSync('test12345',salt,64).toString('hex')}`;
  let staff_id:string|undefined;
  try {
    await pool.request().input('id',sql.UniqueIdentifier,admin_id).input('name',sql.NVarChar(100),username).input('hash',sql.VarChar(200),hash).query("INSERT INTO dbo.users(id,username,password_hash,full_name,role,status) VALUES(@id,@name,@hash,N'Test Admin','admin','active')");
    const app=create_app();const admin=request.agent(app),staff=request.agent(app);
    const login=(agent:ReturnType<typeof request.agent>,name:string,password:string)=>agent.post('/api/admin/auth/login').set('x-vinlook-admin','1').send({username:name,password});
    await login(admin,username,'test12345').expect(200);
    const body={username:staffname,full_name:'Test Staff',role:'staff',status:'active',password:'test12345'};
    const created=await admin.post('/api/admin/users').set('x-vinlook-admin','1').send(body).expect(201);staff_id=created.body.data.id;
    await admin.post('/api/admin/users').set('x-vinlook-admin','1').send(body).expect(409);
    const listed=await admin.get('/api/admin/users').expect(200);assert.ok(listed.body.data.some((u:{id:string})=>u.id===staff_id));assert.ok(!JSON.stringify(listed.body).includes(hash));
    await login(staff,staffname,'test12345').expect(200);
    await staff.get('/api/admin/stats').expect(200);await staff.get('/api/admin/pois').expect(200);
    await staff.get('/api/admin/monitor').expect(403);await staff.get('/api/admin/users').expect(403);
    await admin.put(`/api/admin/users/${admin_id.toUpperCase()}`).set('x-vinlook-admin','1').send({...body,username,role:'staff'}).expect(409);
    await staff.patch(`/api/admin/users/${admin_id}/status`).set('x-vinlook-admin','1').send({status:'disabled'}).expect(403);
    await admin.patch(`/api/admin/users/${staff_id}/status`).send({status:'disabled'}).expect(403);
    await admin.patch(`/api/admin/users/${staff_id}/status`).set('x-vinlook-admin','1').send({status:'invalid'}).expect(400);
    await admin.patch(`/api/admin/users/${randomUUID()}/status`).set('x-vinlook-admin','1').send({status:'disabled'}).expect(404);
    await admin.patch(`/api/admin/users/${staff_id}/status`).set('x-vinlook-admin','1').send({status:'disabled',role:'admin',password:'ignored'}).expect(200);
    await staff.get('/api/admin/auth/session').expect(401);await login(staff,staffname,'test12345').expect(401);
    const locked=(await admin.get('/api/admin/users')).body.data.find((u:{id:string})=>u.id===staff_id);assert.equal(locked.role,'staff');assert.equal(locked.status,'disabled');
    await admin.patch(`/api/admin/users/${staff_id}/status`).set('x-vinlook-admin','1').send({status:'active'}).expect(200);
    await login(staff,staffname,'test12345').expect(200);
    await admin.put(`/api/admin/users/${staff_id}`).set('x-vinlook-admin','1').send({...body,role:'admin',password:'changed123'}).expect(200);
    await login(staff,staffname,'test12345').expect(401);await login(staff,staffname,'changed123').expect(200);
    await staff.get('/api/admin/users').expect(200);
    // Admins cannot lock one another using either endpoint or by demoting first.
    await staff.patch(`/api/admin/users/${admin_id}/status`).set('x-vinlook-admin','1').send({status:'disabled'}).expect(403);
    const admin_body={username,full_name:'Test Admin',role:'admin',status:'active'};
    await staff.put(`/api/admin/users/${admin_id}`).set('x-vinlook-admin','1').send({...admin_body,status:'disabled'}).expect(403);
    await staff.put(`/api/admin/users/${admin_id}`).set('x-vinlook-admin','1').send({...admin_body,role:'staff'}).expect(403);
    await admin.patch(`/api/admin/users/${staff_id}/status`).set('x-vinlook-admin','1').send({status:'disabled'}).expect(403);
    // Self-lock revokes the current session; another admin may unlock it.
    await admin.patch(`/api/admin/users/${admin_id.toUpperCase()}/status`).set('x-vinlook-admin','1').send({status:'disabled'}).expect(200);
    await admin.get('/api/admin/auth/session').expect(401);
    await login(admin,username,'test12345').expect(401);
    await staff.patch(`/api/admin/users/${admin_id}/status`).set('x-vinlook-admin','1').send({status:'active'}).expect(200);
    await login(admin,username,'test12345').expect(200);
    await admin.put(`/api/admin/users/${admin_id}`).set('x-vinlook-admin','1').send({...admin_body,status:'disabled'}).expect(200);
    await admin.get('/api/admin/auth/session').expect(401);
  } finally {
    await pool.request().input('admin',sql.UniqueIdentifier,admin_id).input('staff',sql.UniqueIdentifier,staff_id??null).query('DELETE FROM dbo.admin_sessions WHERE user_id IN (@admin,@staff); DELETE FROM dbo.system_logs WHERE user_id IN (@admin,@staff); DELETE FROM dbo.users WHERE id IN (@admin,@staff)');
    await pool.close();
  }
});
