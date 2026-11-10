import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,scryptSync} from 'node:crypto';
import sql from 'mssql';
import request from 'supertest';
import {create_app} from '../../src/app.js';
import {auth_pool} from '../../src/modules/auth/auth-store.js';

test('SQL-backed account creation, roles, password reset, locking and session revocation',async()=>{
  const pool=await auth_pool();const admin_id=('USR'+BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString());const suffix=('USR'+BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString()).slice(0,8);const username=`test_admin_${suffix}`,staffname=`test_staff_${suffix}`;
  const salt=('USR'+BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString());const hash=`${salt}:${scryptSync('test12345',salt,64).toString('hex')}`;
  let staff_id:string|undefined;
  try {
    await pool.request().input('id',sql.VarChar(36),admin_id).input('name',sql.NVarChar(100),username).input('hash',sql.VarChar(200),hash).query("INSERT INTO dbo.users(id,username,password_hash,full_name,role,status) VALUES(@id,@name,@hash,N'Test Admin','admin','active')");
    const app=create_app();const admin=request.agent(app),staff=request.agent(app);
    const login=(agent:ReturnType<typeof request.agent>,name:string,password:string)=>agent.post('/api/admin/auth/login').set('x-vinlook-admin','1').send({username:name,password});
    await login(admin,username,'test12345').expect(200);
    const body={username:staffname,full_name:'Test Staff',role:'staff',status:'active',password:'test12345'};
    const created=await admin.post('/api/admin/users').set('x-vinlook-admin','1').send(body).expect(201);staff_id=created.body.data.id;
    await admin.post('/api/admin/users').set('x-vinlook-admin','1').send(body).expect(409);
    const listed=await admin.get('/api/admin/users').expect(200);assert.ok(listed.body.data.some((u:{id:string})=>u.id===staff_id));assert.ok(!JSON.stringify(listed.body).includes(hash));
    const root=listed.body.data.find((u:{username:string})=>u.username.toLowerCase()==='admin');
    assert.ok(root,'Seeded root admin must exist');
    await admin.patch(`/api/admin/users/${root.id}/status`).set('x-vinlook-admin','1').send({status:'disabled'}).expect(403);
    for(const change of [{status:'disabled'},{role:'staff'},{username:'renamed_root'}]) {
      await admin.put(`/api/admin/users/${root.id}`).set('x-vinlook-admin','1').send({username:root.username,full_name:root.full_name,role:root.role,status:root.status,...change}).expect(403);
    }
    assert.equal((await admin.get('/api/admin/users')).body.data.find((u:{id:string})=>u.id===root.id).status,root.status);
    await login(staff,staffname,'test12345').expect(200);
    await staff.get('/api/admin/stats').expect(200);await staff.get('/api/admin/pois').expect(200);
    await staff.get('/api/admin/monitor').expect(403);await staff.get('/api/admin/users').expect(403);
    await admin.put(`/api/admin/users/${admin_id.toUpperCase()}`).set('x-vinlook-admin','1').send({...body,username,role:'staff'}).expect(409);
    await staff.patch(`/api/admin/users/${admin_id}/status`).set('x-vinlook-admin','1').send({status:'disabled'}).expect(403);
    await staff.patch(`/api/admin/users/${admin_id}/status`).set('x-vinlook-admin','1').send({status:'active'}).expect(403);
    await admin.patch(`/api/admin/users/${staff_id}/status`).send({status:'disabled'}).expect(403);
    await admin.patch(`/api/admin/users/${staff_id}/status`).set('x-vinlook-admin','1').send({status:'invalid'}).expect(400);
    await admin.patch(`/api/admin/users/${('USR'+BigInt('0x'+randomUUID().replaceAll('-','').slice(0,12)).toString())}/status`).set('x-vinlook-admin','1').send({status:'disabled'}).expect(404);
    await admin.patch(`/api/admin/users/${staff_id}/status`).set('x-vinlook-admin','1').send({status:'disabled',role:'admin',password:'ignored'}).expect(200);
    await staff.get('/api/admin/auth/session').expect(401);await login(staff,staffname,'test12345').expect(401);
    const locked=(await admin.get('/api/admin/users')).body.data.find((u:{id:string})=>u.id===staff_id);assert.equal(locked.role,'staff');assert.equal(locked.status,'disabled');
    await admin.patch(`/api/admin/users/${staff_id}/status`).set('x-vinlook-admin','1').send({status:'active'}).expect(200);
    await login(staff,staffname,'test12345').expect(200);
    await admin.put(`/api/admin/users/${staff_id}`).set('x-vinlook-admin','1').send({...body,role:'admin',password:'changed123'}).expect(200);
    await login(staff,staffname,'test12345').expect(401);await login(staff,staffname,'changed123').expect(200);
    await staff.get('/api/admin/users').expect(200);
    // Admins can lock/unlock one another; each lock revokes existing sessions.
    for(let cycle=0;cycle<2;cycle++) {
      await staff.patch(`/api/admin/users/${admin_id}/status`).set('x-vinlook-admin','1').send({status:'disabled'}).expect(200);
      await admin.get('/api/admin/auth/session').expect(401);
      assert.equal((await staff.get('/api/admin/users')).body.data.find((u:{id:string})=>u.id===admin_id).status,'disabled');
      await staff.patch(`/api/admin/users/${admin_id}/status`).set('x-vinlook-admin','1').send({status:'active'}).expect(200);
      assert.equal((await staff.get('/api/admin/users')).body.data.find((u:{id:string})=>u.id===admin_id).status,'active');
      await admin.get('/api/admin/auth/session').expect(401);
      await login(admin,username,'test12345').expect(200);
    }
    const admin_body={username,full_name:'Test Admin',role:'admin',status:'active'};
    for (const change of [{}, {username:username+'_changed'}, {full_name:'Changed name'}, {password:'hacked123'}]) {
      await staff.put(`/api/admin/users/${admin_id}`).set('x-vinlook-admin','1').send({...admin_body,...change}).expect(403);
    }
    await staff.patch(`/api/admin/users/${admin_id}/status`).set('x-vinlook-admin','1').send({status:'active'}).expect(200);
    await admin.get('/api/admin/auth/session').expect(200);
    const unchanged=(await staff.get('/api/admin/users')).body.data.find((u:{id:string})=>u.id===admin_id);
    assert.equal(unchanged.username,username);assert.equal(unchanged.full_name,'Test Admin');
    await staff.put(`/api/admin/users/${admin_id}`).set('x-vinlook-admin','1').send({...admin_body,status:'disabled'}).expect(403);
    await staff.put(`/api/admin/users/${admin_id}`).set('x-vinlook-admin','1').send({...admin_body,role:'staff'}).expect(403);
    // Self-lock revokes the session; another admin can recover a manually locked account.
    for(let attempt=0;attempt<4;attempt++)await login(request.agent(app),username,'wrong').expect(401);
    await admin.patch(`/api/admin/users/${admin_id.toUpperCase()}/status`).set('x-vinlook-admin','1').send({status:'disabled'}).expect(200);
    await admin.get('/api/admin/auth/session').expect(401);
    await login(admin,username,'test12345').expect(401);
    await staff.put(`/api/admin/users/${admin_id}`).set('x-vinlook-admin','1').send(admin_body).expect(403);
    await staff.patch(`/api/admin/users/${admin_id}/status`).set('x-vinlook-admin','1').send({status:'active'}).expect(200);
    const recovered=(await staff.get('/api/admin/users')).body.data.find((u:{id:string})=>u.id===admin_id);
    assert.equal(recovered.status,'active');assert.equal(recovered.login_locked,false);
    assert.equal(recovered.username,username);assert.equal(recovered.full_name,'Test Admin');assert.equal(recovered.role,'admin');
    const counters=(await pool.request().input('id',sql.VarChar(36),admin_id).query('SELECT failed_login_count,login_retry_at,login_locked FROM dbo.users WHERE id=@id')).recordset[0];
    assert.deepEqual(counters,{failed_login_count:0,login_retry_at:null,login_locked:false});
    // Opening the account does not restore any session that was revoked on lock.
    await admin.get('/api/admin/auth/session').expect(401);
    await staff.patch(`/api/admin/users/${admin_id}/status`).set('x-vinlook-admin','1').send({status:'disabled'}).expect(200);
    await staff.patch(`/api/admin/users/${admin_id}/status`).set('x-vinlook-admin','1').send({status:'active'}).expect(200);
    await login(admin,username,'test12345').expect(200);
    await admin.put(`/api/admin/users/${admin_id}`).set('x-vinlook-admin','1').send({...admin_body,status:'disabled'}).expect(200);
    await admin.get('/api/admin/auth/session').expect(401);
  } finally {
    await pool.request().input('admin',sql.VarChar(36),admin_id).input('staff',sql.VarChar(36),staff_id??null).query('DELETE FROM dbo.admin_sessions WHERE user_id IN (@admin,@staff); DELETE FROM dbo.system_logs WHERE user_id IN (@admin,@staff); DELETE FROM dbo.users WHERE id IN (@admin,@staff)');
    await pool.close();
  }
});
