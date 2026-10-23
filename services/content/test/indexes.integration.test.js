import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';
import { createContentModels, languageCodes, safeContentError } from '../src/models/index.js';
import { revision, localized, point, asset } from './fixtures.js';
let connection, models;
const published = overrides => revision({ status: 'published', entrance: point(), thumbnailAsset: asset(), ...overrides });
before(async () => {
  const name = process.env.VINLOOK_TEST_MONGO_CONTAINER;
  assert.match(name ?? '', /^vinlook-task011-mongo-[A-Za-z0-9_-]+$/);
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }));
  assert.equal(container.Config.Labels['vinlook.task'], 'TASK-011');
  assert.equal(container.Config.Image, 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');
  const [binding] = container.NetworkSettings.Ports['27017/tcp'];
  assert.equal(binding.HostIp, '127.0.0.1'); assert.match(binding.HostPort, /^[0-9]+$/);
  const uri = `mongodb://127.0.0.1:${binding.HostPort}/vinlook_content_task011?replicaSet=vinlook_task011&directConnection=true`;
  connection = await mongoose.createConnection(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 3000 }).asPromise();
  assert.equal((await connection.db.listCollections().toArray()).length, 0, 'Fresh isolated task DB required');
  assert.equal((await connection.db.admin().command({ hello: 1 })).setName, 'vinlook_task011');
  models = createContentModels(connection);
  for (const model of Object.values(models)) { await model.createCollection(); await model.createIndexes(); }
});
after(async () => { if (connection) await connection.close(); });

test('actual collections/catalog have approved partial/unique/geo indexes and no TTL', async () => {
  assert.deepEqual((await connection.db.listCollections().toArray()).map(x => x.name).sort(), ['localized_contents', 'poi_revisions', 'pois']);
  for (const model of Object.values(models)) {
    const indexes = await model.collection.indexes();
    assert.equal(indexes.filter(x => x.expireAfterSeconds !== undefined).length, 0);
    assert.equal(indexes.length, model.schema.indexes().length + 1);
    for (const [key, options] of model.schema.indexes()) {
      const actual = indexes.find(x => JSON.stringify(x.key) === JSON.stringify(key)); assert.ok(actual);
      assert.equal(Boolean(actual.unique), Boolean(options.unique));
      if (options.partialFilterExpression) assert.deepEqual(actual.partialFilterExpression, options.partialFilterExpression);
    }
  }
  const poi = await models.POI.create({}); assert.ok(poi.createdAt instanceof Date); assert.equal(poi.get('updatedAt'), undefined); assert.equal(poi.get('__v'), undefined);
});

test('revision number uniqueness is per POI while multiple published revisions remain possible', async () => {
  const input = published();
  const record = await models.POIRevision.create(input);
  await assert.rejects(models.POIRevision.create({ ...input }), error => error.code === 11000 && safeContentError(error).fields.includes('revisionNumber'));
  await models.POIRevision.create({ ...input, revisionNumber: 2 });
  await models.POIRevision.create({ ...input, poiId: new mongoose.Types.ObjectId() });
  assert.ok(record.createdAt instanceof Date); assert.ok(record.updatedAt instanceof Date);
});

test('concurrent draft versus in_review has exactly one working winner; publishing releases only that slot', async () => {
  const poiId = new mongoose.Types.ObjectId();
  const results = await Promise.allSettled([
    models.POIRevision.create(revision({ poiId, revisionNumber: 1, status: 'draft' })),
    models.POIRevision.create(revision({ poiId, revisionNumber: 2, status: 'in_review' })),
  ]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  const rejected = results.find(x => x.status === 'rejected').reason; assert.equal(rejected.code, 11000); assert.deepEqual(rejected.keyPattern, { poiId: 1 });
  const winner = results.find(x => x.status === 'fulfilled').value;
  winner.status = 'published'; winner.entrance = point(); winner.thumbnailAsset = asset(); await winner.save();
  const next = await models.POIRevision.create(revision({ poiId, revisionNumber: 3 }));
  next.status = 'in_review'; await next.save();
  await assert.rejects(models.POIRevision.create(revision({ poiId, revisionNumber: 4 })), { code: 11000 });
  await models.POIRevision.create(published({ poiId, revisionNumber: 5 }));
  assert.equal(await models.POIRevision.countDocuments({ poiId, status: 'published' }), 2);
  assert.equal(await models.POIRevision.countDocuments({ poiId, status: { $in: ['draft', 'in_review'] } }), 1);
  assert.ok(await models.POIRevision.findById(winner._id));
});

test('revision/language unique index is independent of text version, allowing all16 languages and other revisions', async () => {
  const revisionId = new mongoose.Types.ObjectId();
  await models.LocalizedContent.create(languageCodes.map(languageCode => localized({ revisionId, languageCode })));
  assert.equal(await models.LocalizedContent.countDocuments({ revisionId }), 16);
  await assert.rejects(models.LocalizedContent.create(localized({ revisionId, languageCode: 'en', textVersion: 2 })), { code: 11000 });
  await models.LocalizedContent.create(localized({ revisionId: new mongoose.Types.ObjectId(), languageCode: 'en' }));
  await assert.rejects(models.LocalizedContent.create(localized({ revisionId, languageCode: 'unknown' })));
});

test('2dsphere indexes actual GeoJSON and rejects invalid raw geometry; schema bypass is not publication enforcement', async () => {
  const input = published(); await models.POIRevision.create(input);
  const nearby = await models.POIRevision.find({ location: { $near: { $geometry: point(), $maxDistance: 20 } } });
  assert.ok(nearby.length >= 1);
  await assert.rejects(models.POIRevision.collection.insertOne({ ...published(), location: { type: 'Point', coordinates: [181, 10] } }), error => Number.isInteger(error.code));
  // This raw write intentionally proves model validators do not protect direct Mongo writes.
  const rawId = new mongoose.Types.ObjectId();
  await models.LocalizedContent.collection.insertOne({ _id: rawId, revisionId: new mongoose.Types.ObjectId(), languageCode: 'en', reviewStatus: 'approved' });
  assert.ok(await models.LocalizedContent.collection.findOne({ _id: rawId }));
});

test('Content-owned transaction abort rolls back POI, revision and localized records together', async () => {
  const session = await connection.startSession();
  const poiId = new mongoose.Types.ObjectId(); const revisionId = new mongoose.Types.ObjectId();
  try {
    session.startTransaction();
    await models.POI.create([{ _id: poiId }], { session });
    await models.POIRevision.create([{ ...revision({ poiId }), _id: revisionId }], { session });
    await models.LocalizedContent.create([localized({ revisionId })], { session });
    await session.abortTransaction();
    assert.equal(await models.POI.countDocuments({ _id: poiId }), 0);
    assert.equal(await models.POIRevision.countDocuments({ _id: revisionId }), 0);
    assert.equal(await models.LocalizedContent.countDocuments({ revisionId }), 0);
  } finally { if (session.inTransaction()) await session.abortTransaction(); await session.endSession(); }
});
