import mongoose from 'mongoose';

const { Schema } = mongoose;
const objectId = Schema.Types.ObjectId;
const hex64 = /^[0-9a-f]{64}$/;
const code = /^[A-Za-z0-9_]{1,100}$/;
const bcrypt12 = /^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/;
const integer = { validator: Number.isSafeInteger, message: 'Invalid integer' };
const finiteDate = {
  validator: (value) => value == null || Number.isFinite(value.getTime()),
  message: 'Invalid date',
};
const date = (required = false) => ({ type: Date, required, validate: finiteDate });
const nullableId = () => ({ type: objectId, default: null });
const alias = () => ({ type: String, trim: true, minlength: 1, maxlength: 100, default: null });

function options(collection, hidden = []) {
  const transform = (_document, result) => {
    for (const field of hidden) delete result[field];
    return result;
  };
  return {
    collection,
    strict: 'throw',
    autoCreate: false,
    autoIndex: false,
    bufferCommands: false,
    versionKey: false,
    toJSON: { transform },
    toObject: { transform },
  };
}

function calendarDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Service-owned schemas; compiling these models never opens a connection or creates indexes. */
export function createIdentitySchemas() {
  const StaffAccount = new Schema(
    {
      fullName: {
        type: String,
        required: true,
        trim: true,
        validate: {
          validator: (value) => [...value].length >= 1 && [...value].length <= 100,
          message: 'Invalid name length',
        },
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 254,
        match: /^[^@\s]+@[^@\s]+$/u,
      },
      passwordHash: { type: String, required: true, match: bcrypt12, select: false },
      role: { type: String, required: true, enum: ['Staff', 'Manager'] },
      status: { type: String, required: true, enum: ['pending', 'active', 'locked'] },
      authVersion: { type: Number, required: true, min: 0, validate: integer },
    },
    { ...options('staff_accounts', ['passwordHash']), timestamps: true },
  );
  StaffAccount.index({ email: 1 }, { unique: true });

  const WorkSession = new Schema(
    {
      staffId: { type: objectId, required: true },
      workDateVN: {
        type: String,
        required: true,
        validate: { validator: calendarDay, message: 'Invalid calendar date' },
      },
      status: { type: String, required: true, enum: ['open', 'closed'] },
      openedAt: date(true),
      closedAt: {
        ...date(),
        default: null,
        validate: {
          validator(value) {
            return this.status === 'open'
              ? value == null
              : value instanceof Date && Number.isFinite(value.getTime()) && value >= this.openedAt;
          },
          message: 'Invalid session closure',
        },
      },
    },
    options('work_sessions'),
  );
  WorkSession.index({ staffId: 1, workDateVN: 1 }, { unique: true });

  const resultSchema = new Schema(
    {
      status: { type: String, required: true, enum: ['succeeded', 'failed'] },
      errorCode: {
        type: String,
        default: null,
        validate: {
          validator(value) {
            return this.status === 'failed'
              ? typeof value === 'string' && code.test(value)
              : value == null;
          },
          message: 'Invalid result code',
        },
      },
    },
    { _id: false, strict: 'throw', versionKey: false },
  );
  const AuditLog = new Schema(
    {
      eventId: { type: String, required: true },
      actorType: { type: String, required: true, enum: ['account', 'operator'] },
      actorId: nullableId(),
      operatorId: alias(),
      workSessionId: nullableId(),
      action: { type: String, required: true, minlength: 1, maxlength: 100 },
      poiId: nullableId(),
      targetAccountId: nullableId(),
      reason: { type: String, minlength: 1, maxlength: 500, default: null },
      occurredAt: date(true),
      receivedAt: date(true),
      result: { type: resultSchema, required: true },
    },
    options('audit_logs'),
  );
  AuditLog.path('actorId').validate(function (value) {
    return this.actorType === 'account' ? value != null : value == null;
  }, 'Invalid account actor');
  AuditLog.path('operatorId').validate(function (value) {
    return this.actorType === 'operator' ? Boolean(value) : value == null;
  }, 'Invalid operator actor');
  AuditLog.path('workSessionId').validate(function (value) {
    return this.actorType !== 'operator' || value == null;
  }, 'Operator has no staff session');
  AuditLog.path('targetAccountId').required(function () {
    return this.actorType === 'operator';
  });
  AuditLog.path('reason').required(function () {
    return this.actorType === 'operator';
  });
  AuditLog.index({ eventId: 1 }, { unique: true });
  AuditLog.index({ workSessionId: 1, occurredAt: 1 });
  AuditLog.index({ actorId: 1, occurredAt: 1 });

  const RecoveryCode = new Schema(
    {
      staffId: { type: objectId, required: true },
      codeHash: { type: String, required: true, match: hex64, select: false },
      expiresAt: date(true),
      usedAt: {
        ...date(),
        default: null,
        validate: {
          validator(value) {
            return value == null || (Number.isFinite(value.getTime()) && value <= this.expiresAt);
          },
          message: 'Invalid consumption date',
        },
      },
      issuedBy: nullableId(),
      issuedByOperator: alias(),
    },
    options('recovery_codes', ['codeHash']),
  );
  RecoveryCode.path('issuedBy').validate(function (value) {
    return (value != null) !== (this.issuedByOperator != null);
  }, 'Exactly one issuer required');
  RecoveryCode.index({ staffId: 1, expiresAt: 1 });

  const AuthRateLimit = new Schema(
    {
      key: { type: String, required: true, match: hex64, select: false },
      windowStart: date(true),
      count: { type: Number, required: true, min: 0, validate: integer },
      expiresAt: date(true),
    },
    options('auth_rate_limits', ['key']),
  );
  AuthRateLimit.index({ key: 1, windowStart: 1 }, { unique: true });
  AuthRateLimit.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return { StaffAccount, WorkSession, AuditLog, RecoveryCode, AuthRateLimit };
}

export function createIdentityModels(connection) {
  return Object.fromEntries(
    Object.entries(createIdentitySchemas()).map(([name, schema]) => [
      name,
      connection.models[name] ?? connection.model(name, schema),
    ]),
  );
}

const allowedFields = new Set([
  'fullName',
  'email',
  'passwordHash',
  'role',
  'status',
  'authVersion',
  'staffId',
  'workDateVN',
  'openedAt',
  'closedAt',
  'eventId',
  'actorType',
  'actorId',
  'operatorId',
  'workSessionId',
  'action',
  'poiId',
  'targetAccountId',
  'reason',
  'occurredAt',
  'receivedAt',
  'result',
  'result.status',
  'result.errorCode',
  'codeHash',
  'expiresAt',
  'usedAt',
  'issuedBy',
  'issuedByOperator',
  'key',
  'windowStart',
  'count',
]);

/** Never log/serialize the original Mongoose/Mongo error: it can include rejected values. */
export function safeIdentityError(error) {
  const fields = Object.keys(error?.errors ?? error?.keyPattern ?? {})
    .filter((field) => allowedFields.has(field))
    .sort();
  return {
    code: error?.code === 11000 ? 'IDENTITY_DUPLICATE' : 'INVALID_IDENTITY_DOCUMENT',
    fields,
  };
}
