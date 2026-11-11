import { track_translation } from './provider-status.js';
import { create_google_translate_provider } from './google-translate.js';
import { create_gemini_translate_provider } from './gemini-translate.js';
import { create_my_memory_provider } from './mymemory.js';
import { create_translation_pool } from './translation-pool.js';

export function create_translation_provider() {
  if (process.env.TRANSLATION_PROVIDERS?.trim()) {
    const names = [
      ...new Set(process.env.TRANSLATION_PROVIDERS.split(',').map((value) => value.trim())),
    ];
    return create_translation_pool(
      names.map((name) => {
        if (name === 'google')
          return track_translation(
            'Google Translate',
            !!process.env.GOOGLE_TRANSLATE_API_KEY?.trim(),
            create_google_translate_provider(),
          );
        if (name === 'gemini')
          return track_translation(
            'Gemini',
            !!process.env.GEMINI_API_KEY?.trim(),
            create_gemini_translate_provider(),
          );
        if (name === 'mymemory')
          return track_translation('MyMemory', true, create_my_memory_provider());
        throw new Error('TRANSLATION_PROVIDERS only supports gemini, google, mymemory');
      }),
    );
  }
  const provider =
    process.env.TRANSLATION_PROVIDER ??
    (process.env.GOOGLE_TRANSLATE_API_KEY?.trim() ? 'google' : 'gemini');
  if (provider === 'google')
    return track_translation(
      'Google Translate',
      !!process.env.GOOGLE_TRANSLATE_API_KEY?.trim(),
      create_google_translate_provider(),
    );
  if (provider === 'gemini')
    return track_translation(
      'Gemini',
      !!process.env.GEMINI_API_KEY?.trim(),
      create_gemini_translate_provider(),
    );
  throw new Error('TRANSLATION_PROVIDER must be google or gemini');
}
