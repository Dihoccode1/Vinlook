import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import mongoose from 'mongoose';
import { createCatalogModels, validateCatalogUri, operationHint, provisionCatalog, runCatalog } from '../src/catalog.js';

test('offline model manifest has nine collections, nineteen indexes, two partial and one geo', async () => {
  const connection = mongoose.createConnection();
  try {
    const models = createCatalogModels(connection), indexes = Object.values(models).flatMap(m => m.schema.indexes());
    assert.equal(Object.keys(models).length, 9);
    assert.equal(indexes.length, 19);
    assert.equal(indexes.filter(([, options]) => options.partialFilterExpression).length, 2);
    assert.equal(indexes.filter(([key]) => Object.values(key).includes('2dsphere')).length, 1);
    assert.equal(connection.readyState, 0);
  } finally { await connection.close(); }
});

test('strict URI diagnostics reject wrong DB and redact all entered values', () => {
  const cases = [
    ['', 'EMPTY_INPUT'], ['x'.repeat(4097), 'INPUT_TOO_LONG'], ['"mongodb://private:secret@localhost/vinlook_content"', 'WRAPPING_QUOTES'],
    ['mongodb://private:secret@localhost/vinlook_content ', 'WHITESPACE'], ['mongodb+srv://<username>:<password>@fixture.invalid/', 'PLACEHOLDER_OR_ANGLE_BRACKET'],
    ['private-secret', 'MALFORMED_URI'], ['https://private:secret@localhost/vinlook_content', 'INVALID_SCHEME'],
    ['mongodb://private:secret@localhost/vinlook_content#secret', 'FRAGMENT_OR_UNENCODED_HASH'],
    ['mongodb://private:secret@localhost/vinlook_identity', 'DATABASE_PATH_MUST_BE_VINLOOK_CONTENT'],
    ['mongodb://private:secret@localhost/vinlook_content_task025', 'DATABASE_PATH_MUST_BE_VINLOOK_CONTENT'],
  ];
  for (const [uri, hint] of cases) assert.throws(() => validateCatalogUri(uri), error => {
    assert.equal(error.code, 'CATALOG_INVALID_URI'); assert.equal(error.hint, hint);
    assert.ok(!JSON.stringify(error).includes('private')); assert.ok(!JSON.stringify(error).includes('secret')); return true;
  });
  const uri = 'mongodb+srv://fixture:p%23ss@cluster.example.invalid/vinlook_content?retryWrites=true&w=majority';
  assert.equal(validateCatalogUri(uri), uri);
});

test('wrong flags/URI/confirmation never connect; visible input is explicit', async () => {
  const forbidden = () => assert.fail('must not connect');
  await assert.rejects(runCatalog(['--uri=private'], { connect: forbidden }), { code: 'CATALOG_INVALID_ARGUMENTS' });
  await assert.rejects(runCatalog([], { prompt: async () => 'mongodb://localhost/admin', connect: forbidden }), { code: 'CATALOG_INVALID_URI' });
  await assert.rejects(runCatalog(['--apply'], { prompt: async (label, secret) => {
    if (label.startsWith('Content')) { assert.equal(secret, false); return 'mongodb://localhost/vinlook_content'; }
    return 'vinlook_identity';
  }, connect: forbidden }), { code: 'CATALOG_CONFIRMATION_REQUIRED' });
});

test('driver categories are fixed and nested auth/DNS takes precedence over timeout', () => {
  for (const [cause, hint] of [[{ code: 18 }, 'AUTHENTICATION_FAILED'], [{ code: 13 }, 'DATABASE_PERMISSION_DENIED'],
    [{ code: 11000 }, 'EXISTING_DATA_PREVENTS_UNIQUE_INDEX'], [{ code: 'ENOTFOUND' }, 'DNS_LOOKUP_FAILED'],
    [{ code: 'CERT_HAS_EXPIRED' }, 'TLS_CERTIFICATE_FAILED'], [{ code: 'EACCES' }, 'LOCAL_NETWORK_PERMISSION_DENIED'],
    [{ name: 'MongoParseError' }, 'CONNECTION_OPTIONS_INVALID'], [{ code: 'ECONNREFUSED' }, 'CONNECTION_UNREACHABLE_OR_TIMEOUT']]) {
    assert.equal(operationHint({ name: 'MongoServerSelectionError', reason: { servers: new Map([['private-host', { error: { ...cause, message: 'private secret' } }]]) } }), hint);
  }
  const cyclic = { message: 'private secret' }; cyclic.cause = cyclic;
  assert.equal(operationHint(cyclic), 'UNCLASSIFIED_DATABASE_ERROR');
});

test('failed connection closes and emits no URI/provider detail', async () => {
  let closed = 0;
  await assert.rejects(runCatalog([], { prompt: async () => 'mongodb://private:secret@localhost/vinlook_content', output: () => assert.fail('no output'),
    connect: () => ({ asPromise: async () => { throw Object.assign(new Error('private secret'), { code: 18 }); }, close: async () => { closed++; } }),
  }), error => error.hint === 'AUTHENTICATION_FAILED' && !JSON.stringify(error).includes('secret'));
  assert.equal(closed, 1);
});

function fakeCatalog() {
  const entries = new Map(), writes = [];
  const connection = { db: {
    listCollections: () => ({ toArray: async () => [...entries].map(([name, value]) => ({ name, type: 'collection', options: value.options ?? {} })) }),
    createCollection: async name => { writes.push(name); entries.set(name, { indexes: [{ name: '_id_', key: { _id: 1 } }], rows: [] }); },
  } };
  const model = name => ({ collection: { name, indexes: async () => entries.get(name).indexes,
    find: () => ({ async *[Symbol.asyncIterator]() { yield* entries.get(name).rows; }, close: async () => {} }),
    createIndex: async key => { writes.push('index'); entries.get(name).indexes.push({ name: 'x_1', key }); },
  }, schema: { indexes: () => [[{ x: 1 }, {}]] } });
  return { connection, models: { POI: model('pois'), Other: model('other') }, entries, writes };
}

test('default plan never writes; unexpected collections and POI version fail before any creation', async () => {
  const { connection, models, entries, writes } = fakeCatalog();
  assert.equal((await provisionCatalog(connection, models)).operations.length, 4);
  assert.deepEqual(writes, []);
  entries.set('foreign', { indexes: [], rows: [] });
  await assert.rejects(provisionCatalog(connection, models, { apply: true }), { code: 'CATALOG_CONFLICT', completed: 0 });
  entries.delete('foreign'); entries.set('pois', { indexes: [{ name: '_id_', key: { _id: 1 } }], rows: [{ mutationVersion: -1 }] });
  await assert.rejects(provisionCatalog(connection, models, { apply: true }), { code: 'CATALOG_DATA_MIGRATION_REQUIRED', completed: 0 });
  assert.deepEqual(writes, []);
});

test('partial DDL failure reports completed operations and leaves inspectable remaining plan', async () => {
  const { connection, models, writes } = fakeCatalog();
  const create = connection.db.createCollection;
  connection.db.createCollection = async name => { if (name === 'other') throw new Error('private provider details'); return create(name); };
  await assert.rejects(provisionCatalog(connection, models, { apply: true }), { code: 'CATALOG_OPERATION_FAILED', completed: 2 });
  assert.deepEqual(writes, ['pois', 'index']);
  assert.deepEqual((await provisionCatalog(connection, models)).operations.map(op => op.collection), ['other', 'other']);
});

test('actual CLI help is no-DB; redirected input fails closed; DNS launcher refuses apply', () => {
  const cli = 'services/content/scripts/catalog.js';
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0); assert.match(help.stdout, /read-only plan/);
  const rejected = spawnSync(process.execPath, [cli], { input: 'mongodb://private:secret@localhost/vinlook_content\n', encoding: 'utf8' });
  assert.equal(rejected.status, 1); assert.equal(JSON.parse(rejected.stderr).error, 'CATALOG_INPUT_FAILED');
  assert.ok(!(rejected.stdout + rejected.stderr).includes('secret'));
  const dns = spawnSync(process.execPath, ['services/content/scripts/catalog-dns-google.js', '--apply'], { encoding: 'utf8' });
  assert.equal(dns.status, 1); assert.equal(JSON.parse(dns.stderr).error, 'CATALOG_READ_ONLY_LAUNCHER');
});
