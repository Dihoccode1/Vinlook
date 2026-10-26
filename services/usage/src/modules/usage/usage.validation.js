import { z } from 'zod';
import { uuid, objectId, languageCodes, endReasons } from './usage.policy.js';
const browser = z.string().regex(uuid),
  playback = browser;
export const usageInputs = {
  presence: z.strictObject({ browserId: browser }),
  start: z.strictObject({
    browserId: browser,
    playbackId: playback,
    poiId: z.string().regex(objectId),
    languageCode: z.enum(languageCodes),
  }),
  heartbeat: z.strictObject({ browserId: browser }),
  end: z.strictObject({ browserId: browser, reason: z.enum(endReasons) }),
};
