import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdtemp, copyFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { query, close_postgres } from '@vinlook/server/postgres';
import { migrate } from '../cloud-migrate.mjs';

test('cloud APIs, authorization and data-preserving migrations', async (t) => {
  assert.match(
    new URL(process.env.DATABASE_URL).hostname,
    /^(127\.0\.0\.1|localhost)$/,
    'Tests must use an isolated local PostgreSQL instance',
  );
  const old_migrations = await mkdtemp(join(tmpdir(), 'vinlook-before-slug-removal-'));
  for (const name of ['001_initial.sql', '002_default_poi_slug.sql']) {
    await copyFile(
      new URL(`../../database/postgres/${name}`, import.meta.url),
      join(old_migrations, name),
    );
  }
  await migrate(pathToFileURL(old_migrations + '/'));
  await query(`INSERT INTO pois(id,slug,name,description,address,latitude,longitude,category)
    VALUES('POI900','existing-poi','Điểm đã có','Nội dung gốc','Địa chỉ',10.7,106.6,'history')`);
  await query(`INSERT INTO poi_images(poi_id,content,content_type,sha256)
    VALUES('POI900',decode('010203','hex'),'image/jpeg',repeat('0',64))`);
  await migrate();
  assert.equal(
    (
      await query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema='vinlook' AND table_name='pois' AND column_name='slug'",
      )
    ).rowCount,
    0,
  );
  const preserved = (
    await query(
      "SELECT p.name,p.description,encode(i.content,'hex') AS image FROM pois p JOIN poi_images i ON i.poi_id=p.id WHERE p.id='POI900'",
    )
  ).rows[0];
  assert.deepEqual(preserved, { name: 'Điểm đã có', description: 'Nội dung gốc', image: '010203' });
  await migrate();
  const dataset = 'c527f7eb-9d7e-4e62-9d68-1c7df8ef1c7a';
  const salt = randomBytes(16).toString('hex');
  const hash = salt + ':' + scryptSync('CloudFixtureOnly_123!', salt, 64).toString('hex');
  await query(
    `INSERT INTO users(id,username,password_hash,full_name) VALUES('USR900','admin',$1,'CI administrator')`,
    [hash],
  );
  await query('INSERT INTO deployment_state(id,dataset_id,source_sha256) VALUES(1,$1,$2)', [
    dataset,
    '0'.repeat(64),
  ]);
  process.env.VINLOOK_DATASET_ID = dataset;
  process.env.ADMIN_API_KEY = 'CiOnly_InternalKey';
  process.env.PORT = '10000';
  process.env.NODE_ENV = 'production';
  process.env.TRANSLATION_PROVIDERS = 'mymemory';
  const { start_cloud } = await import('../cloud-start.mjs');
  const server = await start_cloud();
  const base = 'http://127.0.0.1:10000';
  let cookie = '';
  async function request(path, method = 'GET', body, authenticated = true) {
    const response = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-vinlook-admin': '1',
        ...(authenticated && cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return response;
  }
  try {
    await t.test('health and private session', async () => {
      assert.equal((await request('/health/ready')).status, 200);
      assert.equal((await request('/api/admin/users')).status, 401);
      const login = await request('/api/admin/auth/login', 'POST', {
        username: 'ADMIN',
        password: 'CloudFixtureOnly_123!',
      });
      assert.equal(login.status, 200);
      cookie = login.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ');
      assert.match(login.headers.get('set-cookie'), /Secure/);
      assert.equal((await request('/api/admin/auth/session')).status, 200);
    });
    let poi;
    await t.test('POI editing, Unicode and optimistic concurrency without slugs', async () => {
      const input = {
        name: 'Địa điểm kiểm thử %_',
        description: 'Mô tả tiếng Việt',
        visitor_description: 'Giới thiệu',
        address: 'Thành phố Hồ Chí Minh',
        latitude: 10.7,
        longitude: 106.6,
        category: 'history',
        source_language: 'vi',
        is_published: true,
      };
      const created = await request('/api/admin/pois', 'POST', input);
      assert.equal(created.status, 201);
      poi = (await created.json()).data;
      const second = await request('/api/admin/pois', 'POST', { ...input, is_published: false });
      assert.equal(second.status, 201);
      const draft = (await second.json()).data;
      assert.notEqual(draft.id, poi.id);
      assert.equal(draft.slug, undefined);
      const list = await (await request('/api/pois?q=%25_')).json();
      assert.equal(list.data.length, 1);
      assert.equal(
        (
          await request('/api/admin/pois/' + poi.id, 'PUT', {
            ...input,
            updated_at: poi.updated_at,
            name: 'Đã sửa',
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request('/api/admin/pois/' + poi.id, 'PUT', {
            ...input,
            updated_at: poi.updated_at,
          })
        ).status,
        409,
      );
      assert.equal((await request('/api/pois/' + poi.id.toLowerCase())).status, 400); // Public API enforces canonical POI codes.
      const { postgres_poi_repository } =
        await import('../../services/poi-service/dist/modules/pois/poi.postgres.js');
      assert.equal((await postgres_poi_repository.find(poi.id.toLowerCase())).name, 'Đã sửa');
      assert.equal(list.data[0].slug, undefined);
      await query("SELECT setval('pois_id_seq',1000,false)");
      const { postgres_admin_repository } =
        await import('../../services/poi-service/dist/modules/admin/admin.postgres.js');
      assert.equal(await postgres_admin_repository.next_id(), 'POI1000');
    });
    await t.test('account restrictions, staff access, login lockout and logout', async () => {
      const admin = (await (await request('/api/admin/auth/session')).json()).data;
      const availability = '/api/admin/users/availability';
      assert.equal((await request(availability + '?username=a')).status, 400);
      for (const [username, available] of [
        ['ci_staff', true],
        ['ADMIN', false],
      ]) {
        const check = await request(availability + '?username=' + username);
        assert.equal(check.status, 200);
        assert.equal((await check.json()).data.available, available);
      }
      assert.equal(
        (await request('/api/admin/users/' + admin.id + '/status', 'PATCH', { status: 'disabled' }))
          .status,
        403,
      );
      const created = await request('/api/admin/users', 'POST', {
        username: 'ci_staff',
        full_name: 'CI staff',
        role: 'staff',
        status: 'active',
        password: 'StaffFixture_123!',
      });
      assert.equal(created.status, 201);
      const staffId = (await created.json()).data.id;
      const taken = await request(availability + '?username=CI_STAFF');
      assert.equal(taken.status, 200);
      assert.equal((await taken.json()).data.available, false);
      const rootCookie = cookie;
      const staffLogin = await request(
        '/api/admin/auth/login',
        'POST',
        { username: 'ci_staff', password: 'StaffFixture_123!' },
        false,
      );
      assert.equal(staffLogin.status, 200);
      cookie = staffLogin.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ');
      assert.equal((await request('/api/admin/users')).status, 403);
      assert.equal((await request(availability + '?username=ci_staff')).status, 403);
      const change_password = (body) => request('/api/admin/auth/password', 'POST', body);
      const staff_password = 'NewStaffFixture_123!';
      assert.equal(
        (
          await change_password({
            current_password: 'StaffFixture_123!',
            new_password: staff_password,
            target_user_id: admin.id,
          })
        ).status,
        403,
      );
      assert.equal(
        (
          await change_password({
            current_password: 'wrong',
            new_password: staff_password,
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await change_password({
            current_password: 'StaffFixture_123!',
            new_password: '1234567',
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await change_password({
            current_password: 'StaffFixture_123!',
            new_password: staff_password,
          })
        ).status,
        200,
      );
      assert.equal((await request('/api/admin/auth/session')).status, 401);
      const login_with_new_password = await request(
        '/api/admin/auth/login',
        'POST',
        {
          username: 'ci_staff',
          password: staff_password,
        },
        false,
      );
      assert.equal(login_with_new_password.status, 200);
      const staff_cookie = login_with_new_password.headers.getSetCookie()[0].split(';')[0];

      cookie = rootCookie;
      const reset_password = 'ResetStaffFixture_123!';
      assert.equal(
        (
          await change_password({
            current_password: 'CloudFixtureOnly_123!',
            new_password: reset_password,
            target_user_id: staffId,
          })
        ).status,
        200,
      );
      assert.equal((await request('/api/admin/auth/session')).status, 200);
      cookie = staff_cookie;
      assert.equal((await request('/api/admin/auth/session')).status, 401);
      assert.equal(
        (
          await request(
            '/api/admin/auth/login',
            'POST',
            { username: 'ci_staff', password: staff_password },
            false,
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await request(
            '/api/admin/auth/login',
            'POST',
            { username: 'ci_staff', password: reset_password },
            false,
          )
        ).status,
        200,
      );
      cookie = rootCookie;
      await query('UPDATE users SET failed_login_count=14 WHERE id=$1', [staffId]);
      assert.equal(
        (
          await request(
            '/api/admin/auth/login',
            'POST',
            { username: 'ci_staff', password: 'wrong' },
            false,
          )
        ).status,
        423,
      );
      assert.equal(
        (await request('/api/admin/users/' + staffId + '/status', 'PATCH', { status: 'active' }))
          .status,
        200,
      );
    });
    await t.test('Root can manage other admins and the admin username is reserved', async () => {
      const root_cookie = cookie;
      const admin_input = {
        username: 'ci_admin',
        full_name: 'CI admin',
        role: 'admin',
        status: 'active',
      };
      const admin_password = 'AdminFixture_123!';
      const create_admin = (username) =>
        request('/api/admin/users', 'POST', { ...admin_input, username, password: admin_password });
      const created = await create_admin(admin_input.username);
      assert.equal(created.status, 201);
      const other = await create_admin('ci_other_admin');
      assert.equal(other.status, 201);
      const id = (await created.json()).data.id;
      const other_id = (await other.json()).data.id;
      const login_admin = (password) =>
        request(
          '/api/admin/auth/login',
          'POST',
          { username: admin_input.username, password },
          false,
        );
      const session = await login_admin(admin_password);
      assert.equal(session.status, 200);
      const admin_cookie = session.headers.getSetCookie()[0].split(';')[0];
      cookie = admin_cookie;
      assert.equal((await create_admin('ADMIN')).status, 403);
      assert.equal((await request('/api/admin/users/' + other_id, 'PUT', admin_input)).status, 403);
      const reset_password = (current_password, target_user_id) =>
        request('/api/admin/auth/password', 'POST', {
          current_password,
          new_password: 'NewAdminFixture_123!',
          target_user_id,
        });
      assert.equal((await reset_password(admin_password, other_id)).status, 403);

      cookie = root_cookie;
      assert.equal((await reset_password('CloudFixtureOnly_123!', id)).status, 200);
      cookie = admin_cookie;
      assert.equal((await request('/api/admin/auth/session')).status, 401);
      assert.equal((await login_admin('NewAdminFixture_123!')).status, 200);

      cookie = root_cookie;
      const admin_path = '/api/admin/users/' + id;
      assert.equal(
        (await request(admin_path + '/status', 'PATCH', { status: 'disabled' })).status,
        200,
      );
      assert.equal(
        (await request(admin_path + '/status', 'PATCH', { status: 'active' })).status,
        200,
      );
      assert.equal(
        (
          await request(admin_path, 'PUT', {
            ...admin_input,
            full_name: 'Updated by Root',
            role: 'staff',
          })
        ).status,
        200,
      );
      const updated = (await (await request('/api/admin/users')).json()).data.find(
        (user) => user.id === id,
      );
      assert.equal(updated.role, 'staff');
      assert.equal(updated.full_name, 'Updated by Root');
      assert.equal((await request('/api/admin/auth/logout', 'POST')).status, 204);
      assert.equal((await request('/api/admin/auth/session')).status, 401);
    });
    await t.test('migration refuses row loss and rolls back atomically', async () => {
      const folder = await mkdtemp(join(tmpdir(), 'vinlook-migration-'));
      await copyFile(
        new URL('../../database/postgres/001_initial.sql', import.meta.url),
        join(folder, '001_initial.sql'),
      );
      await writeFile(join(folder, '002_unsafe.sql'), "UPDATE vinlook.pois SET name='UNSAFE';");
      await assert.rejects(migrate(pathToFileURL(folder + '/')), /changed existing data/);
      assert.equal(
        (await query('SELECT name FROM pois WHERE id=$1', [poi.id])).rows[0].name,
        'Đã sửa',
      );
      assert.equal(
        (await query("SELECT name FROM schema_migrations WHERE name='002_unsafe.sql'")).rows.length,
        0,
      );
      await migrate();
      await migrate();
    });
  } finally {
    await server.stop();
    await close_postgres();
  }
});
