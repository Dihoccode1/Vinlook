import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { validateCatalogUri, planCatalog, provisionCatalog, runCatalog } from '../src/catalog.js';

test('URI and argument guards reject other databases and avoid connecting', async () => {
  for (const uri of ['mongodb://localhost/admin', 'mongodb://localhost/vinlook_content', 'mongodb://localhost/vinlook_identity_task025', 'mongodb://localhost/vinlook_identity#x', 'https://localhost/vinlook_identity', 'mongodb://localhost/vinlook_identity ']) {
    assert.throws(() => validateCatalogUri(uri), { code: 'CATALOG_INVALID_URI' });
  }
  assert.equal(validateCatalogUri('mongodb+srv://fixture:fake@cluster.example.invalid/vinlook_identity'), 'mongodb+srv://fixture:fake@cluster.example.invalid/vinlook_identity');
  const forbidden = () => assert.fail('must not connect');
  await assert.rejects(runCatalog(['--uri=secret'], { connect: forbidden }), { code: 'CATALOG_INVALID_ARGUMENTS' });
  await assert.rejects(runCatalog(['--apply'], { prompt: async label => label.startsWith('Identity') ? 'mongodb://localhost/vinlook_identity' : 'wrong', connect: forbidden }), { code: 'CATALOG_CONFIRMATION_REQUIRED' });
});

test('connection failure is sanitized and connection always closes', async () => {
  let closed = 0;
  await assert.rejects(runCatalog([], {
    prompt: async () => 'mongodb://fixture:secret@localhost/vinlook_identity', output: () => assert.fail('no output'),
    connect: () => ({ asPromise: async () => { throw new Error('fixture:secret'); }, close: async () => { closed++; } }),
  }), error => error.code === 'CATALOG_OPERATION_FAILED' && !JSON.stringify(error).includes('secret'));
  assert.equal(closed, 1);
});

test('real CLI help needs no DB; redirected secret input and URI arguments fail closed', () => {
  const cli = 'services/identity/scripts/catalog.js';
  const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Default: read-only plan/);
  const redirected = spawnSync(process.execPath, [cli], { input: 'mongodb://fixture:never-print@localhost/vinlook_identity\n', encoding: 'utf8' });
  assert.equal(redirected.status, 1);
  assert.equal(JSON.parse(redirected.stderr).error, 'CATALOG_INPUT_FAILED');
  assert.ok(!(redirected.stdout + redirected.stderr).includes('never-print'));
});

function fakeModels() {
  const existing = new Map();
  const writes = [];
  const model = name => ({ collection: { name,
    indexes: async () => existing.get(name).indexes,
    createIndex: async (key, options) => { writes.push(`index:${name}`); existing.get(name).indexes.push({ name: 'email_1', key, unique: options.unique }); },
  }, schema: { indexes: () => [[{ email: 1 }, { unique: true }]] }, db: { db: {
    listCollections: ({ name: target }) => ({ toArray: async () => existing.has(target) ? [{ name: target, type: 'collection', options: existing.get(target).options ?? {} }] : [] }),
    createCollection: async target => { writes.push(`collection:${target}`); existing.set(target, { indexes: [{ name: '_id_', key: { _id: 1 } }] }); },
  } } });
  return { models: { A: model('a'), B: model('b') }, existing, writes };
}

test('plan never writes and late-target conflicts block the entire apply', async () => {
  const { models, existing, writes } = fakeModels();
  assert.equal((await planCatalog(models)).length, 4);
  assert.deepEqual(writes, []);
  existing.set('b', { options: { validator: {} }, indexes: [] });
  await assert.rejects(provisionCatalog(models, { apply: true }), { code: 'CATALOG_CONFLICT', completed: 0 });
  assert.deepEqual(writes, []);
});

test('failed apply reports partial completion; plan exposes remaining work without deletion', async () => {
  const { models, writes } = fakeModels();
  models.B.db.db.createCollection = async () => { throw new Error('private provider body'); };
  await assert.rejects(provisionCatalog(models, { apply: true }), { code: 'CATALOG_OPERATION_FAILED', completed: 2 });
  assert.deepEqual(writes, ['collection:a', 'index:a']);
  const plan = await provisionCatalog(models);
  assert.deepEqual(plan.operations.map(op => op.collection), ['b', 'b']);
});

test('conflicting extra/name-collision indexes are rejected', async () => {
  for (const index of [{ name: 'other', key: { other: 1 } }, { name: 'email_1', key: { other: 1 } }, { name: 'email_1', key: { email: 1 } }, { name: 'email_1', key: { email: 1 }, unique: true, collation: { locale: 'en' } }]) {
    const { models, existing } = fakeModels();
    existing.set('a', { indexes: [{ name: '_id_', key: { _id: 1 } }, index] });
    await assert.rejects(planCatalog(models), { code: 'CATALOG_CONFLICT' });
  }
});
