import { z } from 'zod';
const point = z.strictObject({ type: z.literal('Point'), coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]) });
const https = z.string().url().refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; });
const published = z.strictObject({ id: z.string().regex(/^[a-f0-9]{24}$/), revisionId: z.string().regex(/^[a-f0-9]{24}$/),
  nameEN: z.string().min(1).max(200), location: point, entrance: point, thumbnail: z.strictObject({ url: https }),
  languageCode: z.string(), text: z.string().min(1).max(20000), audio: z.strictObject({ url: https, durationSeconds: z.number().min(90).max(150) }) });
const fail = () => { throw Error('PUBLIC_CONTENT_UNAVAILABLE'); };

/** Fixed-route private callers only; bounded decompressed JSON, no cookies/JWT/retry/redirect. */
async function getJson(url, maxBytes, fetchImpl, signal) {
  const controller = new AbortController(); let response, reader;
  const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true });
  const interrupted = new Promise((_resolve, reject) => controller.signal.addEventListener('abort', () => reject(Error('UPSTREAM_UNAVAILABLE')), { once: true }));
  interrupted.catch(() => {});
  const timer = setTimeout(abort, 3000);
  try {
    if (signal?.aborted) abort();
    response = await Promise.race([Promise.resolve().then(() => {
      if (controller.signal.aborted) fail();
      return fetchImpl(url, { method: 'GET', redirect: 'manual', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/json' }, signal: controller.signal });
    }), interrupted]);
    if (response.redirected || response.status >= 300 && response.status < 400) fail();
    if (response.status !== 200) return { status: response.status, body: null };
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '') || !response.body) fail();
    const declared = response.headers.get('content-length');
    if (declared !== null && (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared)) || Number(declared) > maxBytes)) fail();
    reader = response.body.getReader(); const bytes = new Uint8Array(maxBytes); let length = 0;
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), interrupted]); if (done) break;
      if (!(value instanceof Uint8Array) || value.length > maxBytes - length) fail();
      bytes.set(value, length); length += value.length;
    }
    return { status: 200, body: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length))) };
  } catch { fail(); }
  finally {
    clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.abort();
    const cancel = reader ? () => reader.cancel() : response?.body ? () => response.body.cancel() : null;
    if (cancel) await Promise.race([Promise.resolve().then(cancel).catch(() => {}), interrupted.catch(() => {})]);
    try { reader?.releaseLock(); } catch { /* Fixed error boundary. */ }
  }
}
export function createPublicContentVerifier(baseUrl, { fetchImpl = globalThis.fetch } = {}) {
  return async ({ poiId, languageCode }) => {
    const result = await getJson(`${baseUrl}/api/v1/pois/${poiId}?language=${encodeURIComponent(languageCode)}`, 8 * 1024 * 1024, fetchImpl);
    if (result.status === 404) return false;
    const parsed = z.strictObject({ data: published, requestId: z.uuid() }).safeParse(result.body);
    if (result.status !== 200 || !parsed.success || parsed.data.data.id !== poiId || parsed.data.data.languageCode !== languageCode) fail();
    return true;
  };
}
export function createReadinessProbe(baseUrl, { fetchImpl = globalThis.fetch } = {}) {
  return async ({ signal }) => {
    const result = await getJson(`${baseUrl}/health/ready`, 16384, fetchImpl, signal);
    const parsed = z.strictObject({ data: z.strictObject({ status: z.literal('ready') }), requestId: z.uuid() }).safeParse(result.body);
    return result.status === 200 && parsed.success;
  };
}
