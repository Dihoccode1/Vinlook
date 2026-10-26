const statuses = ['queued', 'running', 'succeeded', 'failed', 'waiting_quota'];
const keys = (value, expected) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === expected.length &&
  expected.every((key) => Object.hasOwn(value, key));
/** No JWT, cookies, redirects, retries, DB access or background polling. */
export function createContentJobs({ origin, key, fetchImpl = globalThis.fetch, now = Date.now }) {
  let inflight = null;
  const read = async () => {
    const unknown = {
      asOf: new Date(now()).toISOString(),
      checkedAt: null,
      lastSuccessAt: null,
      status: 'unavailable',
      counts: null,
      errorCode: 'DEPENDENCY_UNAVAILABLE',
    };
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 3000);
    let reader;
    try {
      const response = await fetchImpl(`${origin}/api/v1/internal/monitoring/jobs-summary`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Vinlook-Service': 'usage',
          'X-Vinlook-Service-Key': key,
        },
        signal: controller.signal,
        redirect: 'error',
        credentials: 'omit',
        cache: 'no-store',
      });
      if (
        !response.ok ||
        !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '') ||
        !response.body
      )
        throw Error();
      reader = response.body.getReader();
      let size = 0;
      const chunks = [];
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 16384) throw Error();
        chunks.push(part.value);
      }
      const body = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)),
        ),
        data = body?.data;
      const received = now(),
        sample = Date.parse(data?.asOf);
      if (
        !keys(body, ['data', 'requestId']) ||
        typeof body.requestId !== 'string' ||
        !/^[a-f0-9-]{36}$/.test(body.requestId) ||
        !(keys(data, ['asOf', 'counts']) || keys(data, ['asOf', 'counts', 'worker'])) ||
        !Number.isFinite(sample) ||
        received - sample > 30000 ||
        sample - received > 10000 ||
        !keys(data.counts, statuses) ||
        statuses.some((name) => !Number.isSafeInteger(data.counts[name]) || data.counts[name] < 0)
      )
        throw Error();
      const observed = data.worker?.lastObservedAt ?? null;
      if (
        data.worker !== undefined &&
        (!keys(data.worker, ['lastObservedAt']) ||
          (observed !== null &&
            (typeof observed !== 'string' ||
              !Number.isFinite(Date.parse(observed)) ||
              Date.parse(observed) > sample)))
      )
        throw Error();
      return {
        asOf: new Date(received).toISOString(),
        checkedAt: data.asOf,
        lastSuccessAt: new Date(received).toISOString(),
        status: 'ok',
        counts: Object.fromEntries(statuses.map((name) => [name, data.counts[name]])),
        workerObservedAt: observed,
        errorCode: null,
      };
    } catch {
      return unknown;
    } finally {
      clearTimeout(timer);
      controller.abort();
      await reader?.cancel().catch(() => {});
    }
  };
  return () => {
    if (!inflight)
      inflight = read().finally(() => {
        inflight = null;
      });
    return inflight;
  };
}

export function createWorkerProbe(jobs) {
  return async () => {
    const sample = await jobs();
    if (sample.status !== 'ok') return false;
    return sample.workerObservedAt === null
      ? { healthy: null, observedAt: null }
      : { healthy: true, observedAt: Date.parse(sample.workerObservedAt) };
  };
}
