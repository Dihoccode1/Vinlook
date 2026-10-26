import { z } from 'zod';
import { languageCodes } from '../models/index.js';
import { DraftFailure } from '../drafts/validation.js';
const language = z.enum(languageCodes).default('en');
const integer = (max, defaultValue) =>
  z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().max(max))
    .prefault(String(defaultValue));
const decimal = z
  .string()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
  .transform(Number)
  .pipe(z.number().finite());
export const listQuery = z.strictObject({
  language,
  q: z
    .string()
    .trim()
    .min(1)
    .refine((s) => [...s].length <= 200)
    .optional()
    .default(''),
  limit: integer(50, 20),
  cursor: z
    .string()
    .min(1)
    .max(2048)
    .regex(/^[A-Za-z0-9_.-]+$/)
    .optional(),
});
export const detailQuery = z.strictObject({ language });
export const nearbyQuery = z.strictObject({
  language,
  lat: decimal.pipe(z.number().min(-90).max(90)),
  lon: decimal.pipe(z.number().min(-180).max(180)),
  limit: integer(4, 4),
});
export function query(schema, request) {
  const pairs = [...new URL(request.originalUrl, 'http://request.invalid').searchParams];
  if (new Set(pairs.map(([key]) => key)).size !== pairs.length)
    throw new DraftFailure('INVALID_INPUT', 422);
  const parsed = schema.safeParse(Object.fromEntries(pairs));
  if (!parsed.success) throw new DraftFailure('INVALID_INPUT', 422);
  return parsed.data;
}
export function publicKey(value, identityKey) {
  if (value === undefined) return null;
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(value) ||
    Buffer.from(value, 'base64url').length !== 32 ||
    Buffer.from(value, 'base64url').toString('base64url') !== value ||
    value === identityKey
  )
    throw new Error('Invalid Content public configuration');
  return Buffer.from(value, 'base64url');
}
