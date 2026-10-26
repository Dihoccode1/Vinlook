import mongoose from 'mongoose';
import { createContentJobs } from './content-jobs.js';
import { createUsageModels } from './models.js';
import { verifyUsageCatalog } from './catalog.js';
import { createMongoUsageStore } from './mongo-store.js';
import { createUsageService } from './domain.js';
import { createHealthSampler } from './health-sampler.js';
import { createPublicContentVerifier, createReadinessProbe } from './public-content.js';
import { languageCodes } from './policy.js';

export function assembleUsageRuntime({ connection, config, now = Date.now, models = createUsageModels(connection), fetchImpl = globalThis.fetch }) {
  const store = createMongoUsageStore({ connection, models, now });
  const ready = async () => {
    if (connection.readyState !== 1) return false;
    try { await connection.db.command({ ping: 1 }, { timeoutMS: 3000 }); return true; } catch { return false; }
  };
  const sampler = createHealthSampler({ now, probes: {
    identity: createReadinessProbe(config.authorization.baseUrl, { fetchImpl }),
    content: createReadinessProbe(config.contentOrigin, { fetchImpl }), usage: ready,
  } });
  return { service: createUsageService({ store, languageCodes, now, verifyPublicPoi: createPublicContentVerifier(config.contentOrigin, { fetchImpl }) }),
    sampler, now, ready, authorization: config.authorization, origins: config.origins,
    jobs:config.contentCallerKey?createContentJobs({origin:config.contentOrigin,key:config.contentCallerKey,fetchImpl,now}):null,
    async close() { sampler.close(); await connection.close(); } };
}
export async function connectUsageRuntime(config) {
  const connection = mongoose.createConnection(config.uri, { autoCreate: false, autoIndex: false, bufferCommands: false,
    serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000, maxPoolSize: 10 });
  try {
    await connection.asPromise();
    if (!['vinlook_usage', 'vinlook_usage_poc_test'].includes(connection.name)) throw Error('Unavailable');
    const hello = await connection.db.admin().command({ hello: 1 }); if (!hello.setName || hello.isWritablePrimary !== true) throw Error('Unavailable');
    await verifyUsageCatalog(connection);
    return assembleUsageRuntime({ connection, config });
  } catch { await connection.close().catch(() => {}); throw Error('Usage dependencies unavailable'); }
}
