import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { canonical } from '../durability/validation.js';
import { DraftFailure } from '../drafts/validation.js';
import { languageCodes } from '../models/index.js';
export const snapshotId = (value) => createHash('sha256').update(canonical(value)).digest('hex');
const shape = z.strictObject({
  v: z.literal(1),
  kind: z.literal('pois'),
  language: z.enum(languageCodes),
  q: z.string().max(400),
  limit: z.number().int().min(1).max(50),
  snapshotId: z.string().regex(/^[a-f0-9]{64}$/),
  lastId: z.string().regex(/^[a-f0-9]{24}$/),
  expiresAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});
export function signCursor(payload, key) {
  const body = Buffer.from(canonical(payload)).toString('base64url');
  return body + '.' + createHmac('sha256', key).update(body).digest('base64url');
}
export function readCursor(token, key, filters, now) {
  const invalid = () => {
    throw new DraftFailure('INVALID_CURSOR', 422);
  };
  if (typeof token !== 'string' || token.length > 2048) invalid();
  const parts = token.split('.');
  if (parts.length !== 2 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) invalid();
  const [body, signature] = parts,
    decoded = Buffer.from(body, 'base64url'),
    sig = Buffer.from(signature, 'base64url');
  if (decoded.toString('base64url') !== body || sig.toString('base64url') !== signature) invalid();
  const expected = createHmac('sha256', key).update(body).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) invalid();
  let parsed;
  try {
    parsed = shape.safeParse(JSON.parse(decoded.toString('utf8')));
  } catch {
    invalid();
  }
  if (!parsed.success) invalid();
  const value = parsed.data;
  if (['language', 'q', 'limit'].some((k) => value[k] !== filters[k])) invalid();
  if (value.expiresAt <= now) throw new DraftFailure('CURSOR_EXPIRED', 410);
  if (value.expiresAt > now + 900000) invalid();
  return value;
}
