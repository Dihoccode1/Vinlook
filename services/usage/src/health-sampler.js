// D017 memory-only sampling. No scheduler, network defaults, DB access or HTTP endpoint.
const names = ['identity', 'content', 'usage', 'worker'];
const validTime = (time) =>
  Number.isSafeInteger(time) && time >= 0 && Number.isFinite(new Date(time).getTime());
export class HealthSampleFailure extends Error {
  constructor(code) {
    super(code);
    this.name = 'HealthSampleFailure';
    this.code = code;
  }
}
export function createHealthSampler({ probes = {}, now = Date.now } = {}) {
  if (
    probes === null ||
    typeof probes !== 'object' ||
    Array.isArray(probes) ||
    typeof now !== 'function' ||
    Object.keys(probes).some((name) => !names.includes(name) || typeof probes[name] !== 'function')
  )
    throw new Error('INVALID_HEALTH_DEPENDENCIES');
  const configured = Object.fromEntries(names.map((name) => [name, probes[name]]));
  const states = new Map(
    names.map((name) => [
      name,
      {
        status: 'unknown',
        checkedAt: null,
        lastSuccessAt: null,
        errorCode: configured[name] ? 'NOT_SAMPLED' : 'BRIDGE_PENDING',
        observedAt: null,
      },
    ]),
  );
  const active = new Set();
  let closed = false,
    inflight = null,
    lastStartedAt = null,
    lastClockAt = null;
  const fail = (code) => {
    throw new HealthSampleFailure(code);
  };
  function time() {
    let value;
    try {
      value = now();
    } catch {
      fail('HEALTH_UNAVAILABLE');
    }
    if (!validTime(value) || (lastClockAt !== null && value < lastClockAt))
      fail('HEALTH_UNAVAILABLE');
    lastClockAt = value;
    return value;
  }
  function snapshot() {
    if (closed) fail('HEALTH_SAMPLER_CLOSED');
    const asOf = time();
    return {
      asOf,
      components: names.map((name) => {
        const { observedAt, ...state } = states.get(name);
        if (
          state.checkedAt !== null &&
          (asOf - state.checkedAt >= 30000 ||
            (name === 'worker' && observedAt !== null && asOf - observedAt >= 180000))
        ) {
          state.status = 'stale';
          state.errorCode = 'SAMPLE_STALE';
        }
        return { name, ...state };
      }),
    };
  }
  async function probe(name) {
    if (!configured[name]) return;
    const controller = new AbortController();
    active.add(controller);
    let timedOut = false;
    const interrupted = new Promise((resolve) =>
      controller.signal.addEventListener('abort', () => resolve(null), { once: true }),
    );
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 3000);
    let result = null;
    try {
      result = await Promise.race([
        Promise.resolve().then(() => {
          if (controller.signal.aborted) return null;
          return configured[name](Object.freeze({ signal: controller.signal }));
        }),
        interrupted,
      ]);
    } catch {
      /* Raw dependency errors and responses never leave the probe. */
    } finally {
      clearTimeout(timer);
      controller.abort();
      active.delete(controller);
    }
    if (closed) return;
    const checkedAt = time(),
      previous = states.get(name);
    let up = result === true,
      observedAt = null;
    if (name === 'worker') {
      // A fresh HTTP response does not refresh the worker's underlying heartbeat.
      try {
        if (
          result &&
          Object.keys(result).length === 2 &&
          result.healthy === null &&
          result.observedAt === null
        ) {
          states.set(name, {
            ...previous,
            status: 'unknown',
            checkedAt,
            observedAt: null,
            errorCode: 'WORKER_NOT_OBSERVED',
          });
          return;
        }
        up =
          result !== null &&
          typeof result === 'object' &&
          Object.keys(result).length === 2 &&
          ['healthy', 'observedAt'].every((key) => Object.hasOwn(result, key)) &&
          result.healthy === true &&
          validTime(result.observedAt) &&
          result.observedAt <= checkedAt;
        observedAt = up ? result.observedAt : null;
      } catch {
        up = false;
      }
      if (up && checkedAt - observedAt >= 180000) {
        states.set(name, {
          ...previous,
          status: 'stale',
          checkedAt,
          observedAt,
          errorCode: 'SAMPLE_STALE',
        });
        return;
      }
    }
    states.set(name, {
      status: up ? 'up' : 'unavailable',
      checkedAt,
      lastSuccessAt: up ? checkedAt : previous.lastSuccessAt,
      observedAt,
      errorCode: up ? null : timedOut ? 'SAMPLE_TIMEOUT' : 'DEPENDENCY_UNAVAILABLE',
    });
  }
  return Object.freeze({
    snapshot,
    sample() {
      if (closed) return Promise.reject(new HealthSampleFailure('HEALTH_SAMPLER_CLOSED'));
      if (inflight) return inflight;
      const startedAt = time();
      if (lastStartedAt !== null && startedAt - lastStartedAt < 30000)
        return Promise.resolve(snapshot());
      lastStartedAt = startedAt;
      inflight = Promise.all(names.map(probe))
        .then(snapshot)
        .finally(() => {
          inflight = null;
        });
      return inflight;
    },
    close() {
      closed = true;
      for (const controller of active) controller.abort();
    },
  });
}
