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
  await migrate();
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
    await t.test('POI editing, Unicode, duplicate slugs and optimistic concurrency', async () => {
      const input = {
        name: 'Địa điểm kiểm thử %_',
        slug: 'dia-diem-ci',
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
      assert.equal((await request('/api/admin/pois', 'POST', input)).status, 409);
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
      await query("SELECT setval('pois_id_seq',1000,false)");
      const { postgres_admin_repository } =
        await import('../../services/poi-service/dist/modules/admin/admin.postgres.js');
      assert.equal(await postgres_admin_repository.next_id(), 'POI1000');
    });
    await t.test('account restrictions, staff access, login lockout and logout', async () => {
      const admin = (await (await request('/api/admin/auth/session')).json()).data;
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
