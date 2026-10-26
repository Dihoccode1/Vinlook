import { createTransport, ApiError } from './http.js';
import { isLocale } from '../i18n/locales.js';
const id = (value) => {
  if (!/^[a-f0-9]{24}$/.test(value ?? '')) throw new ApiError('INVALID_INPUT');
  return value;
};
const locale = (value) => {
  if (!isLocale(value)) throw new ApiError('INVALID_INPUT');
  return value;
};
// Separate origins, JWT only in this closure. No automatic retry of mutations.
export function createAdminAdapter({ identityOrigin, contentOrigin, usageOrigin }, options = {}) {
  const identity = createTransport(identityOrigin, options),
    content = createTransport(contentOrigin, { timeoutMs: 65000, ...options });
  let token = null,
    generation = 0;
  const request = async (transport, path, args = {}) => {
    if (!token) throw new ApiError('AUTHENTICATION_REQUIRED', { status: 401 });
    const epoch = generation;
    try {
      const result = await transport(path, { ...args, token });
      if (epoch !== generation) throw new ApiError('REQUEST_CANCELLED');
      return result;
    } catch (error) {
      if (error.status === 401 && epoch === generation) token = null;
      throw error;
    }
  };
  const revision = (value, operation, args) =>
    request(content, `/api/v1/admin/revisions/${id(value)}${operation}`, args);
  let usage = null;
  try {
    if (usageOrigin) usage = createTransport(usageOrigin, options);
  } catch {
    /* Admin content tools remain usable without Monitoring config. */
  }
  return {
    monitor: usage
      ? {
          authorize: () => request(identity, '/api/v1/me'),
          summary: () => request(usage, '/api/v1/monitoring/summary'),
          health: () => request(usage, '/api/v1/monitoring/health'),
          jobs: () => request(usage, '/api/v1/monitoring/jobs'),
        }
      : null,
    async login(email, password) {
      const epoch = ++generation;
      token = null;
      const data = await identity('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (epoch !== generation) throw new ApiError('REQUEST_CANCELLED');
      if (!data?.accessToken) throw new ApiError('INVALID_RESPONSE');
      token = data.accessToken;
      return this.me();
    },
    me: () => request(identity, '/api/v1/me'),
    logout() {
      generation++;
      token = null;
    },
    openSession: () =>
      request(identity, '/api/v1/work-sessions/open', { method: 'POST', body: {} }),
    closeSession: (sessionId, reason) =>
      request(identity, `/api/v1/work-sessions/${id(sessionId)}/close`, {
        method: 'POST',
        body: { reason },
      }),
    read: (poiId) => request(content, `/api/v1/admin/pois/${id(poiId)}`),
    create: (body, key) =>
      request(content, '/api/v1/admin/pois', { method: 'POST', body, idempotencyKey: key }),
    clone: (poiId, expectedPublishedRevisionId, key) =>
      request(content, `/api/v1/admin/pois/${id(poiId)}/draft`, {
        method: 'POST',
        body: { expectedPublishedRevisionId },
        idempotencyKey: key,
      }),
    save: (rev, expectedEditVersion, changes) =>
      revision(rev, '', { method: 'PATCH', body: { expectedEditVersion, changes } }),
    saveLocale: (rev, code, expectedEditVersion, text) => {
      if (code === 'en') throw new ApiError('INVALID_INPUT');
      return revision(rev, `/languages/${locale(code)}`, {
        method: 'PATCH',
        body: { expectedEditVersion, text },
      });
    },
    process: (rev, expectedEditVersion, languages, key) =>
      revision(rev, '/process', {
        method: 'POST',
        body: { expectedEditVersion, languages },
        idempotencyKey: key,
      }),
    jobs: (rev) => request(content, '/api/v1/admin/jobs', { query: { revisionId: id(rev) } }),
    runNext: (key) =>
      request(content, '/api/v1/admin/jobs/run-next', {
        method: 'POST',
        body: {},
        idempotencyKey: key,
      }),
    retry: (jobId, expectedEditVersion, key) =>
      request(content, `/api/v1/admin/jobs/${id(jobId)}/retry`, {
        method: 'POST',
        body: { expectedEditVersion },
        idempotencyKey: key,
      }),
    review: (rev, code, body) =>
      revision(rev, `/languages/${locale(code)}/review`, { method: 'POST', body }),
    submit: (rev, expectedEditVersion) =>
      revision(rev, '/submit', { method: 'POST', body: { expectedEditVersion } }),
    returnDraft: (rev, expectedEditVersion, reason) =>
      revision(rev, '/return', { method: 'POST', body: { expectedEditVersion, reason } }),
    publish: (rev, body, key) =>
      revision(rev, '/publish', { method: 'POST', body, idempotencyKey: key }),
    thumbnailIntent: (rev, expectedEditVersion) =>
      revision(rev, '/media-intents', {
        method: 'POST',
        body: { expectedEditVersion, kind: 'thumbnail' },
      }),
    upload: (intentId, file) => {
      if (!file || file.size > 2097152) throw new ApiError('INVALID_INPUT');
      const form = new FormData();
      form.append('file', file);
      return request(content, `/api/v1/admin/media-intents/${id(intentId)}/file`, {
        method: 'PUT',
        form,
      });
    },
    mediaStatus: (intentId) => request(content, `/api/v1/admin/media-intents/${id(intentId)}`),
    reconcile: (intentId) =>
      request(content, `/api/v1/admin/media-intents/${id(intentId)}/reconcile`, {
        method: 'POST',
        body: {},
      }),
  };
}
