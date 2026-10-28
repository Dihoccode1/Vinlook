import { createHash } from 'node:crypto';
import { z } from 'zod';

const optionalUrl = z.union([z.literal(''), z.string().url().max(2048).refine(value => value.startsWith('https://'))]).nullable().optional();
export const adminPoiSchema = z.object({
  name: z.string().trim().min(1).max(200), slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(1).max(20000), address: z.string().trim().min(1).max(500),
  visitorDescription: z.string().trim().max(3000).optional(),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  category: z.enum(['market', 'history', 'architecture']), sourceLanguage: z.enum(['vi', 'en', 'fr', 'de', 'es', 'it', 'pt', 'ru', 'ja', 'ko', 'zh-CN', 'th', 'id', 'ms', 'ar', 'hi']),
  isPublished: z.boolean(), imageCredit: z.string().trim().max(300).nullable().optional(), imageSourceUrl: optionalUrl, imageLicenseUrl: optionalUrl,
  image: z.object({ contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']), base64: z.string().min(4).max(6990510).regex(/^[A-Za-z0-9+/]+={0,2}$/) }).strict().optional(),
  updatedAt: z.string().datetime().optional(),
}).strict();
export type AdminPoiInput = z.infer<typeof adminPoiSchema>;
export const adminQuerySchema = z.object({
  q: z.string().trim().max(200).default(''), category: z.enum(['market', 'history', 'architecture']).optional(),
  status: z.enum(['all', 'published', 'draft']).default('all'), page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export type AdminPoiQuery = z.infer<typeof adminQuerySchema>;
export function decodeAdminImage(input: AdminPoiInput) {
  if (!input.image) return undefined;
  if (!input.imageCredit?.trim()) throw new Error('IMAGE_CREDIT_REQUIRED');
  const content = Buffer.from(input.image.base64, 'base64');
  if (content.length < 12 || content.length > 5242880 || content.toString('base64') !== input.image.base64) throw new Error('INVALID_IMAGE');
  const jpeg = content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  const png = content.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp = content.toString('ascii', 0, 4) === 'RIFF' && content.toString('ascii', 8, 12) === 'WEBP';
  if (!(input.image.contentType === 'image/jpeg' && jpeg || input.image.contentType === 'image/png' && png || input.image.contentType === 'image/webp' && webp)) throw new Error('INVALID_IMAGE');
  return { content, contentType: input.image.contentType, hash: createHash('sha256').update(content).digest('hex') };
}
