import { z } from 'zod';
import { TranslationError, type TranslationProvider } from '../modules/translations/types.js';

/** Limit is UTF-8 bytes, not JS character count. Preserve code points and paragraph boundaries. */
export function splitForTranslation(text: string, limit = 500): string[] {
  const result: string[] = [];
  let chunk = '';
  for (const token of text.match(/\n+|[^\S\n]+|[^\s]+/gu) ?? []) {
    if (token.includes('\n')) { if (chunk.trim()) result.push(chunk.trim()); result.push(token); chunk = ''; continue; }
    if (Buffer.byteLength(chunk + token, 'utf8') <= limit) { chunk += token; continue; }
    if (chunk.trim()) result.push(chunk.trim()); chunk = '';
    for (const character of token) {
      if (Buffer.byteLength(chunk + character, 'utf8') > limit) { result.push(chunk); chunk = ''; }
      chunk += character;
    }
  }
  if (chunk.trim()) result.push(chunk.trim());
  return result;
}
const schema = z.object({ responseStatus: z.coerce.number(), responseData: z.object({ translatedText: z.string().trim().min(1) }).optional(), quotaFinished: z.boolean().optional() });
export function createMyMemoryProvider(fetcher: typeof fetch = fetch): TranslationProvider {
  return { name: 'MyMemory', async translate(text, source, target) {
    if (!text.trim()) return text;
    const signal = AbortSignal.timeout(20000);
    const translated: string[] = [];
    for (const chunk of splitForTranslation(text)) {
      if (/^\n+$/u.test(chunk)) { translated.push(chunk); continue; }
      const url = new URL('https://api.mymemory.translated.net/get');
      url.search = new URLSearchParams({ q: chunk, langpair: `${source}|${target}`, mt: '1' }).toString();
      let response: Response;
      try { response = await fetcher(url, { signal, redirect: 'error' }); }
      catch (error) { throw new TranslationError(signal.aborted || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE'); }
      if (response.status === 429) throw new TranslationError('PROVIDER_QUOTA');
      if (!response.ok) throw new TranslationError('PROVIDER_UNAVAILABLE');
      let body: unknown;
      try { body = await response.json(); } catch { throw new TranslationError(signal.aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE'); }
      const parsed = schema.safeParse(body);
      if (!parsed.success) throw new TranslationError('PROVIDER_UNAVAILABLE');
      if (parsed.data.quotaFinished || parsed.data.responseStatus === 429) throw new TranslationError('PROVIDER_QUOTA');
      if (parsed.data.responseStatus !== 200 || !parsed.data.responseData) throw new TranslationError('PROVIDER_UNAVAILABLE');
      const value = parsed.data.responseData.translatedText;
      translated.push(value);
    }
    return translated.reduce((output, part) => output + (!output || output.endsWith('\n') || part.startsWith('\n') ? '' : ' ') + part, '');
  } };
}
