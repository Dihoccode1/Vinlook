export interface SourcePoi { id: string; name: string; description: string; source_language: string }
export interface Translation {
  poi_id: string; language: string; source_language: string; source_hash: string;
  name: string; description: string; provider: string; translated_at: string;
}
export interface TranslationRepository {
  find(poi_id: string, language: string, source_hash: string): Promise<Translation | undefined>;
  save(translation: Translation): Promise<void>;
  ready(): Promise<void>;
}
export interface TranslationProvider { name: string; accepts_cached_provider?(name: string): boolean; translate(text: string, source: string, target: string): Promise<string> }
export interface PoiSource { get(id: string): Promise<SourcePoi> }
export class TranslationError extends Error {
  constructor(public code: 'PROVIDER_BUSY' | 'PROVIDER_NOT_CONFIGURED' | 'POI_NOT_FOUND' | 'SOURCE_UNAVAILABLE' | 'UNSUPPORTED_LANGUAGE' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_QUOTA' | 'PROVIDER_TIMEOUT') { super(code); }
}
