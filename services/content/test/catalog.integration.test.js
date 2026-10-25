import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';
import { createCatalogModels, provisionCatalog, runCatalog } from '../src/catalog.js';
import { verifyContentCatalog } from '../src/drafts/runtime.js';

let connection, models, uri;
const oid = () => new mongoose.Types.ObjectId();
before(async () => {
  const name = process.env.VINLOOK_TEST_MONGO_CONTAINER;
  assert.match(name ?? '', /^vinlook-task025-mongo-[a-zA-Z0-9_-]+$/);
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }));
  assert.equal(container.Config.Labels['vinlook.task'], 'TASK-025');
  assert.equal(container.Config.Image, 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');
  const [binding] = container.NetworkSettings.Ports['27017/tcp'];
  assert.equal(binding.HostIp, '127.0.0.1'); assert.match(binding.HostPort, /^[0-9]+$/);
  // Only the fresh runner-owned disposable container; no supplied URI or Atlas credential.
  uri = `mongodb://127.0.0.1:${binding.HostPort}/vinlook_content?replicaSet=vinlook_task025&directConnection=true`;
  connection = await mongoose.createConnection(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 5000 }).asPromise();
  assert.equal((await connection.db.admin().command({ hello: 1 })).setName, 'vinlook_task025');
  assert.equal((await connection.db.listCollections().toArray()).length, 0);
  models = createCatalogModels(connection);
});
after(async () => { await connection?.close(); });

test('actual CLI plan does not create; apply creates 9 collections/19 indexes, verifies and reruns zero', async () => {
  const plans = [];
  await runCatalog([], { prompt: async () => uri, output: line => plans.push(JSON.parse(line)) });
  assert.equal(plans[0].operations.filter(op => op.kind === 'collection').length, 9);
  assert.equal(plans[0].operations.filter(op => op.kind === 'index').length, 19);
  assert.equal((await connection.db.listCollections().toArray()).length, 0);
  const result = await runCatalog(['--apply'], { prompt: async label => label.startsWith('Content') ? uri : 'vinlook_content', output: () => {} });
  assert.deepEqual(result, { mode: 'apply', completed: 28, complete: true });
  await verifyContentCatalog(connection, models);
  assert.equal((await provisionCatalog(connection, models, { apply: true })).completed, 0);
  assert.deepEqual(await provisionCatalog(connection, models), { mode: 'plan', operations: [], complete: true });
});

test('both partial unique indexes enforce active-state uniqueness and geo index serves real near query', async () => {
  const poiId = oid(), revisionId = oid();
  // Raw records intentionally isolate database index behavior, not schema validation.
  await models.POIRevision.collection.insertOne({ poiId, revisionNumber: 1, status: 'draft', location: { type: 'Point', coordinates: [106.7, 10.77] } });
  await assert.rejects(models.POIRevision.collection.insertOne({ poiId, revisionNumber: 2, status: 'in_review' }), { code: 11000 });
  await models.POIRevision.collection.insertOne({ poiId, revisionNumber: 3, status: 'published' });
  await models.ProcessingJob.collection.insertOne({ revisionId, languageCode: 'en', taskType: 'audio', status: 'queued' });
  await assert.rejects(models.ProcessingJob.collection.insertOne({ revisionId, languageCode: 'en', taskType: 'audio', status: 'running' }), { code: 11000 });
  await models.ProcessingJob.collection.insertOne({ revisionId, languageCode: 'en', taskType: 'audio', status: 'succeeded' });
  const near = await models.POIRevision.collection.find({ location: { $near: { $geometry: { type: 'Point', coordinates: [106.7, 10.77] }, $maxDistance: 100 } } }).toArray();
  assert.equal(near.length, 1);
  await models.POI.collection.insertOne({ mutationVersion: 0, fixture: 'keep' });
  await provisionCatalog(connection, models, { apply: true });
  assert.equal((await models.POI.collection.findOne({ fixture: 'keep' })).mutationVersion, 0);
});

test('unexpected collection blocks apply and is never deleted', async () => {
  await connection.db.createCollection('foreign');
  await connection.db.collection('foreign').insertOne({ fixture: 'keep' });
  await assert.rejects(provisionCatalog(connection, models, { apply: true }), { code: 'CATALOG_CONFLICT', completed: 0 });
  assert.equal((await connection.db.collection('foreign').findOne({})).fixture, 'keep');
  await connection.db.collection('foreign').drop(); // Disposable fixture cleanup only.
});

test('missing/invalid POI version blocks even an earlier pending index; no migration is attempted', async () => {
  const invalid = await models.POI.collection.insertOne({ fixture: 'invalid' });
  await models.POI.collection.dropIndex('deletedAt_1');
  await assert.rejects(provisionCatalog(connection, models, { apply: true }), { code: 'CATALOG_DATA_MIGRATION_REQUIRED', completed: 0 });
  assert.equal((await models.POI.collection.indexes()).some(i => i.name === 'deletedAt_1'), false);
  assert.equal((await models.POI.collection.findOne({ _id: invalid.insertedId })).mutationVersion, undefined);
  await models.POI.collection.deleteOne({ _id: invalid.insertedId }); // Disposable invalid fixture only.
  assert.equal((await provisionCatalog(connection, models, { apply: true })).completed, 1);
});

test('conflicting partial and geo definitions are rejected without replacement', async () => {
  await models.POIRevision.collection.dropIndex('poiId_1');
  await models.POIRevision.collection.createIndex({ poiId: 1 }, { unique: true, partialFilterExpression: { status: 'draft' } });
  const conflict = (await models.POIRevision.collection.indexes()).find(i => i.name === 'poiId_1');
  await assert.rejects(provisionCatalog(connection, models, { apply: true }), { code: 'CATALOG_CONFLICT', completed: 0 });
  assert.deepEqual((await models.POIRevision.collection.indexes()).find(i => i.name === 'poiId_1'), conflict);
  await models.POIRevision.collection.dropIndex('poiId_1');
  await provisionCatalog(connection, models, { apply: true });
  await models.POIRevision.collection.dropIndex('location_2dsphere');
  await models.POIRevision.collection.createIndex({ location: 1 });
  await assert.rejects(provisionCatalog(connection, models, { apply: true }), { code: 'CATALOG_CONFLICT', completed: 0 });
  assert.ok((await models.POIRevision.collection.indexes()).some(i => i.name === 'location_1'));
  await models.POIRevision.collection.dropIndex('location_1');
  await provisionCatalog(connection, models, { apply: true });
});

test('existing duplicates fail unique-index build safely and preserve all documents', async () => {
  await models.AuditOutbox.collection.dropIndex('eventId_1');
  await models.AuditOutbox.collection.insertMany([{ eventId: 'fixture-duplicate' }, { eventId: 'fixture-duplicate' }]);
  await assert.rejects(provisionCatalog(connection, models, { apply: true }), error => error.code === 'CATALOG_OPERATION_FAILED'
    && error.hint === 'EXISTING_DATA_PREVENTS_UNIQUE_INDEX' && error.completed === 0);
  assert.equal(await models.AuditOutbox.collection.countDocuments({ eventId: 'fixture-duplicate' }), 2);
  assert.equal((await provisionCatalog(connection, models)).operations.length, 1);
  await models.AuditOutbox.collection.deleteOne({ eventId: 'fixture-duplicate' }); // Fixture-only duplicate removal, not utility behavior.
  await provisionCatalog(connection, models, { apply: true });
});

test('conflict in final target blocks recreation of an earlier missing collection', async () => {
  await models.POI.collection.drop(); // All destructive calls confined to this verified disposable container.
  await models.ProviderControl.collection.createIndex({ unexpected: 1 });
  await assert.rejects(provisionCatalog(connection, models, { apply: true }), { code: 'CATALOG_CONFLICT', completed: 0 });
  assert.equal((await connection.db.listCollections({ name: 'pois' }).toArray()).length, 0);
});
