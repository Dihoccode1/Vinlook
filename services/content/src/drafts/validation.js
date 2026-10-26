import { z } from 'zod';
import { MutationFailure } from '../durability/validation.js';
import { languageCodes } from '../models/index.js';
export const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/)
  .transform((v) => v.toLowerCase());
export const version = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const point = z.strictObject({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().finite().min(-180).max(180),
    z.number().finite().min(-90).max(90),
  ]),
});
const safe = (v) => !/[\x00-\x1f\x7f]/.test(v);
export const asset = z.strictObject({
  publicId: z.string().trim().min(1).max(512).refine(safe),
  url: z.string().refine((v) => {
    try {
      const u = new URL(v);
      return (
        u.href === v &&
        u.protocol === 'https:' &&
        !u.username &&
        !u.password &&
        !u.search &&
        !u.hash
      );
    } catch {
      return false;
    }
  }),
  format: z.string().regex(/^[a-z0-9]{1,16}$/),
});
const text = z.string().trim().min(1).max(20000);
const name = z
  .string()
  .trim()
  .min(1)
  .refine((v) => [...v].length <= 200);
const fields = {
  nameEN: name,
  location: point,
  sourceTextEN: text,
  entrance: point.nullable(),
  thumbnailAsset: asset.nullable(),
};
export const createInput = z.strictObject({
  ...fields,
  entrance: fields.entrance.optional().default(null),
  thumbnailAsset: fields.thumbnailAsset.optional().default(null),
});
export const cloneInput = z.strictObject({ expectedPublishedRevisionId: objectId });
export const patchInput = z.strictObject({
  expectedEditVersion: version,
  changes: z
    .strictObject(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v.optional()])))
    .refine((v) => Object.keys(v).length > 0),
});
export const languageInput = z.strictObject({ expectedEditVersion: version, text });
export const locale = z.enum(languageCodes.filter((code) => code !== 'en'));
export class DraftFailure extends MutationFailure {
  constructor(code = 'CONTENT_UNAVAILABLE', status = 503) {
    super(code, status);
  }
}
export function parse(schema, value) {
  const r = schema.safeParse(value);
  if (!r.success) throw new DraftFailure('INVALID_INPUT', 422);
  return r.data;
}
export function nextVersion(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER)
    throw new DraftFailure('VERSION_EXHAUSTED', 409);
  return value + 1;
}
