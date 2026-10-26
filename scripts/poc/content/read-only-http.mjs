import { registryAt } from './inventory.mjs';

const locales = new Set(registryAt().locales);
const id = value => typeof value === 'string' && /^[a-f0-9]{24}$/.test(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const integer = (value, min = 0) => Number.isSafeInteger(value) && value >= min;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const keys = (value, allowed) => object(value) && Object.keys(value).every(key => allowed.includes(key));
export class ContentReadFailure extends Error {
  constructor(code, status = null, retryAfterSeconds = null) {
    super(code); this.name = 'ContentReadFailure'; this.code = code;
    this.status = status; this.retryAfterSeconds = retryAfterSeconds;
  }
}
const fail = code => { throw new ContentReadFailure(code); };
const invalid = () => fail('READ_RESPONSE_INVALID');

function version(value) {
  if (!keys(value, ['sourceVersion', 'textVersion', 'targetTextVersion', 'targetSourceVersion']) || Object.keys(value).length !== 4
    || !integer(value.sourceVersion, 1) || ['textVersion', 'targetTextVersion', 'targetSourceVersion'].some(key => value[key] !== null && !integer(value[key], 1))) invalid();
}
function validateJob(value) {
  if (!keys(value, ['id', 'poiId', 'revisionId', 'languageCode', 'taskType', 'status', 'inputVersion', 'reclaimCount', 'retryCount',
    'createdAt', 'updatedAt', 'leaseExpiresAt', 'error']) || !id(value.id) || !id(value.poiId) || !id(value.revisionId)
    || !locales.has(value.languageCode) || !['translation', 'audio'].includes(value.taskType)
    || !['queued', 'running', 'succeeded', 'failed', 'waiting_quota'].includes(value.status) || !integer(value.retryCount)) invalid();
  version(value.inputVersion);
  if (value.reclaimCount !== undefined && (!integer(value.reclaimCount) || value.reclaimCount > 3)) invalid();
  for (const field of ['createdAt', 'updatedAt', 'leaseExpiresAt']) if (value[field] !== undefined && value[field] !== null && !iso(value[field])) invalid();
  if (value.error !== undefined && ![null, 'STALE_INPUT', 'LEASE_RECLAIM_EXHAUSTED', 'PROVIDER_FAILED', 'QUOTA_EXHAUSTED',
    'INVALID_OUTPUT', 'PROVIDER_OUTCOME_UNKNOWN'].includes(value.error)) invalid();
}
function validatePoi(value, poiId) {
  if (!keys(value, ['poi', 'publishedRevision', 'workingRevision', 'localizedContents']) || Object.keys(value).length !== 4
    || !object(value.poi) || !id(value.poi.id) || !Array.isArray(value.localizedContents) || value.localizedContents.length > 16) invalid();
  if (value.poi.id !== poiId) fail('READ_IDENTITY_MISMATCH');
  for (const [key, statuses] of [['workingRevision', ['draft', 'in_review']], ['publishedRevision', ['published']]]) {
    const revision = value[key];
    if (revision === null) continue;
    if (!object(revision) || !id(revision.id) || !id(revision.poiId) || !statuses.includes(revision.status)
      || !integer(revision.editVersion) || !integer(revision.sourceVersion, 1)
      || typeof revision.sourceTextEN !== 'string' || revision.sourceTextEN.length > 20000) invalid();
    if (revision.poiId !== poiId) fail('READ_IDENTITY_MISMATCH');
  }
  const selected = value.workingRevision ?? value.publishedRevision, seen = new Set();
  if (selected === null && value.localizedContents.length) invalid();
  for (const row of value.localizedContents) {
    if (!object(row) || !id(row.revisionId) || !locales.has(row.languageCode) || seen.has(row.languageCode)
      || !integer(row.sourceVersion, 1) || !integer(row.textVersion, 1)
      || !['pending', 'approved', 'changes_required'].includes(row.reviewStatus)) invalid();
    if (row.revisionId !== selected.id) fail('READ_IDENTITY_MISMATCH');
    if (row.text !== null && row.text !== undefined && (typeof row.text !== 'string' || row.text.length > 20000)) invalid();
    seen.add(row.languageCode);
  }
}
function validate(body, kind, expectedId) {
  if (!keys(body, ['data', 'requestId']) || Object.keys(body).length !== 2 || !uuid(body.requestId)) invalid();
  if (kind === 'poi') validatePoi(body.data, expectedId);
  else if (kind === 'job') { validateJob(body.data); if (body.data.id !== expectedId) fail('READ_IDENTITY_MISMATCH'); }
  else {
    if (!keys(body.data, ['items']) || !Array.isArray(body.data.items) || body.data.items.length > 1000) invalid();
    let previous = null;
    for (const job of body.data.items) {
      validateJob(job);
      if (job.revisionId !== expectedId) fail('READ_IDENTITY_MISMATCH');
      if (previous !== null && job.id <= previous) invalid();
      previous = job.id;
    }
  }
}

/** Construction does no I/O. Token stays in a closure; no login, write, batch or CLI network operation. */
export function createReadOnlyContentAdapter(options = {}, { fetchImpl = globalThis.fetch } = {}) {
  if (!keys(options, ['origin', 'accessToken', 'timeoutMs', 'maxJsonBytes']) || typeof fetchImpl !== 'function') fail('READ_CONFIG_INVALID');
  let url;
  try { url = new URL(options.origin); } catch { fail('READ_CONFIG_INVALID'); }
  const { origin, timeoutMs = 15000, maxJsonBytes = 8 * 1024 * 1024 } = options;
  if (typeof origin !== 'string' || url.origin !== origin || url.protocol !== 'https:' || url.username || url.password
    || typeof options.accessToken !== 'string' || options.accessToken.length > 16000
    || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(options.accessToken)
    || !integer(timeoutMs, 1) || timeoutMs > 15000 || !integer(maxJsonBytes, 1) || maxJsonBytes > 8 * 1024 * 1024) fail('READ_CONFIG_INVALID');
  let token = options.accessToken, closed = false, active = null;
  async function read(kind, expectedId, requestOptions = {}) {
    if (!id(expectedId)) fail('READ_ID_INVALID');
    if (!keys(requestOptions, ['signal']) || requestOptions.signal !== undefined && !(requestOptions.signal instanceof AbortSignal)) fail('READ_OPTIONS_INVALID');
    if (closed) fail('READ_CLOSED');
    if (active) fail('READ_BUSY');
    if (requestOptions.signal?.aborted) fail('READ_ABORTED');
    const path = kind === 'poi' ? `/api/v1/admin/pois/${expectedId}` : kind === 'job' ? `/api/v1/admin/jobs/${expectedId}` : `/api/v1/admin/jobs?revisionId=${expectedId}`;
    const controller = new AbortController();
    let timedOut = false, response = null, reader = null;
    const interrupted = new Promise((_resolve, reject) => controller.signal.addEventListener('abort', () => {
      reject(new ContentReadFailure(timedOut ? 'READ_TIMEOUT' : 'READ_ABORTED'));
    }, { once: true }));
    const cancellation = interrupted.catch(() => {});
    const callerAbort = () => controller.abort();
    requestOptions.signal?.addEventListener('abort', callerAbort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    active = controller;
    try {
      response = await Promise.race([Promise.resolve().then(() => {
        if (controller.signal.aborted) throw new ContentReadFailure(timedOut ? 'READ_TIMEOUT' : 'READ_ABORTED');
        return fetchImpl(`${origin}${path}`, { method: 'GET', redirect: 'manual', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store' }, signal: controller.signal });
      }), interrupted]);
      if (response.redirected || response.type === 'opaqueredirect' || response.status >= 300 && response.status < 400) fail('READ_REDIRECT_BLOCKED');
      if (response.status !== 200) {
        const code = new Map([[401, 'READ_UNAUTHENTICATED'], [403, 'READ_DENIED'], [404, 'READ_NOT_FOUND'], [429, 'READ_RATE_LIMITED']]).get(response.status) ?? 'READ_UNAVAILABLE';
        const retry = response.headers.get('retry-after');
        const seconds = response.status === 429 && /^\d{1,4}$/.test(retry ?? '') && Number(retry) <= 3600 ? Number(retry) : null;
        throw new ContentReadFailure(code, [401, 403, 404, 429, 503].includes(response.status) ? response.status : null, seconds);
      }
      if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '') || !response.body) invalid();
      const declared = response.headers.get('content-length');
      if (declared !== null && (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared)) || Number(declared) > maxJsonBytes)) fail('READ_RESPONSE_TOO_LARGE');
      const bytes = new Uint8Array(maxJsonBytes);
      let size = 0;
      reader = response.body.getReader();
      for (;;) {
        const { done, value } = await Promise.race([reader.read(), interrupted]);
        if (done) break;
        if (!(value instanceof Uint8Array)) invalid();
        if (value.byteLength > maxJsonBytes - size) fail('READ_RESPONSE_TOO_LARGE');
        bytes.set(value, size); size += value.byteLength;
      }
      let body;
      try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, size))); } catch { invalid(); }
      validate(body, kind, expectedId);
      return { status: 200, body }; // Private in-memory readback, never logged/persisted here.
    } catch (error) {
      if (error instanceof ContentReadFailure) throw error;
      if (timedOut) fail('READ_TIMEOUT');
      if (controller.signal.aborted) fail('READ_ABORTED');
      fail('READ_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
      requestOptions.signal?.removeEventListener('abort', callerAbort);
      controller.abort();
      if (reader) {
        await Promise.race([Promise.resolve().then(() => reader.cancel()).catch(() => {}), cancellation]);
        try { reader.releaseLock(); } catch { /* No raw stream errors escape. */ }
      } else if (response?.body) {
        await Promise.race([Promise.resolve().then(() => response.body.cancel()).catch(() => {}), cancellation]);
      }
      if (active === controller) active = null;
    }
  }
  return Object.freeze({ origin,
    readPoi: (poiId, options) => read('poi', poiId, options),
    readJob: (jobId, options) => read('job', jobId, options),
    listJobs: (revisionId, options) => read('jobs', revisionId, options),
    close() { closed = true; token = null; active?.abort(); },
  });
}
