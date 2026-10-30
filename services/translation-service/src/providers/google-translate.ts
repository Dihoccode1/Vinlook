import { z } from 'zod';
import { TranslationError, type TranslationProvider } from '../modules/translations/types.js';

const schema = z.object({ data: z.object({ translations: z.array(z.object({ translatedText: z.string().min(1) })).length(1) }) });
export function create_google_translate_provider(api_key = process.env.GOOGLE_TRANSLATE_API_KEY, fetcher: typeof fetch = fetch): TranslationProvider {
  return { name: 'Google Cloud Translation', async translate(text, source, target) {
    if (!text.trim()) return text;
    if (!api_key?.trim()) throw new TranslationError('PROVIDER_NOT_CONFIGURED');
    const signal = AbortSignal.timeout(20000);
    try {
      const response = await fetcher('https://translation.googleapis.com/language/translate/v2', {
        method: 'POST', headers: { 'content-Type': 'application/json', 'X-Goog-Api-Key': api_key },
        body: JSON.stringify({ q: text, source, target, format: 'text' }), signal, redirect: 'error',
      });
      if (response.status === 429) throw new TranslationError('PROVIDER_QUOTA');
      if (!response.ok) throw new TranslationError('PROVIDER_UNAVAILABLE');
      const parsed = schema.safeParse(await response.json());
      if (!parsed.success) throw new TranslationError('PROVIDER_UNAVAILABLE');
      return parsed.data.data.translations[0]!.translatedText;
    } catch (error) {
      if (error instanceof TranslationError) throw error;
      throw new TranslationError(signal.aborted || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE');
    }
  } };
}
