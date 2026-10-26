import { z } from 'zod';
import { loadAuthorizationConfig } from '../authorization.js';
import { uuid, utc, checked, eventSchema } from './validation.js';
export const loadOutboxConfig = loadAuthorizationConfig;
const ack = z.strictObject({
  data: z.strictObject({ eventId: uuid, receivedAt: utc }),
  requestId: uuid,
});
async function limited(response) {
  if (
    !response.body ||
    !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')
  )
    throw new Error('Invalid acknowledgement');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 16384) throw new Error('Oversized acknowledgement');
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
/** No implicit start or DB connection; every error retains the original immutable event. */
export function createOutboxSender(
  Model,
  config,
  {
    now = Date.now,
    random = Math.random,
    fetchImpl = fetch,
    diagnostic = () => {},
    setTimer = setTimeout,
    clearTimer = clearTimeout,
  } = {},
) {
  let busy = false,
    running = false,
    timer,
    active,
    controller;
  const report = (code) => {
    try {
      diagnostic({ code });
    } catch {
      /* observer cannot change delivery */
    }
  };
  async function tick() {
    if (busy) return false;
    busy = true;
    try {
      if (await Model.exists({ deliveredAt: null, attemptCount: Number.MAX_SAFE_INTEGER }))
        report('OUTBOX_COUNTER_EXHAUSTED');
      const row = await Model.findOne({
        deliveredAt: null,
        nextAttemptAt: { $lte: new Date(now()) },
        attemptCount: { $lt: Number.MAX_SAFE_INTEGER },
      })
        .sort({ nextAttemptAt: 1, _id: 1 })
        .lean();
      if (!row) return false;
      if (row.attemptCount >= Number.MAX_SAFE_INTEGER) {
        report('OUTBOX_COUNTER_EXHAUSTED');
        return false;
      }
      const claimed = await Model.updateOne(
        { _id: row._id, deliveredAt: null, attemptCount: row.attemptCount },
        { $inc: { attemptCount: 1 } },
      );
      if (!claimed.modifiedCount) return false;
      const attempt = row.attemptCount + 1;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 3000);
      try {
        const payload = checked(eventSchema, row.payload);
        const response = await fetchImpl(`${config.baseUrl}/api/v1/internal/audit-events`, {
          method: 'POST',
          redirect: 'error',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Vinlook-Service': 'content',
            'X-Vinlook-Service-Key': config.key,
          },
          body: JSON.stringify(payload),
        });
        // Consume even error bodies under the same size/deadline guard; never log them.
        const body = await limited(response);
        const result = ack.safeParse(body);
        if (
          ![200, 201].includes(response.status) ||
          !result.success ||
          result.data.data.eventId !== row.eventId
        )
          throw new Error('Invalid acknowledgement');
        await Model.updateOne(
          { _id: row._id, deliveredAt: null },
          { $set: { deliveredAt: new Date(now()) } },
        );
        report('OUTBOX_DELIVERED');
      } catch {
        const jitter = random();
        if (!Number.isFinite(jitter) || jitter < 0 || jitter >= 1)
          throw new Error('Invalid random source');
        const base = [5000, 10000, 20000, 40000, 60000][Math.min(attempt - 1, 4)];
        await Model.updateOne(
          { _id: row._id, deliveredAt: null, attemptCount: attempt },
          { $set: { nextAttemptAt: new Date(now() + Math.floor(base * (1 + jitter * 0.2))) } },
        );
        report('OUTBOX_PENDING');
      } finally {
        clearTimeout(timeout);
        controller = null;
      }
      return true;
    } catch {
      report('OUTBOX_UNAVAILABLE');
      return false;
    } finally {
      busy = false;
    }
  }
  function schedule() {
    if (!running) return;
    active = tick().finally(() => {
      active = null;
      if (running) timer = setTimer(schedule, 1000);
    });
  }
  return {
    tick,
    start() {
      if (!running) {
        running = true;
        schedule();
      }
    },
    async stop() {
      running = false;
      if (timer) clearTimer(timer);
      controller?.abort();
      await active;
    },
  };
}
