import { createHash } from 'node:crypto';
import { catalog } from './models.js';
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export const catalogFingerprint = createHash('sha256')
  .update(JSON.stringify(canonical(catalog)))
  .digest('hex');
const fail = () => {
  throw Error('USAGE_CATALOG_UNAVAILABLE');
};
export async function planUsageCatalog(connection) {
  if (!['vinlook_usage', 'vinlook_usage_poc_test'].includes(connection.name)) fail();
  const collections = await connection.db.listCollections({}, { nameOnly: false }).toArray();
  const missing = [],
    mismatched = [];
  for (const expected of catalog) {
    const collection = collections.find((row) => row.name === expected.name);
    if (!collection) {
      missing.push(expected.name);
      continue;
    }
    const options = collection.options ?? {};
    if (
      collection.type !== 'collection' ||
      options.validationLevel !== 'strict' ||
      options.validationAction !== 'error' ||
      Object.keys(options).some(
        (key) => !['validator', 'validationLevel', 'validationAction'].includes(key),
      ) ||
      !same(options.validator, expected.validator)
    ) {
      mismatched.push(expected.name);
      continue;
    }
    const indexes = await connection.db.collection(expected.name).indexes();
    if (
      indexes.length !== expected.indexes.length + 1 ||
      !indexes.some((index) => same(index.key, { _id: 1 })) ||
      expected.indexes.some(
        (index) =>
          !indexes.some(
            (actual) =>
              JSON.stringify(actual.key) === JSON.stringify(index.key) &&
              Boolean(actual.unique) === Boolean(index.unique) &&
              !actual.sparse &&
              !actual.hidden &&
              !actual.collation &&
              !actual.partialFilterExpression &&
              actual.expireAfterSeconds === undefined,
          ),
      )
    )
      mismatched.push(expected.name);
  }
  for (const collection of collections)
    if (!catalog.some((row) => row.name === collection.name))
      mismatched.push('UNEXPECTED_COLLECTION');
  return {
    fingerprint: catalogFingerprint,
    missing,
    mismatched,
    matches: missing.length === 0 && mismatched.length === 0,
  };
}
export async function verifyUsageCatalog(connection) {
  if (!(await planUsageCatalog(connection)).matches) fail();
}

/** Apply only to a fresh guarded loopback fixture. Production provisioning needs a separate reviewed plan. */
export async function applyUsageTestCatalog(connection, expectedFingerprint) {
  if (
    connection.host !== '127.0.0.1' ||
    connection.name !== 'vinlook_usage_poc_test' ||
    expectedFingerprint !== catalogFingerprint
  )
    fail();
  const hello = await connection.db.admin().command({ hello: 1 });
  if (hello.setName !== 'vinlook_usage_poc' || hello.isWritablePrimary !== true) fail();
  const plan = await planUsageCatalog(connection);
  if (plan.matches) return plan;
  if (plan.mismatched.length || plan.missing.length !== catalog.length) fail();
  for (const collection of catalog) {
    await connection.db.createCollection(collection.name, {
      validator: collection.validator,
      validationLevel: 'strict',
      validationAction: 'error',
    });
    await connection.db.collection(collection.name).createIndexes(
      collection.indexes.map((index) => ({
        ...index,
        name: Object.entries(index.key)
          .map(([key, direction]) => `${key}_${direction}`)
          .join('_'),
      })),
    );
  }
  await verifyUsageCatalog(connection);
  return planUsageCatalog(connection);
}
