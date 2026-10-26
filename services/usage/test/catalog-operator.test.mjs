import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog } from '../src/models.js';
import { catalogFingerprint } from '../src/catalog.js';
import { planCatalog, applyCatalog } from '../src/catalog-operator.js';

function fixture() {
  const rows = [], indexes = new Map(); let writes = 0;
  const connection = { name: 'vinlook_usage', db: {
    admin: () => ({ command: async () => ({ setName: 'fixture', isWritablePrimary: true }) }),
    listCollections: () => ({ toArray: async () => rows }),
    createCollection: async (name, options) => { writes++; rows.push({ name, type: 'collection', options }); indexes.set(name, [{ key: { _id: 1 } }]); },
    collection: name => ({ indexes: async () => indexes.get(name), createIndex: async (key, options) => {
      writes++; indexes.get(name).push({ key, ...options });
    } }),
  } };
  return { connection, rows, indexes, writes: () => writes };
}
test('plan is read-only; exact confirmation applies six additive operations and replans empty', async () => {
  const f = fixture();
  assert.equal((await planCatalog(f.connection)).operations.length, 6); assert.equal(f.writes(), 0);
  await assert.rejects(applyCatalog(f.connection, 'wrong')); assert.equal(f.writes(), 0);
  assert.deepEqual(await applyCatalog(f.connection, `vinlook_usage ${catalogFingerprint}`), { mode: 'apply', completed: 6, complete: true });
  assert.equal((await planCatalog(f.connection)).complete, true);
  assert.equal((await applyCatalog(f.connection, `vinlook_usage ${catalogFingerprint}`)).completed, 0);
});
test('wrong database, unexpected collection and incompatible validators are refused before writes', async () => {
  const f = fixture(); f.connection.name = 'wrong'; await assert.rejects(planCatalog(f.connection));
  f.connection.name = 'vinlook_usage'; f.rows.push({ name: 'foreign' }); await assert.rejects(planCatalog(f.connection));
  f.rows.length = 0; f.rows.push({ name: catalog[0].name, type: 'collection', options: {} });
  await assert.rejects(planCatalog(f.connection)); assert.equal(f.writes(), 0);
});
test('interruption reports completed writes; next plan resumes missing indexes without repair', async () => {
  const f = fixture(), original = f.connection.db.collection;
  f.connection.db.collection = name => ({ ...original(name), createIndex: async () => { throw Error('private URI'); } });
  await assert.rejects(applyCatalog(f.connection, `vinlook_usage ${catalogFingerprint}`), error =>
    error.message === 'USAGE_CATALOG_INCOMPLETE' && error.completed === 1 && !error.message.includes('private'));
  f.connection.db.collection = original;
  assert.equal((await planCatalog(f.connection)).operations.length, 5);
  await applyCatalog(f.connection, `vinlook_usage ${catalogFingerprint}`);
  f.indexes.get(catalog[0].name).push({ key: { unsafe: 1 }, expireAfterSeconds: 0 });
  await assert.rejects(planCatalog(f.connection));
});
