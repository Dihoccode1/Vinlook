import mongoose from 'mongoose';
import { createIdentityModels } from './models/index.js';
import { verifyIdentityIndexes } from './auth/runtime.js';

export class CatalogError extends Error {
  constructor(code, completed = 0, hint) { super(code); this.name = 'CatalogError'; this.code = code; this.completed = completed; this.hint = hint; }
}
const fail = code => { throw new CatalogError(code); };
const sameKey = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const indexName = (key, options) => options.name ?? Object.entries(key).map(([k, v]) => `${k}_${v}`).join('_');
const matches = (index, key, options) => sameKey(index.key, key)
  && Boolean(index.unique) === Boolean(options.unique)
  && index.expireAfterSeconds === options.expireAfterSeconds
  && !index.sparse && !index.hidden && !index.partialFilterExpression && !index.collation
  && Object.keys(index).every(k => ['v', 'ns', 'name', 'key', 'unique', 'expireAfterSeconds', 'background', 'sparse', 'hidden'].includes(k));

export function validateCatalogUri(uri) {
  const invalid = hint => { throw new CatalogError('CATALOG_INVALID_URI', 0, hint); };
  if (typeof uri !== 'string' || !uri.length) invalid('EMPTY_INPUT');
  if (uri.length > 4096) invalid('INPUT_TOO_LONG');
  if (/^["']|["']$/.test(uri)) invalid('WRAPPING_QUOTES');
  if (/\s/.test(uri)) invalid('WHITESPACE');
  if (/[<>]/.test(uri)) invalid('PLACEHOLDER_OR_ANGLE_BRACKET');
  let url;
  try {
    url = new URL(uri);
  } catch { invalid('MALFORMED_URI'); }
  if (!['mongodb:', 'mongodb+srv:'].includes(url.protocol)) invalid('INVALID_SCHEME');
  if (!url.hostname) invalid('MALFORMED_URI');
  if (url.hash) invalid('FRAGMENT_OR_UNENCODED_HASH');
  if (url.pathname !== '/vinlook_identity') invalid('DATABASE_PATH_MUST_BE_VINLOOK_IDENTITY');
  return uri;
}

/** Inspect catalog metadata only, never account documents. Inspect all targets before mutation. */
export async function planCatalog(models) {
  const operations = [];
  for (const model of Object.values(models)) {
    const name = model.collection.name;
    const entries = await model.db.db.listCollections({ name }, { maxTimeMS: 10000 }).toArray();
    const expected = model.schema.indexes();
    if (!entries.length) {
      operations.push({ kind: 'collection', collection: name });
      for (const [key, options] of expected) operations.push({ kind: 'index', collection: name, key, options });
      continue;
    }
    if (entries.length !== 1 || entries[0].type !== 'collection' || Object.keys(entries[0].options ?? {}).length) fail('CATALOG_CONFLICT');
    const actual = await model.collection.indexes({ maxTimeMS: 10000 });
    const defaults = actual.filter(i => sameKey(i.key, { _id: 1 }));
    if (defaults.length !== 1 || defaults[0].name !== '_id_' || defaults[0].expireAfterSeconds !== undefined
      || defaults[0].sparse || defaults[0].hidden || defaults[0].partialFilterExpression || defaults[0].collation) fail('CATALOG_CONFLICT');
    for (const index of actual.filter(i => !sameKey(i.key, { _id: 1 }))) {
      if (!expected.some(([key, options]) => matches(index, key, options))) fail('CATALOG_CONFLICT');
    }
    for (const [key, options] of expected) {
      const found = actual.filter(i => matches(i, key, options));
      if (found.length > 1) fail('CATALOG_CONFLICT');
      if (!found.length) {
        if (actual.some(i => i.name === indexName(key, options))) fail('CATALOG_CONFLICT');
        operations.push({ kind: 'index', collection: name, key, options });
      }
    }
  }
  return operations;
}

export async function provisionCatalog(models, { apply = false } = {}) {
  let completed = 0;
  try {
    const operations = await planCatalog(models);
    if (!apply) return { mode: 'plan', operations, complete: operations.length === 0 };
    for (const op of operations) {
      // Reinspect all targets to stop on a concurrent catalog conflict; never repair it.
      const current = await planCatalog(models);
      if (!current.some(x => JSON.stringify(x) === JSON.stringify(op))) continue;
      const model = Object.values(models).find(m => m.collection.name === op.collection);
      if (op.kind === 'collection') await model.db.db.createCollection(op.collection, { maxTimeMS: 30000 });
      else await model.collection.createIndex(op.key, { ...op.options, maxTimeMS: 30000 });
      completed++;
    }
    await verifyIdentityIndexes(models);
    return { mode: 'apply', completed, complete: true };
  } catch (error) {
    throw new CatalogError(error instanceof CatalogError ? error.code : 'CATALOG_OPERATION_FAILED', completed);
  }
}

export async function runCatalog(args, { prompt, output, connect = uri => mongoose.createConnection(uri, {
  dbName: 'vinlook_identity', autoCreate: false, autoIndex: false, bufferCommands: false,
  serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 45000,
}) } = {}) {
  if (args.length === 1 && args[0] === '--help') {
    output('Usage: node services/identity/scripts/catalog.js [--apply]\nDefault: read-only plan. URI is entered privately in an interactive terminal.');
    return;
  }
  if (args.length > 1 || (args.length && args[0] !== '--apply')) fail('CATALOG_INVALID_ARGUMENTS');
  const apply = args[0] === '--apply';
  const uri = validateCatalogUri(await prompt('Identity MongoDB URI (hidden): ', true));
  if (apply && await prompt('Type vinlook_identity to create missing catalog entries: ') !== 'vinlook_identity') fail('CATALOG_CONFIRMATION_REQUIRED');
  let connection;
  let result;
  try {
    connection = connect(uri);
    await connection.asPromise();
    if (connection.name !== 'vinlook_identity') fail('CATALOG_INVALID_DATABASE');
    result = await provisionCatalog(createIdentityModels(connection), { apply });
  } catch (error) {
    throw error instanceof CatalogError ? error : new CatalogError('CATALOG_OPERATION_FAILED');
  } finally {
    if (connection) {
      try { await connection.close(); } catch { throw new CatalogError('CATALOG_CLOSE_FAILED', result?.completed ?? 0); }
    }
  }
  output(JSON.stringify(result));
  return result;
}
