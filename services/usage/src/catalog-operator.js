import { catalog } from './models.js';
import { catalogFingerprint, verifyUsageCatalog } from './catalog.js';
const canonical = value => JSON.stringify(value, function (key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(name => [name, item[name]])) : item;
});
const refuse = () => { throw Error('USAGE_CATALOG_REFUSED'); };

/** Additive provisioning only. No records, validator repairs or index replacements. */
export async function planCatalog(connection) {
  if (connection.name !== 'vinlook_usage') refuse();
  const hello = await connection.db.admin().command({ hello: 1 });
  if (!hello.setName || hello.isWritablePrimary !== true) refuse();
  const rows = await connection.db.listCollections({}, { nameOnly: false }).toArray();
  if (rows.some(row => !catalog.some(expected => expected.name === row.name))) refuse();
  const operations = [];
  for (const expected of catalog) {
    const row = rows.find(item => item.name === expected.name);
    let indexes = [];
    if (!row) operations.push({ kind: 'collection', collection: expected.name });
    else {
      const options = row.options ?? {};
      if (row.type !== 'collection' || options.validationLevel !== 'strict' || options.validationAction !== 'error'
        || Object.keys(options).some(key => !['validator', 'validationLevel', 'validationAction'].includes(key))
        || canonical(options.validator) !== canonical(expected.validator)) refuse();
      indexes = await connection.db.collection(expected.name).indexes();
      if (!indexes.some(index => JSON.stringify(index.key) === '{"_id":1}')) refuse();
      for (const index of indexes) {
        if (JSON.stringify(index.key) === '{"_id":1}') continue;
        const match = expected.indexes.find(item => JSON.stringify(item.key) === JSON.stringify(index.key));
        if (!match || Boolean(match.unique) !== Boolean(index.unique) || index.sparse || index.hidden
          || index.collation || index.partialFilterExpression || index.expireAfterSeconds !== undefined) refuse();
      }
    }
    for (const index of expected.indexes) if (!indexes.some(item => JSON.stringify(item.key) === JSON.stringify(index.key))) {
      operations.push({ kind: 'index', collection: expected.name, key: index.key, unique: Boolean(index.unique) });
    }
  }
  return { fingerprint: catalogFingerprint, operations, complete: operations.length === 0 };
}

export async function applyCatalog(connection, confirmation) {
  if (confirmation !== `vinlook_usage ${catalogFingerprint}`) refuse();
  const plan = await planCatalog(connection);
  let completed = 0;
  try {
    for (const operation of plan.operations) {
      const expected = catalog.find(item => item.name === operation.collection);
      if (operation.kind === 'collection') await connection.db.createCollection(expected.name,
        { validator: expected.validator, validationLevel: 'strict', validationAction: 'error' });
      else await connection.db.collection(expected.name).createIndex(operation.key,
        { unique: operation.unique, name: Object.entries(operation.key).map(([key, direction]) => `${key}_${direction}`).join('_') });
      completed++;
    }
    await verifyUsageCatalog(connection);
    return { mode: 'apply', completed, complete: true };
  } catch {
    const error = Error('USAGE_CATALOG_INCOMPLETE'); error.completed = completed; throw error;
  }
}
