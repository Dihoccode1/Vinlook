import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { scryptSync } from 'node:crypto';
import {
  account_context,
  assert_status_change,
  assert_user_change,
  hash_password,
  UserError,
  type Account,
  type UserRepository,
} from '../../src/modules/users/users.service.js';
import { create_user_routes } from '../../src/modules/users/users.routes.js';

const root: Account = {
  id: 'USR001',
  username: 'admin',
  role: 'admin',
  status: 'active',
  login_locked: false,
};
const admin: Account = { ...root, id: 'USR002', username: 'manager' };
const staff: Account = { ...root, id: 'USR003', username: 'staff', role: 'staff' };
const input = {
  username: 'staff',
  full_name: 'Staff',
  role: 'staff' as const,
  status: 'active' as const,
};
const rejects = (status: number) => (error: unknown) =>
  error instanceof UserError && error.status === status;

test('account policy rechecks actor inside the locked transaction and matches IDs case-insensitively', () => {
  assert.equal(account_context([root, staff], 'usr001', 'usr003').target, staff);
  for (const current of [staff, { ...root, status: 'disabled' }, { ...root, login_locked: true }])
    assert.throws(() => account_context([current], 'USR001', null), rejects(403));
  assert.throws(() => account_context([root], root.id, 'USR999'), rejects(404));
});
test('root, peer administrator and login-lock protections are preserved', () => {
  assert.throws(() => assert_status_change(root, 'disabled', admin.id), rejects(403));
  assert.throws(
    () => assert_status_change({ ...admin, login_locked: true }, 'active', 'usr002'),
    rejects(403),
  );
  assert.doesNotThrow(() =>
    assert_status_change({ ...staff, login_locked: true }, 'active', admin.id),
  );
  assert.throws(
    () => assert_user_change(root, undefined, { ...input, username: 'admin' }),
    rejects(403),
  );
  assert.throws(() => assert_user_change(root, root, input), rejects(403));
  assert.throws(
    () => assert_user_change(admin, { ...root, username: 'other' }, input),
    rejects(403),
  );
  assert.throws(
    () => assert_user_change(root, { ...staff, login_locked: true }, input),
    rejects(409),
  );
  assert.doesNotThrow(() =>
    assert_user_change(root, admin, { ...input, username: admin.username, role: 'admin' }),
  );
});
test('password hashing keeps the existing scrypt format', async () => {
  assert.equal(await hash_password(), null);
  const hash = (await hash_password('FixtureOnly123!'))!;
  const [salt, digest] = hash.split(':');
  assert.equal(salt.length, 32);
  assert.equal(digest, scryptSync('FixtureOnly123!', salt, 64).toString('hex'));
});
test('shared routes preserve validation, role checks and repository delegation for both ID conventions', async () => {
  for (const normalize of [(s: string) => s.toLowerCase(), (s: string) => s.toUpperCase()]) {
    const writes: unknown[][] = [];
    const repository: UserRepository = {
      normalize,
      invalid_input_message: 'invalid',
      async list() {
        return [staff];
      },
      async is_taken() {
        return false;
      },
      async change_status(...args) {
        writes.push(args);
      },
      async save(...args) {
        writes.push(args);
        return normalize(staff.id);
      },
    };
    const app = express();
    app.use((_req, res, next) => {
      res.locals.adminUser = root;
      next();
    });
    app.use('/users', create_user_routes(repository));
    assert.equal((await request(app).get('/users')).status, 200);
    assert.equal(
      (await request(app).get('/users/availability?username=admin')).body.data.available,
      false,
    );
    assert.equal((await request(app).post('/users').send({})).status, 400);
    assert.equal((await request(app).put('/users/USR001').send(input)).status, 409);
    assert.equal(writes.length, 0);
    const created = await request(app)
      .post('/users')
      .send({ ...input, password: 'FixtureOnly123!' });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.id, normalize(staff.id));
    assert.match(String(writes[0][3]), /^[0-9a-f]{32}:[0-9a-f]{128}$/);
    assert.equal(
      (await request(app).patch('/users/USR003/status').send({ status: 'disabled' })).status,
      200,
    );
    assert.deepEqual(writes[1], [normalize(staff.id), 'disabled', normalize(root.id)]);
    const forbidden = express();
    forbidden.use('/users', create_user_routes(repository));
    assert.equal((await request(forbidden).get('/users')).status, 403);
  }
});
