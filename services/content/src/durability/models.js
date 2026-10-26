import mongoose from 'mongoose';
import { eventSchema, resultSchema, operations, uuid } from './validation.js';
const { Schema } = mongoose;
const nested = { _id: false, strict: 'throw', versionKey: false };
const opts = (collection) => ({
  collection,
  strict: 'throw',
  versionKey: false,
  autoCreate: false,
  autoIndex: false,
  bufferCommands: false,
});
const number = (min, max = Number.MAX_SAFE_INTEGER) => ({
  type: Number,
  cast: false,
  required: true,
  min,
  max,
  validate: Number.isSafeInteger,
});
const date = () => ({ type: Date, required: true, validate: (v) => Number.isFinite(v.getTime()) });
const oid = () => ({ type: Schema.Types.ObjectId, required: true });
export function createDurabilitySchemas() {
  const result = new Schema(
    {
      status: { type: String, required: true, enum: ['succeeded', 'failed'] },
      errorCode: { type: String, default: null },
    },
    nested,
  );
  const payload = new Schema(
    {
      eventId: { type: String, required: true },
      actorId: { type: String, required: true },
      workSessionId: { type: String, required: true },
      action: { type: String, required: true },
      poiId: { type: String, required: true },
      occurredAt: { type: String, required: true },
      result: { type: result, required: true },
      reason: { type: String, default: null },
    },
    nested,
  );
  const AuditOutbox = new Schema(
    {
      eventId: {
        type: String,
        required: true,
        immutable: true,
        validate: (v) => uuid.safeParse(v).success,
      },
      payload: {
        type: payload,
        required: true,
        immutable: true,
        validate: {
          validator(v) {
            return eventSchema.safeParse(v.toObject()).success && v.eventId === this.eventId;
          },
          message: 'Invalid audit event',
        },
      },
      createdAt: { ...date(), immutable: true },
      deliveredAt: {
        type: Date,
        default: null,
        validate: (v) => v === null || Number.isFinite(v.getTime()),
      },
      nextAttemptAt: date(),
      attemptCount: number(0),
    },
    opts('audit_outboxes'),
  );
  AuditOutbox.index({ eventId: 1 }, { unique: true });
  AuditOutbox.index({ deliveredAt: 1, nextAttemptAt: 1 });
  const data = new Schema(
    {
      poiId: String,
      revisionId: String,
      jobIds: { type: [String], default: undefined },
      editVersion: { type: Number, cast: false },
      status: String,
    },
    nested,
  );
  const body = new Schema({ data: { type: data, required: true } }, nested);
  const IdempotencyRecord = new Schema(
    {
      actorId: oid(),
      operation: { type: String, required: true, enum: operations },
      key: { type: String, required: true, validate: (v) => uuid.safeParse(v).success },
      requestHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
      status: { type: String, required: true, enum: ['in_progress', 'completed'] },
      responseStatus: { type: Number, cast: false, default: null },
      responseBody: { type: body, default: null },
      createdAt: date(),
      expiresAt: date(),
    },
    opts('idempotency_records'),
  );
  IdempotencyRecord.pre('validate', function () {
    if (this.expiresAt?.getTime() !== this.createdAt?.getTime() + 86400000)
      this.invalidate('expiresAt', 'Invalid expiry');
    const done = this.status === 'completed';
    if (
      done
        ? !Number.isInteger(this.responseStatus) ||
          this.responseStatus < 200 ||
          this.responseStatus > 299
        : this.responseStatus !== null
    )
      this.invalidate('responseStatus', 'Invalid response status');
    if (
      done
        ? !this.responseBody || !resultSchema.safeParse(this.responseBody.toObject()).success
        : this.responseBody !== null
    )
      this.invalidate('responseBody', 'Invalid response body');
  });
  IdempotencyRecord.index({ actorId: 1, operation: 1, key: 1 }, { unique: true });
  return { AuditOutbox, IdempotencyRecord };
}
export function createDurabilityModels(connection) {
  return Object.fromEntries(
    Object.entries(createDurabilitySchemas()).map(([name, schema]) => [
      name,
      connection.models[name] ?? connection.model(name, schema),
    ]),
  );
}
