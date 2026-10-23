import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';
import { createIdentityModels, safeIdentityError } from '../src/models/index.js';
import { fixtures } from './fixtures.js';

const image = 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907';
let connection;
let models;
before(async () => {
  const name = process.env.VINLOOK_TEST_MONGO_CONTAINER;
  assert.match(name ?? '', /^vinlook-task004-mongo-[a-zA-Z0-9_-]+$/);
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }));
  assert.equal(container.Config.Labels['vinlook.task'], 'TASK-004');
  assert.equal(container.Config.Image, image);
  const [binding] = container.NetworkSettings.Ports['27017/tcp'];
  assert.equal(binding.HostIp, '127.0.0.1');
  assert.match(binding.HostPort, /^[0-9]+$/);
  // No caller-supplied URI or Atlas credential is accepted by this test.
  const uri = `mongodb://127.0.0.1:${binding.HostPort}/vinlook_identity_task004?replicaSet=vinlook_task004&directConnection=true`;
  connection = await mongoose.createConnection(uri, {
    autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 5000,
  }).asPromise();
  const existing = await connection.db.listCollections().toArray();
  assert.equal(existing.length, 0, 'Test requires a fresh task-owned container/database; do not reuse data');
  assert.equal((await connection.db.admin().command({ hello: 1 })).setName, 'vinlook_task004');
  models = createIdentityModels(connection);
  for (const model of Object.values(models)) {
    await model.createCollection();
    await model.createIndexes();
  }
});
after(async () => { if (connection) await connection.close(); });

test('database rejects concurrent duplicates of normalized account email', async () => {
  const results = await Promise.allSettled([
    models.StaffAccount.create({ ...fixtures.account(), email: ' CONCURRENT@EXAMPLE.INVALID ' }),
    models.StaffAccount.create({ ...fixtures.account(), email: 'concurrent@example.invalid' }),
  ]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  const failure = results.find(x => x.status === 'rejected').reason;
  assert.equal(failure.code, 11000);
  assert.deepEqual(safeIdentityError(failure), { code: 'IDENTITY_DUPLICATE', fields: ['email'] });
  const account = await models.StaffAccount.findOne({ email: 'concurrent@example.invalid' });
  assert.equal(account.passwordHash, undefined);
  assert.ok(account.createdAt instanceof Date);
  assert.ok(account.updatedAt instanceof Date);
  assert.equal(account.get('__v'), undefined);
});

test('unique staff/day index permits another date but rejects duplicate daily session', async () => {
  const fixture = fixtures.workSession();
  await models.WorkSession.create(fixture);
  await assert.rejects(models.WorkSession.create({ ...fixture, status: 'closed', closedAt: new Date('2026-10-23T04:00:00Z') }), { code: 11000 });
  await models.WorkSession.create({ ...fixture, workDateVN: '2026-10-24', openedAt: new Date('2026-10-24T03:00:00Z') });
});

test('audit event dedup and issuer record projections are actually enforced', async () => {
  await models.AuditLog.create(fixtures.audit());
  await assert.rejects(models.AuditLog.create(fixtures.audit()), { code: 11000 });
  const record = await models.RecoveryCode.create(fixtures.recovery());
  const fetched = await models.RecoveryCode.findById(record._id);
  assert.equal(fetched.codeHash, undefined);
  // Expired recovery remains present: issuance/expiry/one-use must be guarded by API logic.
  assert.ok(fetched.expiresAt < new Date());
});

test('rate key/window uniqueness is distinct from future windows and TTL declaration', async () => {
  const fixture = fixtures.rate();
  await models.AuthRateLimit.create(fixture);
  await assert.rejects(models.AuthRateLimit.create(fixture), { code: 11000 });
  await models.AuthRateLimit.create({ ...fixture, windowStart: new Date(fixture.windowStart.getTime() + 900000) });
  const hidden = await models.AuthRateLimit.findOne({});
  assert.equal(hidden.key, undefined);
  for (const [name, model] of Object.entries(models)) {
    const indexes = await model.collection.indexes();
    const ttl = indexes.filter(index => index.expireAfterSeconds !== undefined);
    if (name === 'AuthRateLimit') {
      assert.equal(ttl.length, 1);
      assert.deepEqual(ttl[0].key, { expiresAt: 1 });
      assert.equal(ttl[0].expireAfterSeconds, 0);
    } else assert.equal(ttl.length, 0);
  }
});

test('replica-set transaction abort leaves no partial account or audit record', async () => {
  const session = await connection.startSession();
  try {
    await assert.rejects(session.withTransaction(async () => {
      await models.StaffAccount.create([{ ...fixtures.account(), email: 'rollback@example.invalid' }], { session });
      await models.AuditLog.create([{ ...fixtures.audit(), eventId: 'rollback-event' }], { session });
      throw new Error('synthetic_transaction_abort');
    }), /synthetic_transaction_abort/);
  } finally { await session.endSession(); }
  assert.equal(await models.StaffAccount.countDocuments({ email: 'rollback@example.invalid' }), 0);
  assert.equal(await models.AuditLog.countDocuments({ eventId: 'rollback-event' }), 0);
});
