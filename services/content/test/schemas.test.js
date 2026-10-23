import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import mongoose from 'mongoose';
import { createContentModels, languageCodes, safeContentError } from '../src/models/index.js';
import { point, asset, revision, localized, approved } from './fixtures.js';
const connection = mongoose.createConnection();
const models = createContentModels(connection);
after(() => connection.close());
const rejects = async (model, input) => assert.rejects(async () => { await new models[model](input).validate(); });

test('isolated factories retain explicit collections/options/defaults without connecting or writing catalog', async () => {
  assert.equal(connection.readyState, 0);
  assert.equal(createContentModels(connection).POI, models.POI);
  for (const [name, model] of Object.entries(models)) {
    assert.equal(model.schema.options.autoCreate, false); assert.equal(model.schema.options.autoIndex, false);
    assert.equal(model.schema.options.bufferCommands, false); assert.equal(model.schema.options.versionKey, false);
    assert.equal(model.schema.options.strict, 'throw'); assert.ok(model.collection.name);
  }
  await new models.POI({}).validate(); await new models.POIRevision(revision()).validate(); await new models.LocalizedContent(localized()).validate();
  const doc = new models.POIRevision(revision()); assert.equal(doc.entrance, null); assert.equal(doc.thumbnailAsset, null); assert.equal(doc.location._id, undefined);
});

test('soft deletion pairs, IDs, dates and strict top/nested allowlists reject invalid documents', async () => {
  for (const value of [{ deletedAt: new Date() }, { deletedBy: new mongoose.Types.ObjectId() }, { deletedAt: 'invalid', deletedBy: new mongoose.Types.ObjectId() },
    { publishedRevisionId: 'bad' }, { providerSecret: 'synthetic-sensitive-value' }]) await rejects('POI', value);
  await new models.POI({ deletedAt: new Date(), deletedBy: new mongoose.Types.ObjectId() }).validate();
  await rejects('POIRevision', revision({ location: { ...point(), elevation: 12 } }));
  await rejects('POIRevision', revision({ thumbnailAsset: { ...asset(), apiKey: 'synthetic-sensitive-value' } }));
});

test('GeoJSON requires exact finite numeric lon/lat and does not coerce strings or add an entrance', async () => {
  for (const coordinates of [['106.7', 10.78], [106.7, '10.78'], [181, 0], [0, 91], [NaN, 0], [Infinity, 0], [], [106.7], [106.7, 10.78, 1]]) {
    await rejects('POIRevision', revision({ location: { type: 'Point', coordinates } }));
  }
  await rejects('POIRevision', revision({ location: { type: 'LineString', coordinates: [106.7, 10.78] } }));
  await rejects('POIRevision', revision({ location: null }));
  await new models.POIRevision(revision({ location: { type: 'Point', coordinates: [180, -90] } })).validate();
});

test('revision name/source/version/status bounds and published metadata are document constraints', async () => {
  for (const patch of [{ revisionNumber: 0 }, { sourceVersion: 0 }, { editVersion: -1 }, { editVersion: 1.5 }, { sourceVersion: Number.MAX_SAFE_INTEGER + 1 },
    { revisionNumber: '1' }, { nameEN: ' ' }, { nameEN: '😀'.repeat(201) }, { sourceTextEN: 'x'.repeat(20001) }, { status: 'archived' },
    { status: 'published' }, { createdBy: 'invalid' }]) await rejects('POIRevision', revision(patch));
  await new models.POIRevision(revision({ nameEN: '😀'.repeat(200), status: 'published', entrance: point(), thumbnailAsset: asset() })).validate();
});

test('asset HTTPS/identifier/format/version shapes reject credential URLs, controls and unknown fields', async () => {
  for (const patch of [{ url: 'http://media.example.invalid/x' }, { url: 'https://user:secret@media.example.invalid/x' },
    { url: 'https://media.example.invalid/x?key=secret' }, { url: 'https://media.example.invalid/x#fragment' },
    { publicId: 'bad\nidentifier' }, { format: 'WAV' }]) await rejects('POIRevision', revision({ thumbnailAsset: { ...asset(), ...patch } }));
  const fixture = approved();
  for (const patch of [{ textVersion: 0 }, { registryVersion: 'bad registry' }, { voiceOrModelId: 'bad\nmodel' }, { binary: 'payload' }]) {
    await rejects('LocalizedContent', { ...fixture, audioAsset: { ...fixture.audioAsset, ...patch } });
  }
});

test('exact16 languages and localization nullability/review/approval/audio version boundaries', async () => {
  assert.equal(languageCodes.length, 16); assert.equal(new Set(languageCodes).size, 16);
  for (const languageCode of languageCodes) await new models.LocalizedContent(localized({ languageCode })).validate();
  for (const patch of [{ languageCode: 'zh' }, { sourceVersion: 0 }, { textVersion: -1 }, { reviewedBy: new mongoose.Types.ObjectId() },
    { reviewedAt: new Date() }, { reviewStatus: 'changes_required' }, { audioAsset: approved().audioAsset }, { durationSeconds: 120 }, { text: '' }]) {
    await rejects('LocalizedContent', localized(patch));
  }
  for (const durationSeconds of [90, 150]) await new models.LocalizedContent(approved({ durationSeconds })).validate();
  for (const patch of [{ text: null }, { durationSeconds: 89.99 }, { durationSeconds: 150.01 }, { durationSeconds: NaN }, { durationSeconds: Infinity },
    { reviewedBy: null }, { reviewedAt: null }, { audioAsset: null }, { textVersion: 2 }]) await rejects('LocalizedContent', approved(patch));
  await new models.LocalizedContent(localized({ textVersion: 2, audioAsset: approved().audioAsset, durationSeconds: 159 })).validate();
  await new models.LocalizedContent(localized({ reviewStatus: 'changes_required', reviewedBy: new mongoose.Types.ObjectId(), reviewedAt: new Date() })).validate();
});

test('safe errors expose only stable codes/known paths and never rejected values or raw exceptions', async () => {
  try { await new models.POIRevision(revision({ sourceTextEN: 'x'.repeat(20001), createdBy: 'synthetic-sensitive-value' })).validate(); assert.fail(); }
  catch (error) {
    const safe = safeContentError(error); assert.equal(safe.code, 'INVALID_CONTENT_DOCUMENT'); assert.ok(safe.fields.includes('createdBy'));
    assert.equal(JSON.stringify(safe).includes('synthetic-sensitive-value'), false);
  }
  assert.deepEqual(safeContentError({ code: 11000, keyPattern: { poiId: 1, unknownSecret: 1 }, message: 'synthetic-sensitive-value' }),
    { code: 'CONTENT_DUPLICATE', fields: ['poiId'] });
});
