import { createHash } from 'node:crypto';
import { supports_language } from '../languages/languages.js';
import { TranslationError, type PoiSource, type Translation, type TranslationProvider, type TranslationRepository } from './types.js';

export function create_translation_service(source: PoiSource, repository: TranslationRepository, provider: TranslationProvider) {
  const in_flight = new Map<string, Promise<Translation>>();
  return { async get(poi_id: string, language: string) {
    if (!supports_language(language)) throw new TranslationError('UNSUPPORTED_LANGUAGE');
    const poi = await source.get(poi_id);
    const hash = createHash('sha256').update(JSON.stringify([poi.source_language, poi.name, poi.description])).digest('hex');
    if (language === poi.source_language) return { data: { poi_id: poi_id, language, source_language: poi.source_language, source_hash: hash, name: poi.name, description: poi.description, provider: 'Original', translated_at: null }, from_cache: false, original: true };
    const cached = await repository.find(poi_id, language, hash);
    if (cached && (cached.provider === 'Codex editorial' || cached.provider === provider.name || provider.accepts_cached_provider?.(cached.provider))) return { data: cached, from_cache: true, original: false };
    const key = `${poi_id}:${language}:${hash}`;
    let pending = in_flight.get(key);
    if (!pending) {
      pending = (async () => {
        const [name, description] = await Promise.all([
          provider.translate(poi.name, poi.source_language, language),
          provider.translate(poi.description, poi.source_language, language),
        ]);
        const result: Translation = { poi_id: poi_id, language, source_language: poi.source_language, source_hash: hash, name, description, provider: provider.name, translated_at: new Date().toISOString() };
        await repository.save(result);
        return result;
      })();
      in_flight.set(key, pending);
      void pending.finally(() => { if (in_flight.get(key) === pending) in_flight.delete(key); }).catch(() => {});
    }
    return { data: await pending, from_cache: false, original: false };
  }, ready: () => repository.ready() };
}
