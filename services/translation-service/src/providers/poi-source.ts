import { z } from 'zod';
import { TranslationError, type PoiSource } from '../modules/translations/types.js';
const schema = z.object({ data: z.object({ id: z.string().uuid(), name: z.string().max(200), description: z.string().max(20000), sourceLanguage: z.string().min(2).max(10) }) });
export function createPoiSource(base = process.env.POI_SERVICE_URL ?? 'http://localhost:4001', fetcher: typeof fetch = fetch): PoiSource {
  return { async get(id) {
    try {
      const response = await fetcher(new URL(`/pois/${encodeURIComponent(id)}`, base), { signal: AbortSignal.timeout(6000), redirect: 'error' });
      if (response.status === 404) throw new TranslationError('POI_NOT_FOUND');
      if (!response.ok) throw new TranslationError('SOURCE_UNAVAILABLE');
      const result = schema.safeParse(await response.json());
      if (!result.success || result.data.data.id.toLowerCase() !== id.toLowerCase()) throw new TranslationError('SOURCE_UNAVAILABLE');
      return result.data.data;
    } catch (error) { if (error instanceof TranslationError) throw error; throw new TranslationError('SOURCE_UNAVAILABLE'); }
  } };
}
