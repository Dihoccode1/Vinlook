import path from 'node:path';
import { z } from 'zod';
import data from './hybrid-v1.json' with { type: 'json' };
import { languageCodes } from '../models/index.js';
import { manifest } from '../jobs/validation.js';
const freeze = (v) => {
  if (v && typeof v === 'object') {
    Object.values(v).forEach(freeze);
    Object.freeze(v);
  }
  return v;
};
const profile = z.discriminatedUnion('execution', [
  z.strictObject({
    id: z.string().min(1).max(200),
    execution: z.literal('server_adapter'),
    model: z.literal('gemini-3.8-flash-tts'),
    voice: z.literal('Kore'),
    style: z.string().min(1).max(1000),
    conversion: z.literal('mp3-mono-24k-64k-v1'),
  }),
  z.strictObject({
    id: z.string().min(1).max(200),
    execution: z.literal('local_worker'),
    model: z.string().regex(/^facebook\/mms-tts-[a-z_-]+$/),
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    license: z.literal('cc-by-nc-4.0'),
    conversion: z.literal('mp3-mono-24k-64k-v1'),
  }),
]);
const checked = z
  .strictObject({
    registryVersion: z.literal('vinlook-hybrid-v1'),
    translationModel: z.literal('gemini-3.5-flash-lite'),
    profiles: z.strictObject(Object.fromEntries(languageCodes.map((c) => [c, profile]))),
  })
  .parse(data);
for (const [code, p] of Object.entries(checked.profiles))
  if (
    p.execution === 'server_adapter'
      ? !['zh-Hant', 'ja', 'ar-EG', 'pt-PT'].includes(code) ||
        p.id !== `${p.model}:${p.voice}:${code}:v1`
      : p.id !== `${p.model}@${p.revision}`
  )
    throw new Error('Invalid hybrid registry');
export const hybrid = freeze(checked);
export const processingManifest = manifest({
  registryVersion: hybrid.registryVersion,
  languages: Object.fromEntries(
    languageCodes.map((c) => [
      c,
      {
        audio: { execution: hybrid.profiles[c].execution, modelId: hybrid.profiles[c].id },
        translation:
          c === 'en' ? null : { execution: 'server_adapter', modelId: hybrid.translationModel },
      },
    ]),
  ),
});
if (!processingManifest) throw new Error('Invalid hybrid manifest');
export const publicationRegistry = freeze({
  registryVersion: hybrid.registryVersion,
  languages: Object.fromEntries(
    languageCodes.map((c) => [c, { voiceOrModelId: hybrid.profiles[c].id }]),
  ),
});
export function loadAdapterConfig(env = process.env, now = Date.now()) {
  const names = [
    'GEMINI_API_KEY',
    'CONTENT_GEMINI_FREE_TIER_CONFIRMED_AT',
    'CONTENT_GEMINI_TRANSLATION_RPM',
    'CONTENT_GEMINI_TRANSLATION_RPD',
    'CONTENT_GEMINI_TTS_RPM',
    'CONTENT_GEMINI_TTS_RPD',
    'CONTENT_FFMPEG_PATH',
    'CONTENT_FFPROBE_PATH',
  ];
  const bad = () => {
    throw new Error('Invalid Gemini adapter configuration');
  };
  if (env.CONTENT_GEMINI_ENABLED === undefined || env.CONTENT_GEMINI_ENABLED === 'false') {
    if (names.some((k) => env[k] !== undefined)) bad();
    return null;
  }
  if (
    env.CONTENT_GEMINI_ENABLED !== 'true' ||
    names.some((k) => typeof env[k] !== 'string' || !env[k])
  )
    bad();
  const confirmed = Date.parse(env.CONTENT_GEMINI_FREE_TIER_CONFIRMED_AT);
  if (
    !Number.isFinite(confirmed) ||
    new Date(confirmed).toISOString() !== env.CONTENT_GEMINI_FREE_TIER_CONFIRMED_AT ||
    confirmed > now ||
    now - confirmed > 604800000
  )
    bad();
  if (!/^[\x21-\x7e]{20,256}$/.test(env.GEMINI_API_KEY)) bad();
  const caps = {};
  for (const type of ['translation', 'tts']) {
    const pre = 'CONTENT_GEMINI_' + type.toUpperCase();
    const rpm = env[pre + '_RPM'],
      rpd = env[pre + '_RPD'];
    if (!/^[1-9][0-9]{0,6}$/.test(rpm) || !/^[1-9][0-9]{0,6}$/.test(rpd)) bad();
    caps[type] = { rpm: Number(rpm), rpd: Number(rpd) };
  }
  for (const name of ['CONTENT_FFMPEG_PATH', 'CONTENT_FFPROBE_PATH'])
    if (!path.isAbsolute(env[name]) || /[\x00-\x1f\x7f]/.test(env[name])) bad();
  return Object.freeze({
    key: env.GEMINI_API_KEY,
    confirmedAt: confirmed,
    caps: freeze(caps),
    ffmpeg: env.CONTENT_FFMPEG_PATH,
    ffprobe: env.CONTENT_FFPROBE_PATH,
  });
}
