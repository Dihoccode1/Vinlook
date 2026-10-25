import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import mongoose from 'mongoose';
import { createIdentityModels } from '../src/models/index.js';
import { verifyIdentityIndexes } from '../src/auth/runtime.js';
import { provisionCatalog, runCatalog } from '../src/catalog.js';

let connection;
let models;
let uri;
before(async () => {
  const name = process.env.VINLOOK_TEST_MONGO_CONTAINER;
  assert.match(name ?? '', /^vinlook-task025-mongo-[a-zA-Z0-9_-]+$/);
  const [container] = JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8' }));
  assert.equal(container.Config.Labels['vinlook.task'], 'TASK-025');
  assert.equal(container.Config.Image, 'mongo@sha256:4a4ab5d4834207389e0d7270fac988e21ffedccecba77991a552f755df229907');
  const [binding] = container.NetworkSettings.Ports['27017/tcp'];
  assert.equal(binding.HostIp, '127.0.0.1');
  assert.match(binding.HostPort, /^[0-9]+$/);
  // Exact production DB name is used ONLY inside this fresh task-owned disposable container.
  // No caller-supplied URI, environment URI or Atlas credentials are accepted.
  uri = `mongodb://127.0.0.1:${binding.HostPort}/vinlook_identity?replicaSet=vinlook_task025&directConnection=true`;
  connection = await mongoose.createConnection(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 5000 }).asPromise();
  assert.equal((await connection.db.admin().command({ hello: 1 })).setName, 'vinlook_task025');
  assert.equal((await connection.db.listCollections().toArray()).length, 0);
  models = createIdentityModels(connection);
});
after(async () => { await connection?.close(); });

test('fresh default plan is read-only; apply creates exact catalog, rerun is a no-op', async () => {
  const output = [];
  await runCatalog([], { prompt: async () => uri, output: line => output.push(JSON.parse(line)) });
  assert.equal(output[0].mode, 'plan');
  assert.equal(output[0].operations.filter(op => op.kind === 'collection').length, 5);
  assert.equal(output[0].operations.filter(op => op.kind === 'index').length, 8);
  assert.equal((await connection.db.listCollections().toArray()).length, 0);
  const result = await runCatalog(['--apply'], { prompt: async label => label.startsWith('Identity') ? uri : 'vinlook_identity', output: () => {} });
  assert.equal(result.completed, 13);
  await verifyIdentityIndexes(models);
  assert.equal((await provisionCatalog(models)).complete, true);
  assert.equal((await provisionCatalog(models, { apply: true })).completed, 0);
});

test('existing documents and unrelated collections are untouched', async () => {
  await connection.db.createCollection('unrelated');
  await connection.db.collection('unrelated').insertOne({ fixture: 'keep' });
  await models.StaffAccount.collection.insertOne({ email: 'fixture@example.invalid', fixture: 'keep' });
  await provisionCatalog(models, { apply: true });
  assert.equal((await connection.db.collection('unrelated').findOne({})).fixture, 'keep');
  assert.equal((await models.StaffAccount.collection.findOne({})).fixture, 'keep');
});

test('a conflicting final collection prevents creating an earlier missing collection', async () => {
  // Explicitly disposable fixtures only; production utility has no drop/repair operations.
  await models.StaffAccount.collection.drop();
  await models.AuthRateLimit.collection.createIndex({ unexpected: 1 });
  await assert.rejects(provisionCatalog(models, { apply: true }), { code: 'CATALOG_CONFLICT', completed: 0 });
  assert.equal((await connection.db.listCollections({ name: 'staff_accounts' }).toArray()).length, 0);
});
