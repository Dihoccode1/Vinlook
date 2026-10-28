export interface SourcePoi { id: string; name: string; description: string; sourceLanguage: string }
export interface Translation {
  poiId: string; language: string; sourceLanguage: string; sourceHash: string;
  name: string; description: string; provider: string; translatedAt: string;
}
export interface TranslationRepository {
  find(poiId: string, language: string, sourceHash: string): Promise<Translation | undefined>;
  save(translation: Translation): Promise<void>;
  ready(): Promise<void>;
}
export interface TranslationProvider { name: string; acceptsCachedProvider?(name: string): boolean; translate(text: string, source: string, target: string): Promise<string> }
export interface PoiSource { get(id: string): Promise<SourcePoi> }
export class TranslationError extends Error {
  constructor(public code: 'PROVIDER_BUSY' | 'PROVIDER_NOT_CONFIGURED' | 'POI_NOT_FOUND' | 'SOURCE_UNAVAILABLE' | 'UNSUPPORTED_LANGUAGE' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_QUOTA' | 'PROVIDER_TIMEOUT') { super(code); }
}
