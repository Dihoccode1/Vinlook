import { TranslationError, type TranslationProvider } from '../modules/translations/types.js';

/** Share work across providers; never duplicate a successful request. */
export function create_translation_pool(providers: TranslationProvider[], now = Date.now): TranslationProvider {
  if (!providers.length) throw new Error('At least one translation provider is required');
  let next = 0;
  const cooldown = new Map<TranslationProvider, number>();
  return {
    name: 'Multi-provider translation',
    accepts_cached_provider: name => name === 'Multi-provider translation' || providers.some(provider => provider.name === name),
    async translate(text, source, target) {
      const start = next++ % providers.length;
      let last_error: TranslationError = new TranslationError('PROVIDER_QUOTA');
      for (let offset = 0; offset < providers.length; offset++) {
        const provider = providers[(start + offset) % providers.length]!;
        if ((cooldown.get(provider) ?? 0) > now()) continue;
        try { return await provider.translate(text, source, target); }
        catch (error) {
          if (!(error instanceof TranslationError) || !['PROVIDER_QUOTA', 'PROVIDER_TIMEOUT', 'PROVIDER_UNAVAILABLE', 'PROVIDER_NOT_CONFIGURED'].includes(error.code)) throw error;
          last_error = error;
          cooldown.set(provider, now() + (error.code === 'PROVIDER_QUOTA' ? 60000 : 10000));
        }
      }
      throw last_error;
    },
  };
}
