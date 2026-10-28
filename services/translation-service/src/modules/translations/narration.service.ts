import { narrationKey } from './narration-key.js';
import { TranslationError } from './types.js';
import type { NarrationRepository } from './narration.repository.js';
import type { TtsProvider } from '../../providers/tts-types.js';

export function createNarrationService(translations: { get(id: string, language: string): Promise<{ data: { name: string; description: string } }> }, provider: TtsProvider, repository?: NarrationRepository, files?: NarrationRepository) {
  const cache = new Map<string, Buffer>();
  const pending = new Map<string, Promise<Buffer>>();
  let cacheBytes = 0;
  let generating = 0;
  return { async get(id: string, language: string) {
    const { data } = await translations.get(id, language);
    const text = `${data.name}. ${data.description}`;
    const key = narrationKey(id, language, data.name, data.description, provider.identity);
    const cached = cache.get(key); if (cached) return cached;
    const existing = pending.get(key); if (existing) return existing;
    const task = (async () => {
      let saved = await repository?.find(id, language, key);
      let local = await files?.find(id, language, key);
      if (!saved && !local) for (const identity of provider.cacheIdentities ?? []) {
        const previousKey = narrationKey(id, language, data.name, data.description, identity);
        const previous = await repository?.find(id, language, previousKey) ?? await files?.find(id, language, previousKey);
        if (previous) { saved = previous; await repository?.save(id, language, key, previous); break; }
      }
      let audio = saved ?? local;
      if (!audio) {
        if (generating >= 2) throw new TranslationError('PROVIDER_BUSY');
        generating++;
        try { audio = await provider.generate(text, language); }
        finally { generating--; }
      }
      if (!saved) await repository?.save(id, language, key, audio);
      if (!local) await files?.save(id, language, key, audio);
      if (audio.length <= 32_000_000) {
        while (cacheBytes + audio.length > 32_000_000 && cache.size) {
          const first = cache.keys().next().value!; cacheBytes -= cache.get(first)!.length; cache.delete(first);
        }
        cache.set(key, audio); cacheBytes += audio.length;
      }
      return audio;
    })();
    pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  } };
}
