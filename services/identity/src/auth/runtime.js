import mongoose from 'mongoose';
import { createReadiness } from '../readiness.js';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { createIdentityModels } from '../models/index.js';
import { reconcileSessions } from '../session-state.js';

/** Read-only catalog verification; never repairs or builds a database. */
export async function verifyIdentityIndexes(models) {
  for (const model of Object.values(models)) {
    const actual = await model.collection.indexes();
    const expected = model.schema.indexes();
    if (actual.length !== expected.length + 1) throw new Error('Identity index catalog mismatch');
    for (const [key, options] of expected) {
      const match = actual.find((index) => JSON.stringify(index.key) === JSON.stringify(key));
      if (
        !match ||
        Boolean(match.unique) !== Boolean(options.unique) ||
        match.expireAfterSeconds !== options.expireAfterSeconds ||
        match.sparse ||
        match.partialFilterExpression ||
        match.hidden ||
        match.collation
      )
        throw new Error('Identity index catalog mismatch');
    }
    const collection = (
      await model.db.db.listCollections({ name: model.collection.name }).toArray()
    )[0];
    if (
      !collection ||
      collection.type !== 'collection' ||
      Object.keys(collection.options ?? {}).length
    ) {
      throw new Error('Identity collection catalog mismatch');
    }
  }
}

export async function createAuthRuntime(models, config, now = Date.now) {
  await verifyIdentityIndexes(models);
  const dummyHash = await bcrypt.hash(randomBytes(32).toString('base64url'), 12);
  return { models, config, dummyHash, now };
}

export async function connectAuthRuntime(config) {
  const connection = mongoose.createConnection(config.uri, {
    autoCreate: false,
    autoIndex: false,
    bufferCommands: false,
    serverSelectionTimeoutMS: 3000,
  });
  try {
    await connection.asPromise();
    const runtime = await createAuthRuntime(createIdentityModels(connection), config);
    await reconcileSessions(runtime.models, runtime.now());
    return { ...runtime, ready: createReadiness(connection), close: () => connection.close() };
  } catch {
    await connection.close().catch(() => {});
    throw new Error('Identity dependencies unavailable');
  }
}
