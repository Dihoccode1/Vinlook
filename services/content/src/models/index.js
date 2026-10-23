import mongoose from 'mongoose';

const { Schema } = mongoose;
const objectId = Schema.Types.ObjectId;
export const languageCodes = Object.freeze(['en', 'zh-Hant', 'hi', 'es', 'ar', 'fr', 'bn', 'pt-PT', 'id', 'ur', 'ru', 'de', 'ja', 'pcm', 'ar-EG', 'vi']);
const options = collection => ({ collection, strict: 'throw', autoCreate: false, autoIndex: false,
  bufferCommands: false, versionKey: false });
const nested = { _id: false, strict: 'throw', versionKey: false };
const nullableId = () => ({ type: objectId, default: null });
const finiteDate = value => value == null || Number.isFinite(value.getTime());
const version = min => ({ type: Number, cast: false, required: true, min,
  validate: { validator: Number.isSafeInteger, message: 'Invalid version' } });
const noControls = value => !/[\x00-\x1f\x7f]/.test(value);
function httpsAsset(value) {
  try { const url = new URL(value); return url.href === value && url.protocol === 'https:'
    && !url.username && !url.password && !url.search && !url.hash; } catch { return false; }
}

export function createContentSchemas() {
  const point = new Schema({
    type: { type: String, required: true, enum: ['Point'] },
    coordinates: { type: [{ type: Number, cast: false }], required: true, default: undefined, castNonArrays: false,
      validate: { validator: value => Array.isArray(value) && value.length === 2 && value.every(Number.isFinite)
        && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90, message: 'Invalid coordinates' } },
  }, nested);
  const assetFields = () => ({
    publicId: { type: String, trim: true, required: true, minlength: 1, maxlength: 512,
      validate: { validator: noControls, message: 'Invalid asset identifier' } },
    url: { type: String, required: true, validate: { validator: httpsAsset, message: 'Invalid asset URL' } },
    format: { type: String, required: true, match: /^[a-z0-9]{1,16}$/ },
  });
  const thumbnail = new Schema(assetFields(), nested);
  const audio = new Schema({ ...assetFields(), textVersion: version(1),
    registryVersion: { type: String, required: true, match: /^[A-Za-z0-9._-]{1,100}$/ },
    voiceOrModelId: { type: String, trim: true, required: true, minlength: 1, maxlength: 200,
      validate: { validator: noControls, message: 'Invalid model identifier' } },
  }, nested);

  const POI = new Schema({
    mutationVersion: { ...version(0), default: 0 },
    publishedRevisionId: nullableId(),
    deletedAt: { type: Date, default: null, validate: { validator: finiteDate, message: 'Invalid date' } },
    deletedBy: { ...nullableId(), validate: { validator(value) { return (value != null) === (this.deletedAt != null); }, message: 'Invalid deletion pair' } },
  }, { ...options('pois'), timestamps: { createdAt: true, updatedAt: false } });
  POI.index({ deletedAt: 1 });

  const POIRevision = new Schema({
    poiId: { type: objectId, required: true }, revisionNumber: version(1), editVersion: version(0), sourceVersion: version(1),
    status: { type: String, required: true, enum: ['draft', 'in_review', 'published'] },
    nameEN: { type: String, trim: true, required: true, validate: {
      validator: value => [...value].length >= 1 && [...value].length <= 200, message: 'Invalid name length' } },
    location: { type: point, required: true },
    entrance: { type: point, default: null, required() { return this.status === 'published'; } },
    thumbnailAsset: { type: thumbnail, default: null, required() { return this.status === 'published'; } },
    sourceTextEN: { type: String, trim: true, required: true, minlength: 1, maxlength: 20000 },
    createdBy: { type: objectId, required: true },
  }, { ...options('poi_revisions'), timestamps: true });
  POIRevision.index({ poiId: 1, revisionNumber: 1 }, { unique: true });
  POIRevision.index({ location: '2dsphere' });
  POIRevision.index({ poiId: 1, status: 1 });
  POIRevision.index({ poiId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['draft', 'in_review'] } } });

  const LocalizedContent = new Schema({
    revisionId: { type: objectId, required: true },
    languageCode: { type: String, required: true, enum: languageCodes },
    sourceVersion: version(1), textVersion: version(1),
    text: { type: String, trim: true, default: null, minlength: 1, maxlength: 20000,
      required() { return this.reviewStatus === 'approved'; } },
    audioAsset: { type: audio, default: null, required() { return this.reviewStatus === 'approved'; }, validate: {
      validator(value) { return (value != null) === (this.durationSeconds != null)
        && (this.reviewStatus !== 'approved' || value?.textVersion === this.textVersion); }, message: 'Invalid audio state' } },
    durationSeconds: { type: Number, cast: false, default: null, validate: {
      validator(value) { return (value != null) === (this.audioAsset != null) && (value == null
        || Number.isFinite(value) && value > 0 && (this.reviewStatus !== 'approved' || value >= 90 && value <= 150)); }, message: 'Invalid duration' } },
    reviewStatus: { type: String, required: true, enum: ['pending', 'approved', 'changes_required'] },
    reviewedBy: { ...nullableId(), validate: {
      validator(value) { return this.reviewStatus === 'pending' ? value == null : value != null; }, message: 'Invalid reviewer' } },
    reviewedAt: { type: Date, default: null, validate: {
      validator(value) { return this.reviewStatus === 'pending' ? value == null : value != null && finiteDate(value); }, message: 'Invalid review date' } },
  }, options('localized_contents'));
  LocalizedContent.index({ revisionId: 1, languageCode: 1 }, { unique: true });
  return { POI, POIRevision, LocalizedContent };
}

/** Compiles models only; no default/global connection, catalog creation or Identity joins. */
export function createContentModels(connection) {
  return Object.fromEntries(Object.entries(createContentSchemas()).map(([name, schema]) =>
    [name, connection.models[name] ?? connection.model(name, schema)]));
}
const fields = new Set(['mutationVersion', 'publishedRevisionId', 'deletedAt', 'deletedBy', 'poiId', 'revisionNumber', 'editVersion', 'sourceVersion',
  'status', 'nameEN', 'location', 'entrance', 'thumbnailAsset', 'sourceTextEN', 'createdBy', 'revisionId', 'languageCode',
  'textVersion', 'text', 'audioAsset', 'durationSeconds', 'reviewStatus', 'reviewedBy', 'reviewedAt',
  ...['location', 'entrance'].flatMap(root => [`${root}.type`, `${root}.coordinates`, `${root}.coordinates.0`, `${root}.coordinates.1`]),
  ...['thumbnailAsset', 'audioAsset'].flatMap(root => ['publicId', 'url', 'format', 'textVersion', 'registryVersion', 'voiceOrModelId'].map(field => `${root}.${field}`))]);
export function safeContentError(error) {
  return { code: error?.code === 11000 ? 'CONTENT_DUPLICATE' : 'INVALID_CONTENT_DOCUMENT',
    fields: Object.keys(error?.errors ?? error?.keyPattern ?? {}).filter(field => fields.has(field)).sort() };
}
