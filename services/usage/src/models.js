import mongoose from 'mongoose';
import { languageCodes, uuid, endReasons } from './policy.js';
const finite = value => value instanceof Date && Number.isFinite(value.getTime());
const date = (required = true) => ({ type: Date, required, validate: { validator: value => value === null && !required || finite(value), message: 'Invalid timestamp' } });
const options = collection => ({ collection, strict: 'throw', autoCreate: false, autoIndex: false, bufferCommands: false, versionKey: false });

export function createUsageModels(connection) {
  const presence = new mongoose.Schema({ browserId: { type: String, required: true, match: uuid }, lastSeenAt: date() }, options('browser_presences'));
  presence.index({ browserId: 1 }, { unique: true }); presence.index({ lastSeenAt: 1 });
  const listening = new mongoose.Schema({
    browserId: { type: String, required: true, match: uuid, immutable: true },
    playbackId: { type: String, required: true, match: uuid, immutable: true },
    poiId: { type: mongoose.Schema.Types.ObjectId, default: null, immutable: true },
    languageCode: { type: String, enum: [...languageCodes, null], default: null, immutable: true },
    startedAt: { ...date(false), default: null, immutable: true }, lastSeenAt: date(),
    endedAt: { ...date(false), default: null }, endReason: { type: String, enum: [...endReasons, null], default: null },
  }, options('listening_sessions'));
  listening.pre('validate', function () {
    if (this.startedAt === null) {
      if (this.poiId !== null || this.languageCode !== null || this.endedAt === null) this.invalidate('startedAt', 'Invalid tombstone');
    } else if (!this.poiId || !this.languageCode || !finite(this.startedAt) || this.startedAt > this.lastSeenAt) this.invalidate('startedAt', 'Invalid start');
    if (this.endedAt === null ? this.endReason !== null : !this.endReason || !finite(this.endedAt) || this.endedAt < this.lastSeenAt) this.invalidate('endedAt', 'Invalid end');
  });
  listening.index({ playbackId: 1 }, { unique: true }); listening.index({ browserId: 1, endedAt: 1, lastSeenAt: 1 });
  return { Presence: connection.models.UsagePresence ?? connection.model('UsagePresence', presence),
    Listening: connection.models.UsageListening ?? connection.model('UsageListening', listening) };
}

const id = { bsonType: 'string', pattern: uuid.source };
const nullableDate = { bsonType: ['date', 'null'] };
export const catalog = Object.freeze([
  { name: 'browser_presences', validator: { $jsonSchema: { bsonType: 'object', additionalProperties: false,
    required: ['_id', 'browserId', 'lastSeenAt'], properties: { _id: { bsonType: 'objectId' }, browserId: id, lastSeenAt: { bsonType: 'date' } } } },
    indexes: [{ key: { browserId: 1 }, unique: true }, { key: { lastSeenAt: 1 } }] },
  { name: 'listening_sessions', validator: { $and: [
    { $jsonSchema: { bsonType: 'object', additionalProperties: false,
      required: ['_id', 'browserId', 'playbackId', 'poiId', 'languageCode', 'startedAt', 'lastSeenAt', 'endedAt', 'endReason'],
      properties: { _id: { bsonType: 'objectId' }, browserId: id, playbackId: id,
        poiId: { bsonType: ['objectId', 'null'] }, languageCode: { enum: [...languageCodes, null] },
        startedAt: nullableDate, lastSeenAt: { bsonType: 'date' }, endedAt: nullableDate, endReason: { enum: [...endReasons, null] } },
      allOf: [{ anyOf: [
        { properties: { startedAt: { bsonType: 'date' }, poiId: { bsonType: 'objectId' }, languageCode: { enum: languageCodes } } },
        { properties: { startedAt: { bsonType: 'null' }, poiId: { bsonType: 'null' }, languageCode: { bsonType: 'null' }, endedAt: { bsonType: 'date' } } },
      ] }, { anyOf: [
        { properties: { endedAt: { bsonType: 'null' }, endReason: { bsonType: 'null' } } },
        { properties: { endedAt: { bsonType: 'date' }, endReason: { enum: endReasons } } },
      ] }] } },
    { $expr: { $and: [{ $or: [{ $eq: ['$startedAt', null] }, { $lte: ['$startedAt', '$lastSeenAt'] }] },
      { $or: [{ $eq: ['$endedAt', null] }, { $gte: ['$endedAt', '$lastSeenAt'] }] }] } },
  ] }, indexes: [{ key: { playbackId: 1 }, unique: true }, { key: { browserId: 1, endedAt: 1, lastSeenAt: 1 } }] },
]);
