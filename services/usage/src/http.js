import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { protectedRequest } from './authorization.js';
import { errors, limits, uuid, objectId, languageCodes, endReasons } from './policy.js';
const browser = z.string().regex(uuid), playback = browser;
const inputs = {
  presence: z.strictObject({ browserId: browser }),
  start: z.strictObject({ browserId: browser, playbackId: playback, poiId: z.string().regex(objectId), languageCode: z.enum(languageCodes) }),
  heartbeat: z.strictObject({ browserId: browser }), end: z.strictObject({ browserId: browser, reason: z.enum(endReasons) }),
};
class HttpFailure extends Error { constructor(code, retryAfter = null) { super(code); this.code = code; this.retryAfter = retryAfter; } }
const fail = code => { throw new HttpFailure(code); };
const iso = value => value === null ? null : new Date(value).toISOString();
function windowLimiter(limit, now, bucketLimit = limits.buckets) {
  const buckets = new Map(); let lastTime = null;
  return key => {
    const time = now(), window = Math.floor(time / 60000), retry = Math.max(1, Math.ceil(((window + 1) * 60000 - time) / 1000));
    if (!Number.isSafeInteger(time) || time < 0 || lastTime !== null && time < lastTime) fail('USAGE_UNAVAILABLE');
    lastTime = time;
    for (const [id, entry] of buckets) if (entry.window < window) buckets.delete(id);
    let entry = buckets.get(key);
    if (!entry) {
      if (buckets.size >= bucketLimit) throw new HttpFailure('RATE_LIMITED', retry);
      entry = { window, count: 0 }; buckets.set(key, entry);
    }
    if (entry.window !== window) { entry.window = window; entry.count = 0; }
    if (entry.count >= limit) throw new HttpFailure('RATE_LIMITED', retry);
    entry.count++;
  };
}
export function createUsageRouter(runtime) {
  const router = express.Router(), parseJson = express.json({ limit: limits.bodyBytes, strict: true, inflate: false });
  const globalLimit = windowLimiter(limits.globalPerMinute, runtime.now, 1);
  const browserLimit = windowLimiter(limits.browserPerMinute, runtime.now), monitorLimit = windowLimiter(limits.monitorPerMinute, runtime.now);
  const guard = protectedRequest(runtime.authorization, { roles: ['Staff', 'Manager'], requireSession: false });
  let inflight = 0;
  router.use(async (req, res) => {
    const requestId = randomUUID(); let reserved = false;
    res.set('Cache-Control', 'no-store'); res.vary('Origin');
    const send = data => {
      const body = { data, requestId }; if (Buffer.byteLength(JSON.stringify(body)) > limits.responseBytes) fail('USAGE_UNAVAILABLE');
      res.json(body);
    };
    try {
      const origin = req.get('Origin');
      if (origin !== undefined) {
        if (!runtime.origins.includes(origin)) fail('ACCESS_DENIED');
        res.set('Access-Control-Allow-Origin', origin).set('Access-Control-Expose-Headers', 'Retry-After');
      }
      const path = req.path;
      let operation, method, playbackId = null;
      if (path === '/presence/heartbeat') { operation = 'presence'; method = 'POST'; }
      else if (path === '/listening/start') { operation = 'start'; method = 'POST'; }
      else {
        const match = path.match(/^\/listening\/([^/]+)\/(heartbeat|end)$/);
        if (match) { [, playbackId, operation] = match; method = 'POST'; }
        else if (['/monitoring/summary', '/monitoring/health', '/monitoring/jobs'].includes(path)) { operation = path.split('/').at(-1); method = 'GET'; }
        else fail('ROUTE_NOT_FOUND');
      }
      if (req.method === 'OPTIONS') {
        const headers = (req.get('Access-Control-Request-Headers') ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
        if (!origin || req.get('Access-Control-Request-Method') !== method || headers.some(value => !['authorization', 'content-type'].includes(value))) fail('ACCESS_DENIED');
        res.set('Access-Control-Allow-Methods', `${method}, OPTIONS`).set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(204).end(); return;
      }
      if (req.method !== method) { res.set('Allow', `${method}, OPTIONS`); fail('METHOD_NOT_ALLOWED'); }
      if (inflight >= limits.inflight) throw new HttpFailure('RATE_LIMITED', 1);
      inflight++; reserved = true;
      if (method === 'POST') globalLimit('telemetry'); // Includes malformed IDs/body attempts, before DB.
      if (req.url.includes('?')) fail('INVALID_INPUT');
      if (method === 'GET') {
        if (req.get('Transfer-Encoding') || req.get('Content-Length') && req.get('Content-Length') !== '0') fail('INVALID_INPUT');
        let authorized = false; await guard(req, res, () => { authorized = true; }); if (!authorized) return;
        monitorLimit(res.locals.principal.account.id);
        if (operation === 'summary') {
          const data = await runtime.service.summary();
          if (data.byPoi.length > limits.pois || [data.onlineVisitors, data.currentListeners, ...data.byPoi.map(row => row.currentListeners)].some(count => !Number.isSafeInteger(count) || count < 0)) fail('USAGE_UNAVAILABLE');
          send({ ...data, asOf: iso(data.asOf), refreshedAt: iso(runtime.now()) });
        } else if (operation === 'health') {
          const sample = await runtime.sampler.sample();
          send({ asOf: iso(sample.asOf), components: sample.components.map(row => ({ name: row.name, status: row.status,
            checkedAt: iso(row.checkedAt), lastSuccessAt: iso(row.lastSuccessAt), errorCode: row.errorCode === null ? null
              : row.status === 'stale' ? 'SAMPLE_STALE' : row.status === 'unknown' ? 'BRIDGE_PENDING' : 'DEPENDENCY_UNAVAILABLE' })) });
        } else send(runtime.jobs?await runtime.jobs():{ asOf: iso(runtime.now()), checkedAt: null, lastSuccessAt: null, status: 'unknown', counts: null, errorCode: 'BRIDGE_PENDING' });
        return;
      }
      if (!/^application\/json(?:\s*;|$)/i.test(req.get('Content-Type') ?? '')) fail('UNSUPPORTED_MEDIA_TYPE');
      if (req.get('Content-Encoding') && req.get('Content-Encoding').toLowerCase() !== 'identity') fail('UNSUPPORTED_MEDIA_TYPE');
      await new Promise((resolve, reject) => parseJson(req, res, error => error ? reject(error) : resolve()));
      if (typeof req.body?.browserId === 'string' && uuid.test(req.body.browserId)) browserLimit(req.body.browserId);
      const parsed = inputs[operation].safeParse(req.body); if (!parsed.success || playbackId !== null && !uuid.test(playbackId)) fail('INVALID_INPUT');
      const data = await runtime.service[operation]({ ...parsed.data, ...(playbackId === null ? {} : { playbackId }) });
      send(Object.fromEntries(Object.entries(data).map(([key, value]) => [key, ['acceptedAt', 'endedAt'].includes(key) ? iso(value) : value])));
    } catch (error) {
      const code = error?.type === 'entity.too.large' ? 'PAYLOAD_TOO_LARGE' : error?.type === 'entity.parse.failed' ? 'MALFORMED_JSON'
        : ['encoding.unsupported', 'charset.unsupported'].includes(error?.type) ? 'UNSUPPORTED_MEDIA_TYPE'
          : Object.hasOwn(errors, error?.code ?? '') ? error.code : 'USAGE_UNAVAILABLE';
      const [status, message] = errors[code];
      if (code === 'RATE_LIMITED') res.set('Retry-After', String(error.retryAfter ?? 1));
      if (!res.headersSent && !res.destroyed) res.status(status).json({ error: { code, message, requestId } });
    } finally { if (reserved) inflight--; }
  });
  return router;
}
