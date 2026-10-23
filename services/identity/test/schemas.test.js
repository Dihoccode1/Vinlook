import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import mongoose from 'mongoose';
import { createIdentityModels, safeIdentityError } from '../src/models/index.js';
import { fixtures } from './fixtures.js';

const connection = mongoose.createConnection();
const models = createIdentityModels(connection);
after(() => connection.close());
const invalid = async (name, value) => assert.rejects(new models[name](value).validate());

test('valid synthetic entities validate without a connection or schema writes', async () => {
  for (const [name, factory] of [['StaffAccount', 'account'], ['WorkSession', 'workSession'],
    ['AuditLog', 'audit'], ['AuditLog', 'operatorAudit'], ['RecoveryCode', 'recovery'], ['AuthRateLimit', 'rate']]) {
    const model = models[name];
    await new model(fixtures[factory]()).validate();
    assert.equal(model.schema.options.autoCreate, false);
    assert.equal(model.schema.options.autoIndex, false);
    assert.equal(model.schema.options.versionKey, false);
  }
  assert.equal(connection.readyState, 0);
});

test('account rejects plaintext, unknown fields, bad hashes/enums and version bounds', async () => {
  assert.throws(() => new models.StaffAccount({ ...fixtures.account(), password: 'synthetic-value' }));
  assert.throws(() => new models.StaffAccount({ ...fixtures.account(), confirmPassword: 'synthetic-value' }));
  for (const change of [{ passwordHash: 'plaintext-sentinel' }, { passwordHash: '$2b$10$' + 'A'.repeat(53) },
    { role: 'Admin' }, { status: 'deleted' }, { authVersion: -1 }, { authVersion: 1.5 },
    { fullName: '😀'.repeat(101) }, { email: 'invalid email' }]) {
    await invalid('StaffAccount', { ...fixtures.account(), ...change });
  }
  await new models.StaffAccount({ ...fixtures.account(), fullName: '😀'.repeat(100) }).validate();
  assert.equal(new models.StaffAccount({ ...fixtures.account(), email: ' FIXTURE@EXAMPLE.INVALID ' }).email, 'fixture@example.invalid');
});

test('work sessions enforce real dates and open/closed timestamp consistency', async () => {
  for (const change of [{ workDateVN: '2026-02-30' }, { workDateVN: '23-10-2026' },
    { status: 'open', closedAt: new Date() }, { status: 'closed', closedAt: null },
    { status: 'closed', closedAt: new Date('2026-10-22') }]) {
    await invalid('WorkSession', { ...fixtures.workSession(), ...change });
  }
  await new models.WorkSession({ ...fixtures.workSession(), status: 'closed', closedAt: new Date('2026-10-23T04:00:00Z') }).validate();
});

test('audit enforces exclusive actor, operator target/reason and typed result', async () => {
  for (const value of [
    { ...fixtures.audit(), actorId: null },
    { ...fixtures.audit(), operatorId: 'operator' },
    { ...fixtures.operatorAudit(), targetAccountId: null },
    { ...fixtures.operatorAudit(), reason: null },
    { ...fixtures.operatorAudit(), workSessionId: new mongoose.Types.ObjectId() },
    { ...fixtures.audit(), result: { status: 'failed', errorCode: null } },
    { ...fixtures.audit(), result: { status: 'failed', errorCode: 'raw private exception' } },
    { ...fixtures.audit(), result: { status: 'succeeded', errorCode: 'UNEXPECTED' } },
  ]) await invalid('AuditLog', value);
  await new models.AuditLog({ ...fixtures.audit(), result: { status: 'failed', errorCode: 'SYNTHETIC_FAILURE' } }).validate();
  assert.throws(() => new models.AuditLog({ ...fixtures.audit(), rawPayload: {} }));
  await assert.rejects(async () => {
    const doc = new models.AuditLog({ ...fixtures.audit(), result: { status: 'succeeded', rawException: 'sentinel' } });
    await doc.validate();
  });
});

test('recovery requires one issuer, SHA256 encoding and valid usage time', async () => {
  for (const change of [{ issuedBy: null }, { issuedByOperator: 'operator' }, { codeHash: 'raw-code' },
    { usedAt: new Date('2026-10-23T04:00:00Z') }, { expiresAt: 'not-a-date' }]) {
    await invalid('RecoveryCode', { ...fixtures.recovery(), ...change });
  }
  await new models.RecoveryCode({ ...fixtures.recovery(), issuedBy: null, issuedByOperator: 'operator' }).validate();
});

test('rate constraints reject raw identifiers and fractional/negative counters', async () => {
  for (const change of [{ key: 'visitor@example.invalid' }, { key: '127.0.0.1' }, { count: -1 },
    { count: 1.1 }, { count: Number.MAX_SAFE_INTEGER + 1 }]) {
    await invalid('AuthRateLimit', { ...fixtures.rate(), ...change });
  }
});

test('hashes hidden from serialization and errors reduced to safe fields/codes', async () => {
  for (const [name, factory, field] of [['StaffAccount', 'account', 'passwordHash'],
    ['RecoveryCode', 'recovery', 'codeHash'], ['AuthRateLimit', 'rate', 'key']]) {
    const document = new models[name](fixtures[factory]());
    assert.ok(document.get(field));
    assert.equal(document.toJSON()[field], undefined);
    assert.equal(document.toObject()[field], undefined);
    assert.equal(models[name].schema.path(field).options.select, false);
  }
  const sentinel = 'private-synthetic-input';
  try {
    await new models.StaffAccount({ ...fixtures.account(), passwordHash: sentinel }).validate();
    assert.fail('must reject');
  } catch (error) {
    assert.deepEqual(safeIdentityError(error), { code: 'INVALID_IDENTITY_DOCUMENT', fields: ['passwordHash'] });
    assert.equal(JSON.stringify(safeIdentityError(error)).includes(sentinel), false);
  }
  assert.deepEqual(safeIdentityError({ code: 11000, keyPattern: { email: 1 }, keyValue: { email: sentinel } }),
    { code: 'IDENTITY_DUPLICATE', fields: ['email'] });
});
