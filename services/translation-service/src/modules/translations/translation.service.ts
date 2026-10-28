import { createHash } from 'node:crypto';
import { supportsLanguage } from '../languages/languages.js';
import { TranslationError, type PoiSource, type Translation, type TranslationProvider, type TranslationRepository } from './types.js';

export function createTranslationService(source: PoiSource, repository: TranslationRepository, provider: TranslationProvider) {
  const inFlight = new Map<string, Promise<Translation>>();
  return { async get(poiId: string, language: string) {
    if (!supportsLanguage(language)) throw new TranslationError('UNSUPPORTED_LANGUAGE');
    const poi = await source.get(poiId);
    const hash = createHash('sha256').update(JSON.stringify([poi.sourceLanguage, poi.name, poi.description])).digest('hex');
    if (language === poi.sourceLanguage) return { data: { poiId, language, sourceLanguage: poi.sourceLanguage, sourceHash: hash, name: poi.name, description: poi.description, provider: 'Original', translatedAt: null }, fromCache: false, original: true };
    const cached = await repository.find(poiId, language, hash);
    if (cached && (cached.provider === 'Codex editorial' || cached.provider === provider.name || provider.acceptsCachedProvider?.(cached.provider))) return { data: cached, fromCache: true, original: false };
    const key = `${poiId}:${language}:${hash}`;
    let pending = inFlight.get(key);
    if (!pending) {
      pending = (async () => {
        const [name, description] = await Promise.all([
          provider.translate(poi.name, poi.sourceLanguage, language),
          provider.translate(poi.description, poi.sourceLanguage, language),
        ]);
        const result: Translation = { poiId, language, sourceLanguage: poi.sourceLanguage, sourceHash: hash, name, description, provider: provider.name, translatedAt: new Date().toISOString() };
        await repository.save(result);
        return result;
      })();
      inFlight.set(key, pending);
      void pending.finally(() => { if (inFlight.get(key) === pending) inFlight.delete(key); }).catch(() => {});
    }
    return { data: await pending, fromCache: false, original: false };
  }, ready: () => repository.ready() };
}
