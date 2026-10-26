import { z } from 'zod';
import { MutationFailure } from '../durability/validation.js';
import { objectId, version } from '../drafts/validation.js';
export const limits = Object.freeze({ thumbnail: 2097152, audio: 3145728, overhead: 65536 });
export const intentInput = z.strictObject({
  expectedEditVersion: version,
  kind: z.literal('thumbnail'),
});
export const empty = z.strictObject({});
export const parseId = (value) => {
  const r = objectId.safeParse(value);
  if (!r.success) throw new MediaFailure('INVALID_MEDIA', 422);
  return r.data;
};
export class MediaFailure extends MutationFailure {
  constructor(code = 'MEDIA_UNAVAILABLE', status = 503) {
    super(code, status);
  }
}
export function loadMediaConfig(environment = process.env) {
  const fields = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  if (fields.every((k) => environment[k] === undefined)) return null;
  const [cloud, key, secret] = fields.map((k) => environment[k]);
  if (
    typeof cloud !== 'string' ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(cloud) ||
    [key, secret].some(
      (v) =>
        typeof v !== 'string' ||
        !v.length ||
        v.length > 200 ||
        v.trim() !== v ||
        /[\x00-\x1f\x7f]/.test(v),
    )
  )
    throw new Error('Invalid media configuration');
  return Object.freeze({ cloud, key, secret }); // Private; never serialize or pass to probe children.
}
