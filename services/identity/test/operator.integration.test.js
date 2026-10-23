import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { runOperator, applyOperator, loadOperatorConfig, connectOperator, bootstrapEventId } from '../src/operator.js';
import { createIdentityModels } from '../src/models/index.js';
import { resetPassword } from '../src/staff-recovery.js';

const rawKey = randomBytes(32).toString('base64url');
const password = 'Synthetic-bootstrap-password!';
let connection, models, runtime, config, environment, manager, recovered;
let clock = Date.parse('2026-10-23T03:00:00.000Z');
const target = { email: 'manager@example.invalid', fullName: 'Synthetic Manager', reason: 'Synthetic incident verification' };
async function run(command, { apply = false, email = target.email, fullName = target.fullName, secret = password, confirm = secret, confirmation = email } = {}) {
  const outputs = []; const prompts = [];
  const answers = [rawKey, email, target.reason, ...(command === 'bootstrap-manager' ? [fullName] : []), ...(apply ? [confirmation] : []),
    ...(apply && command === 'bootstrap-manager' ? [secret, confirm] : [])];
  await runOperator([command, ...(apply ? ['--apply'] : [])], { environment, output: value => outputs.push(value),
    prompt: async (label, hidden = false) => { prompts.push({ label, hidden }); return answers.shift(); },
    connect: async () => ({ ...runtime, close: async () => {} }) });
  return { outputs, prompts };
}
before(async () => {
  const name = process.env.VINLOOK_TEST_MONGO_CONTAINER;
  assert.match(name ?? '', /^vinlook-task010-mongo-[A-Za-z0-9_-]+$/);
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }));
  assert.equal(container.Config.Labels['vinlook.task'], 'TASK-010');
  assert.equal(container.Config.Image, 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');
  const [binding] = container.NetworkSettings.Ports['27017/tcp']; assert.equal(binding.HostIp, '127.0.0.1'); assert.match(binding.HostPort, /^[0-9]+$/);
  const uri = `mongodb://127.0.0.1:${binding.HostPort}/vinlook_identity_task010?replicaSet=vinlook_task010&directConnection=true`;
  environment = { NODE_ENV: 'test', IDENTITY_OPERATOR_MONGODB_URI: uri, IDENTITY_OPERATOR_ALIAS: 'synthetic-operator',
    IDENTITY_OPERATOR_KEY_SHA256: createHash('sha256').update(Buffer.from(rawKey, 'base64url')).digest('hex') };
  config = loadOperatorConfig(environment);
  connection = await mongoose.createConnection(uri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000 }).asPromise();
  assert.equal((await connection.db.listCollections().toArray()).length, 0);
  assert.equal((await connection.db.admin().command({ hello: 1 })).setName, 'vinlook_task010');
  models = createIdentityModels(connection);
  await assert.rejects(connectOperator(config)); assert.equal((await connection.db.listCollections().toArray()).length, 0);
  for (const model of Object.values(models)) { await model.createCollection(); await model.createIndexes(); }
  const catalogConnection = await connectOperator(config); await catalogConnection.close();
  runtime = { models, now: () => clock, config: { rateKey: randomBytes(32) } };
});
after(async () => { if (connection) await connection.close(); });

test('dry-run and rejected confirmation/password produce no writes; bootstrap audit failure rolls back', async () => {
  const planned = await run('bootstrap-manager');
  assert.equal(planned.outputs.length, 1); assert.ok(planned.prompts.every(x => !x.label.includes('Password')));
  assert.equal(await models.StaffAccount.countDocuments({}), 0); assert.equal(await models.AuditLog.countDocuments({}), 0);
  await assert.rejects(run('bootstrap-manager', { apply: true, confirmation: 'wrong@example.invalid' }));
  for (const options of [{ secret: 'short' }, { secret: '😀'.repeat(19) }, { confirm: `${password} ` }]) await assert.rejects(run('bootstrap-manager', { apply: true, ...options }));
  const original = runtime.models;
  runtime.models = { ...models, AuditLog: { exists: models.AuditLog.exists.bind(models.AuditLog), create: async () => { throw new Error('synthetic private audit failure'); } } };
  try { await assert.rejects(run('bootstrap-manager', { apply: true })); } finally { runtime.models = original; }
  assert.equal(await models.StaffAccount.countDocuments({}), 0); assert.equal(await models.AuditLog.countDocuments({}), 0);
});

test('Staff-email collision never promotes; concurrent different-email bootstrap commits exactly one Manager/audit', async () => {
  const hash = await bcrypt.hash(password, 12);
  await models.StaffAccount.create({ fullName: 'Existing Staff', email: 'existing@example.invalid', passwordHash: hash, role: 'Staff', status: 'pending', authVersion: 0 });
  await assert.rejects(run('bootstrap-manager', { apply: true, email: 'existing@example.invalid' }));
  const candidates = [target, { ...target, email: 'competing@example.invalid' }];
  const outcomes = await Promise.allSettled(candidates.map(value => applyOperator(runtime, config, 'bootstrap-manager', value, hash)));
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(await models.StaffAccount.countDocuments({ role: 'Manager' }), 1);
  assert.equal(await models.AuditLog.countDocuments({ eventId: bootstrapEventId }), 1);
  manager = await models.StaffAccount.findOne({ role: 'Manager' }).select('+passwordHash');
  assert.equal(await bcrypt.compare(password, manager.passwordHash), true); assert.equal(bcrypt.getRounds(manager.passwordHash), 12);
  const audit = await models.AuditLog.findOne({ eventId: bootstrapEventId });
  assert.equal(audit.actorType, 'operator'); assert.equal(audit.operatorId, config.alias); assert.equal(String(audit.targetAccountId), String(manager._id));
  assert.equal(audit.actorId, null); assert.equal(audit.workSessionId, null);
  assert.equal((await models.StaffAccount.findOne({ email: 'existing@example.invalid' })).role, 'Staff');
  await assert.rejects(run('bootstrap-manager', { apply: true, email: 'third@example.invalid' }));
});

test('bootstrap audit remains the one-time guard even without a Manager document in a simulated interrupted snapshot', async () => {
  // Inject only the Manager-existence query result, never delete a retained real fixture history.
  const original = runtime.models;
  runtime.models = { ...models, StaffAccount: { ...models.StaffAccount,
    exists: async filter => filter.role ? null : models.StaffAccount.exists(filter) } };
  try { await assert.rejects(run('bootstrap-manager', { email: 'unused@example.invalid' })); } finally { runtime.models = original; }
  assert.equal(await models.AuditLog.countDocuments({ eventId: bootstrapEventId }), 1);
});

test('operator recovery is raw-once, SHA256/15minute, version-revoking and replaces old code without unlocking', async () => {
  await models.StaffAccount.updateOne({ _id: manager._id }, { $set: { status: 'locked' } });
  const countBefore = await models.RecoveryCode.countDocuments({});
  const dry = await run('recover-manager', { email: manager.email });
  assert.equal(dry.outputs.length, 1); assert.equal(await models.RecoveryCode.countDocuments({}), countBefore);
  const first = await run('recover-manager', { apply: true, email: manager.email });
  recovered = JSON.parse(first.outputs.at(-1)); assert.equal(Buffer.from(recovered.code, 'base64url').length, 32);
  assert.equal(Date.parse(recovered.expiresAt) - clock, 900000);
  assert.equal(first.outputs.filter(line => line.includes(recovered.code)).length, 1);
  const record = await models.RecoveryCode.findOne({ staffId: manager._id }).select('+codeHash');
  assert.equal(record.codeHash, createHash('sha256').update(Buffer.from(recovered.code, 'base64url')).digest('hex'));
  assert.equal(record.issuedBy, null); assert.equal(record.issuedByOperator, config.alias);
  assert.equal((await models.StaffAccount.findById(manager._id)).status, 'locked');
  const second = await run('recover-manager', { apply: true, email: manager.email }); recovered = JSON.parse(second.outputs.at(-1));
  assert.equal(await models.RecoveryCode.countDocuments({ staffId: manager._id, usedAt: null, expiresAt: { $gt: new Date(clock) } }), 1);
  assert.equal((await models.StaffAccount.findById(manager._id)).authVersion, 2);
  assert.equal(JSON.stringify(await models.AuditLog.find({})).includes(recovered.code), false);
});

test('existing reset consumes operator code once and keeps locked; explicit unlock alone activates with audit', async () => {
  await resetPassword(runtime, { email: manager.email, code: recovered.code, password, confirmPassword: password });
  await assert.rejects(resetPassword(runtime, { email: manager.email, code: recovered.code, password, confirmPassword: password }), error => error.code === 'RECOVERY_FAILED');
  const before = await models.StaffAccount.findById(manager._id).select('+passwordHash'); assert.equal(before.status, 'locked');
  await run('unlock-manager', { apply: true, email: manager.email });
  const after = await models.StaffAccount.findById(manager._id).select('+passwordHash');
  assert.equal(after.status, 'active'); assert.equal(after.authVersion, before.authVersion + 1); assert.equal(after.passwordHash, before.passwordHash);
  assert.equal(await models.AuditLog.countDocuments({ action: 'manager.unlock', 'result.status': 'succeeded' }), 1);
  await assert.rejects(run('unlock-manager', { apply: true, email: manager.email }), error => error.failureAudit === 'recorded');
  assert.equal(await models.AuditLog.countDocuments({ action: 'manager.unlock', 'result.status': 'failed' }), 1);
  await assert.rejects(run('recover-manager', { apply: true, email: 'existing@example.invalid' }));
});

test('recovery/unlock audit failure rolls back and honestly reports unconfirmed failure audit', async () => {
  const before = await models.StaffAccount.findById(manager._id);
  const count = await models.RecoveryCode.countDocuments({ staffId: manager._id });
  const original = runtime.models;
  runtime.models = { ...models, AuditLog: { create: async () => { throw new Error('synthetic private audit failure'); } } };
  try { await assert.rejects(run('recover-manager', { apply: true, email: manager.email }), error => error.failureAudit === 'unconfirmed' && !error.message.includes('synthetic private')); }
  finally { runtime.models = original; }
  assert.equal((await models.StaffAccount.findById(manager._id)).authVersion, before.authVersion);
  assert.equal(await models.RecoveryCode.countDocuments({ staffId: manager._id }), count);
});

test('concurrent operator issuance leaves one valid code; closed DB fails safely', async () => {
  const results = await Promise.allSettled(Array.from({ length: 3 }, () => run('recover-manager', { apply: true, email: manager.email })));
  assert.ok(results.some(x => x.status === 'fulfilled'));
  assert.equal(await models.RecoveryCode.countDocuments({ staffId: manager._id, usedAt: null, expiresAt: { $gt: new Date(clock) } }), 1);
  await connection.close();
  await assert.rejects(run('recover-manager', { email: manager.email }));
});
