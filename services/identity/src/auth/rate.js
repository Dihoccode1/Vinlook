import { createHmac } from 'node:crypto';

export class RateExceeded extends Error {
  constructor(retryAfter) { super('Rate limit exceeded'); this.retryAfter = retryAfter; }
}

export function rateBucket(secret, operation, scope, value, now = Date.now()) {
  const duration = operation === 'register' ? 3600000 : 900000;
  const start = Math.floor(now / duration) * duration;
  return { key: createHmac('sha256', secret).update(JSON.stringify([operation, scope, value])).digest('hex'),
    windowStart: new Date(start), expiresAt: new Date(start + duration),
    retryAfter: Math.max(1, Math.ceil((start + duration - now) / 1000)) };
}

export async function assertBudget(model, bucket, limit) {
  if (await model.exists({ key: bucket.key, windowStart: bucket.windowStart, count: { $gte: limit } })) {
    throw new RateExceeded(bucket.retryAfter);
  }
}

/** Atomic capacity claim. Unique key/window resolves simultaneous first inserts. */
export async function consumeBudget(model, bucket, limit) {
  const filter = { key: bucket.key, windowStart: bucket.windowStart };
  for (let retry = 0; retry < 3; retry++) {
    if (await model.findOneAndUpdate({ ...filter, count: { $lt: limit } }, { $inc: { count: 1 } }, { returnDocument: 'after' })) return;
    const existing = await model.findOne(filter);
    if (existing) {
      if (existing.count >= limit) throw new RateExceeded(bucket.retryAfter);
      continue;
    }
    try {
      await model.create({ ...filter, count: 1, expiresAt: bucket.expiresAt });
      return;
    } catch (error) { if (error?.code !== 11000) throw error; }
  }
  throw new Error('Rate counter contention');
}
