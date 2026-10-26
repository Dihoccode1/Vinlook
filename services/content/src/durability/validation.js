import { createHash } from 'node:crypto';
import { z } from 'zod';
export const id = z.string().regex(/^[a-f0-9]{24}$/);
export const uuid = z.uuid().refine((v) => v === v.toLowerCase());
export const utc = z.string().refine((v) => {
  try {
    return new Date(v).toISOString() === v;
  } catch {
    return false;
  }
});
export const operations = [
  'poi.create',
  'revision.draft',
  'revision.process',
  'job.retry',
  'job.upload_resume',
  'revision.publish',
  'poi.delete',
  'poi.restore',
];
export const actions = [
  'poi.create',
  'poi.update',
  'poi.delete',
  'poi.restore',
  'revision.submit',
  'revision.return',
  'revision.publish',
  'content.review',
  'job.create',
  'job.retry',
  'job.complete',
];
const codes = ['VALIDATION_FAILED', 'CONFLICT', 'DEPENDENCY_UNAVAILABLE', 'PROCESSING_FAILED'];
export const eventSchema = z
  .strictObject({
    eventId: uuid,
    actorId: id,
    workSessionId: id,
    action: z.enum(actions),
    poiId: id,
    occurredAt: utc,
    result: z.strictObject({
      status: z.enum(['succeeded', 'failed']),
      errorCode: z.enum(codes).nullable(),
    }),
    reason: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .refine((v) => (v.result.status === 'succeeded') === (v.result.errorCode === null));
export const resultSchema = z.strictObject({
  data: z
    .strictObject({
      poiId: id.optional(),
      revisionId: id.optional(),
      jobIds: z
        .array(id)
        .max(32)
        .refine((v) => new Set(v).size === v.length)
        .optional(),
      editVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
      status: z
        .enum(['draft', 'in_review', 'published', 'queued', 'running', 'deleted', 'restored'])
        .optional(),
    })
    .refine((v) => Boolean(v.poiId || v.revisionId || v.jobIds?.length)),
});
export class MutationFailure extends Error {
  constructor(code = 'MUTATION_UNAVAILABLE', status = 503) {
    super(code);
    Object.assign(this, { code, status });
  }
}
export function checked(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new MutationFailure('INVALID_MUTATION_INPUT', 422);
  return result.data;
}
export function canonical(value) {
  const seen = new Set();
  function visit(v) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
    if (typeof v !== 'object' || seen.has(v))
      throw new MutationFailure('INVALID_MUTATION_INPUT', 422);
    if (Object.getOwnPropertySymbols(v).length)
      throw new MutationFailure('INVALID_MUTATION_INPUT', 422);
    seen.add(v);
    let result;
    if (Array.isArray(v)) {
      if (Object.keys(v).length !== v.length || !Object.keys(v).every((k, i) => k === String(i)))
        throw new MutationFailure('INVALID_MUTATION_INPUT', 422);
      result = '[' + v.map(visit).join(',') + ']';
    } else {
      if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null)
        throw new MutationFailure('INVALID_MUTATION_INPUT', 422);
      result =
        '{' +
        Object.keys(v)
          .sort()
          .map((k) => JSON.stringify(k) + ':' + visit(v[k]))
          .join(',') +
        '}';
    }
    seen.delete(v);
    return result;
  }
  return visit(value);
}
export const requestHash = (value) => createHash('sha256').update(canonical(value)).digest('hex');
