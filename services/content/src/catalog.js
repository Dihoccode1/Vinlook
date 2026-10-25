import mongoose from 'mongoose';
import { createContentModels } from './models/index.js';
import { createDurabilityModels } from './durability/models.js';
import { createMediaModel } from './media/model.js';
import { createJobModel } from './jobs/model.js';
import { createAdapterModels } from './adapters/models.js';
import { verifyContentCatalog } from './drafts/runtime.js';

export class CatalogError extends Error {
  constructor(code, completed = 0, hint) { super(code); this.name = 'CatalogError'; this.code = code; this.completed = completed; this.hint = hint; }
}
const fail = code => { throw new CatalogError(code); };

export function createCatalogModels(connection) {
  return { ...createContentModels(connection), ...createDurabilityModels(connection),
    MediaUpload: createMediaModel(connection), ProcessingJob: createJobModel(connection), ...createAdapterModels(connection) };
}

/** Fixed categories only; no driver messages, addresses, document values or credentials. */
export function operationHint(error) {
  const pending = [error], seen = new Set(), errors = [];
  while (pending.length && seen.size < 24) {
    const item = pending.shift();
    if (!item || typeof item !== 'object' || seen.has(item)) continue;
    seen.add(item); errors.push(item);
    pending.push(item.cause, item.reason, item.error);
    if (item.servers instanceof Map) pending.push(...item.servers.values());
  }
  if (errors.some(e => e.code === 18 || e.codeName === 'AuthenticationFailed')) return 'AUTHENTICATION_FAILED';
  if (errors.some(e => e.code === 13 || e.codeName === 'Unauthorized')) return 'DATABASE_PERMISSION_DENIED';
  if (errors.some(e => e.code === 11000)) return 'EXISTING_DATA_PREVENTS_UNIQUE_INDEX';
  if (errors.some(e => ['ENOTFOUND', 'EAI_AGAIN', 'ENODATA', 'ESERVFAIL', 'EREFUSED'].includes(e.code))) return 'DNS_LOOKUP_FAILED';
  if (errors.some(e => ['CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID', 'SELF_SIGNED_CERT_IN_CHAIN'].includes(e.code))) return 'TLS_CERTIFICATE_FAILED';
  if (errors.some(e => ['EACCES', 'EPERM'].includes(e.code))) return 'LOCAL_NETWORK_PERMISSION_DENIED';
  if (errors.some(e => e.name === 'MongoParseError')) return 'CONNECTION_OPTIONS_INVALID';
  if (errors.some(e => ['MongoServerSelectionError', 'MongooseServerSelectionError', 'MongoNetworkError', 'MongoNetworkTimeoutError'].includes(e.name)
    || ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENETUNREACH', 'EHOSTUNREACH'].includes(e.code))) return 'CONNECTION_UNREACHABLE_OR_TIMEOUT';
  return 'UNCLASSIFIED_DATABASE_ERROR';
}

export function validateCatalogUri(uri) {
  const invalid = hint => { throw new CatalogError('CATALOG_INVALID_URI', 0, hint); };
  if (typeof uri !== 'string' || !uri.length) invalid('EMPTY_INPUT');
  if (uri.length > 4096) invalid('INPUT_TOO_LONG');
  if (/^["']|["']$/.test(uri)) invalid('WRAPPING_QUOTES');
  if (/\s/.test(uri)) invalid('WHITESPACE');
  if (/[<>]/.test(uri)) invalid('PLACEHOLDER_OR_ANGLE_BRACKET');
  let url;
  try { url = new URL(uri); } catch { invalid('MALFORMED_URI'); }
  if (!['mongodb:', 'mongodb+srv:'].includes(url.protocol)) invalid('INVALID_SCHEME');
  if (!url.hostname) invalid('MALFORMED_URI');
  if (url.hash) invalid('FRAGMENT_OR_UNENCODED_HASH');
  if (url.pathname !== '/vinlook_content') invalid('DATABASE_PATH_MUST_BE_VINLOOK_CONTENT');
  return uri;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const indexName = (key, options) => options.name ?? Object.entries(key).map(([k, v]) => `${k}_${v}`).join('_');
const matches = (index, key, options) => same(index.key, key)
  && Boolean(index.unique) === Boolean(options.unique)
  && same(index.partialFilterExpression, options.partialFilterExpression)
  && index.expireAfterSeconds === undefined && !index.sparse && !index.hidden && !index.collation
  && (index['2dsphereIndexVersion'] === undefined || Object.values(key).includes('2dsphere') && [2, 3].includes(index['2dsphereIndexVersion']))
  && Object.keys(index).every(k => ['v', 'ns', 'name', 'key', 'unique', 'background', 'sparse', 'hidden', 'partialFilterExpression', '2dsphereIndexVersion'].includes(k));

/** All collections, all target indexes and projected POI version gate, before any writes. */
export async function planCatalog(connection, models) {
  const entries = await connection.db.listCollections({}, { maxTimeMS: 10000 }).toArray();
  const names = new Set(Object.values(models).map(m => m.collection.name));
  if (entries.some(c => !names.has(c.name) || c.type !== 'collection' || Object.keys(c.options ?? {}).length)) fail('CATALOG_CONFLICT');
  const operations = [];
  for (const model of Object.values(models)) {
    const name = model.collection.name, expected = model.schema.indexes();
    if (!entries.some(c => c.name === name)) {
      operations.push({ kind: 'collection', collection: name });
      for (const [key, options] of expected) operations.push({ kind: 'index', collection: name, key, options });
      continue;
    }
    const actual = await model.collection.indexes({ maxTimeMS: 10000 });
    const defaults = actual.filter(i => same(i.key, { _id: 1 }));
    if (defaults.length !== 1 || defaults[0].name !== '_id_' || !matches(defaults[0], { _id: 1 }, {})) fail('CATALOG_CONFLICT');
    for (const index of actual.filter(i => !same(i.key, { _id: 1 }))) {
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
  if (entries.some(c => c.name === models.POI.collection.name)) {
    const cursor = models.POI.collection.find({}, { projection: { _id: 0, mutationVersion: 1 }, maxTimeMS: 10000 });
    try {
      for await (const row of cursor) {
        if (!Number.isSafeInteger(row.mutationVersion) || row.mutationVersion < 0) fail('CATALOG_DATA_MIGRATION_REQUIRED');
      }
    } finally { await cursor.close(); }
  }
  return operations;
}

export async function provisionCatalog(connection, models, { apply = false } = {}) {
  let completed = 0;
  try {
    const operations = await planCatalog(connection, models);
    if (!apply) return { mode: 'plan', operations, complete: operations.length === 0 };
    for (const op of operations) {
      const current = await planCatalog(connection, models);
      if (!current.some(x => same(x, op))) continue;
      const model = Object.values(models).find(m => m.collection.name === op.collection);
      if (op.kind === 'collection') await connection.db.createCollection(op.collection, { maxTimeMS: 30000 });
      else await model.collection.createIndex(op.key, { ...op.options, maxTimeMS: 30000 });
      completed++;
    }
    await verifyContentCatalog(connection, models);
    return { mode: 'apply', completed, complete: true };
  } catch (error) {
    throw new CatalogError(error instanceof CatalogError ? error.code : 'CATALOG_OPERATION_FAILED', completed,
      error instanceof CatalogError ? error.hint : operationHint(error));
  }
}

export async function runCatalog(args, { prompt, output, connect = uri => mongoose.createConnection(uri, {
  dbName: 'vinlook_content', autoCreate: false, autoIndex: false, bufferCommands: false,
  serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 45000,
}) } = {}) {
  if (args.length === 1 && args[0] === '--help') {
    output('Usage: node services/content/scripts/catalog.js [--apply]\nDefault: read-only plan. URI is entered in an interactive terminal and is visible.');
    return;
  }
  if (args.length > 1 || (args.length && args[0] !== '--apply')) fail('CATALOG_INVALID_ARGUMENTS');
  const apply = args[0] === '--apply';
  const uri = validateCatalogUri(await prompt('Content MongoDB URI (visible; includes credentials): ', false));
  if (apply && await prompt('Type vinlook_content to create missing catalog entries: ') !== 'vinlook_content') fail('CATALOG_CONFIRMATION_REQUIRED');
  let connection, result, knownCompleted = 0;
  try {
    connection = connect(uri);
    await connection.asPromise();
    if (connection.name !== 'vinlook_content') fail('CATALOG_INVALID_DATABASE');
    result = await provisionCatalog(connection, createCatalogModels(connection), { apply });
    knownCompleted = result.completed ?? 0;
  } catch (error) {
    if (error instanceof CatalogError) knownCompleted = error.completed;
    throw error instanceof CatalogError ? error : new CatalogError('CATALOG_OPERATION_FAILED', 0, operationHint(error));
  } finally {
    if (connection) {
      try { await connection.close(); } catch { throw new CatalogError('CATALOG_CLOSE_FAILED', knownCompleted); }
    }
  }
  output(JSON.stringify(result));
  return result;
}
