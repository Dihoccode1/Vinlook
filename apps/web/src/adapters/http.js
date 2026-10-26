// Browser transport shared by the separate service adapters. Never log payloads.
export class ApiError extends Error {
  constructor(code, { status = 0, requestId = null, retryAfter = null } = {}) {
    super(code);
    this.name = 'ApiError';
    Object.assign(this, { code, status, requestId, retryAfter });
  }
}

export function publicOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new ApiError('INVALID_PUBLIC_ORIGIN');
  }
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    !(url.protocol === 'https:' || (local && url.protocol === 'http:'))
  ) {
    throw new ApiError('INVALID_PUBLIC_ORIGIN');
  }
  return url.origin;
}

export function createTransport(origin, { fetcher = globalThis.fetch, timeoutMs = 10000 } = {}) {
  const base = publicOrigin(origin);
  return async function request(
    path,
    { query = {}, method = 'GET', body, form, token, signal, idempotencyKey } = {},
  ) {
    if (!path.startsWith('/api/v1/') || path.includes('?') || path.includes('#'))
      throw new ApiError('INVALID_API_PATH');
    const url = new URL(path, base);
    for (const [key, value] of Object.entries(query))
      if (value !== undefined) url.searchParams.set(key, value);
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (form && body !== undefined) throw new ApiError('INVALID_INPUT');
    try {
      const response = await fetcher(url, {
        method,
        headers,
        body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
          : AbortSignal.timeout(timeoutMs),
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const rawCode = payload?.error?.code;
        throw new ApiError(
          typeof rawCode === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(rawCode)
            ? rawCode
            : 'SERVICE_UNAVAILABLE',
          {
            status: response.status,
            requestId: safeRequestId(payload?.error?.requestId),
            retryAfter: /^\d+$/.test(response.headers.get('Retry-After') ?? '')
              ? Number(response.headers.get('Retry-After'))
              : null,
          },
        );
      }
      if (!payload || !Object.hasOwn(payload, 'data') || !safeRequestId(payload.requestId))
        throw new ApiError('INVALID_RESPONSE');
      return payload.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(signal?.aborted ? 'REQUEST_CANCELLED' : 'NETWORK_UNAVAILABLE');
    }
  };
}
function safeRequestId(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(value) ? value : null;
}
