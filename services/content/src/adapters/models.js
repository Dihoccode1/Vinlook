import mongoose from 'mongoose';
const { Schema } = mongoose;
const count = {
  type: Number,
  cast: false,
  required: true,
  default: 0,
  min: 0,
  max: Number.MAX_SAFE_INTEGER,
  validate: Number.isSafeInteger,
};
const date = { type: Date, default: null, validate: (v) => v === null || Number.isFinite(+v) };
const oid = { type: Schema.Types.ObjectId, default: null };
const options = (collection) => ({
  collection,
  strict: 'throw',
  autoCreate: false,
  autoIndex: false,
  bufferCommands: false,
  versionKey: false,
});
export function createAdapterModels(connection) {
  const call = new Schema(
    {
      jobId: { ...oid, required: true, immutable: true },
      retryCount: { ...count, default: undefined, immutable: true },
      attemptId: { type: String, required: true, match: /^[a-f0-9-]{36}$/ },
      registryVersion: { type: String, required: true, maxlength: 100 },
      taskType: { type: String, enum: ['translation', 'audio'], required: true },
      modelId: { type: String, required: true, maxlength: 200 },
      requestHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
      state: {
        type: String,
        enum: ['reserved', 'dispatched', 'completed', 'failed', 'uncertain'],
        required: true,
      },
      reservedAt: { ...date, required: true },
      dispatchedAt: date,
      finishedAt: date,
      errorCode: {
        type: String,
        enum: [null, 'PROVIDER_FAILED', 'QUOTA_EXHAUSTED', 'PROVIDER_OUTCOME_UNKNOWN'],
        default: null,
      },
      mediaIntentId: oid,
      resultHash: { type: String, default: null, match: /^[a-f0-9]{64}$/ },
    },
    options('provider_calls'),
  );
  call.index({ jobId: 1, retryCount: 1 }, { unique: true });
  call.index({ state: 1, dispatchedAt: 1 });
  call.pre('validate', function () {
    if (
      (this.state === 'reserved' && this.dispatchedAt) ||
      (['dispatched', 'uncertain', 'completed'].includes(this.state) && !this.dispatchedAt)
    )
      this.invalidate('state', 'Invalid dispatch state');
  });
  const control = new Schema(
    {
      key: { type: String, required: true, maxlength: 200, immutable: true },
      kind: {
        type: String,
        enum: ['execution', 'quota', 'admission'],
        required: true,
        immutable: true,
      },
      leaseToken: { type: String, default: null, maxlength: 36 },
      leaseExpiresAt: date,
      nextAllowedAt: date,
      day: { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ },
      count,
      minute: {
        type: Number,
        default: null,
        validate: (v) => v === null || Number.isSafeInteger(v),
      },
      minuteCount: count,
      cooldownUntil: date,
      actorId: oid,
      jobId: oid,
      attemptId: { type: String, default: null, maxlength: 36 },
      expiresAt: date,
    },
    options('provider_controls'),
  );
  control.index({ key: 1 }, { unique: true });
  return {
    ProviderCall: connection.models.ProviderCall ?? connection.model('ProviderCall', call),
    ProviderControl:
      connection.models.ProviderControl ?? connection.model('ProviderControl', control),
  };
}
