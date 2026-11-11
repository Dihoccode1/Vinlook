import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, scryptSync } from 'node:crypto';
import sql from 'mssql';
import request from 'supertest';
import { create_app } from '../../src/app.js';
import { auth_pool, sql_auth_store } from '../../src/modules/auth/auth-store.js';

test('SQL login cooldowns survive new app instances and only a different admin can unlock the 15-failure lock', async () => {
  const pool = await auth_pool();
  const ids: string[] = [];
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12),
    victim_name = `lock_v_${suffix}`,
    admin_name = `lock_a_${suffix}`;
  const salt = randomUUID();
  const hash = `${salt}:${scryptSync('test12345', salt, 64).toString('hex')}`;
  const insert = async (username: string, role: string) => {
    const result = await pool
      .request()
      .input('name', sql.NVarChar(100), username)
      .input('hash', sql.VarChar(200), hash)
      .input('role', sql.VarChar(20), role)
      .query<{ id: string }>(
        "INSERT INTO dbo.users(username,password_hash,full_name,role,status) OUTPUT inserted.id VALUES(@name,@hash,@name,@role,'active')",
      );
    ids.push(result.recordset[0].id);
    return result.recordset[0].id;
  };
  try {
    const victim_id = await insert(victim_name, 'admin');
    await insert(admin_name, 'admin');
    const app = create_app();
    const victim = request.agent(app),
      admin = request.agent(app);
    const login = (agent: ReturnType<typeof request.agent>, name: string, password = 'wrong') =>
      agent
        .post('/api/admin/auth/login')
        .set('x-vinlook-admin', '1')
        .send({ username: name, password });
    const state = async () =>
      (
        await pool
          .request()
          .input('id', sql.VarChar(36), victim_id)
          .query(
            'SELECT status,failed_login_count,login_retry_at,login_locked FROM dbo.users WHERE id=@id',
          )
      ).recordset[0];
    await login(victim, victim_name, 'test12345').expect(200);
    await login(admin, admin_name, 'test12345').expect(200);
    for (let i = 1; i <= 15; i++) {
      const result = await login(victim, victim_name).expect(
        i === 15 ? 423 : i === 5 || i === 10 ? 429 : 401,
      );
      assert.equal((await state()).failed_login_count, i);
      if (i === 5 || i === 10) {
        assert.equal(Number(result.headers['retry-after']), i === 5 ? 30 : 60);
        await login(request.agent(create_app()), victim_name, 'test12345').expect(429);
        assert.equal((await state()).failed_login_count, i);
        await pool
          .request()
          .input('id', sql.VarChar(36), victim_id)
          .query(
            'UPDATE dbo.users SET login_retry_at=DATEADD(SECOND,-1,SYSUTCDATETIME()) WHERE id=@id',
          );
      }
    }
    assert.equal((await state()).status, 'disabled');
    assert.equal((await state()).login_locked, true);
    await victim.get('/api/admin/auth/session').expect(401);
    await login(victim, victim_name, 'test12345').expect(423);
    await victim
      .patch(`/api/admin/users/${victim_id}/status`)
      .set('x-vinlook-admin', '1')
      .send({ status: 'active' })
      .expect(401);
    const listed = await admin.get('/api/admin/users').expect(200);
    assert.equal(
      listed.body.data.find((u: { id: string }) => u.id === victim_id).login_locked,
      true,
    );
    await admin
      .put(`/api/admin/users/${victim_id}`)
      .set('x-vinlook-admin', '1')
      .send({ username: victim_name, full_name: victim_name, role: 'admin', status: 'active' })
      .expect(403);
    await admin
      .patch(`/api/admin/users/${victim_id}/status`)
      .set('x-vinlook-admin', '1')
      .send({ status: 'active' })
      .expect(200);
    assert.deepEqual(await state(), {
      status: 'active',
      failed_login_count: 0,
      login_retry_at: null,
      login_locked: false,
    });
    await login(victim, victim_name, 'test12345').expect(200);
    for (let i = 0; i < 4; i++) await login(victim, victim_name).expect(401);
    await login(victim, victim_name, 'test12345').expect(200);
    assert.equal((await state()).failed_login_count, 0);
    const concurrent = await Promise.all(
      Array.from({ length: 12 }, () => sql_auth_store.login(victim_name.toUpperCase(), 'wrong')),
    );
    assert.equal(concurrent.filter((r) => r.kind === 'invalid').length, 4);
    assert.equal((await state()).failed_login_count, 5);
    assert.ok(concurrent.some((r) => r.kind === 'cooldown'));
  } finally {
    for (const id of ids)
      await pool
        .request()
        .input('id', sql.VarChar(36), id)
        .query(
          'DELETE FROM dbo.admin_sessions WHERE user_id=@id; DELETE FROM dbo.system_logs WHERE user_id=@id; DELETE FROM dbo.users WHERE id=@id',
        );
    await pool.close();
  }
});
