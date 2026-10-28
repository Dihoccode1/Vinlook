import { createGoogleTranslateProvider } from './google-translate.js';
import { createGeminiTranslateProvider } from './gemini-translate.js';
import { createMyMemoryProvider } from './mymemory.js';
import { createTranslationPool } from './translation-pool.js';

export function createTranslationProvider() {
  if (process.env.TRANSLATION_PROVIDERS?.trim()) {
    const names = [...new Set(process.env.TRANSLATION_PROVIDERS.split(',').map(value => value.trim()))];
    return createTranslationPool(names.map(name => {
      if (name === 'google') return createGoogleTranslateProvider();
      if (name === 'gemini') return createGeminiTranslateProvider();
      if (name === 'mymemory') return createMyMemoryProvider();
      throw new Error('TRANSLATION_PROVIDERS only supports gemini, google, mymemory');
    }));
  }
  const provider = process.env.TRANSLATION_PROVIDER ?? (process.env.GOOGLE_TRANSLATE_API_KEY?.trim() ? 'google' : 'gemini');
  if (provider === 'google') return createGoogleTranslateProvider();
  if (provider === 'gemini') return createGeminiTranslateProvider();
  throw new Error('TRANSLATION_PROVIDER must be google or gemini');
}
