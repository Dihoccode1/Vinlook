import { TranslationError } from '../modules/translations/types.js';
import { createGeminiTts } from './gemini-tts.js';
import { createAzureTts } from './azure-tts.js';
import { createGoogleCloudTts } from './google-cloud-tts.js';
import type { TtsProvider } from './tts-types.js';

export function createTtsPool(providers: TtsProvider[], now = Date.now): TtsProvider {
  if (!providers.length) throw new Error('At least one TTS provider is required');
  if (providers.length === 1) return providers[0]!;
  let cursor = 0;
  const cooldown = new Map<TtsProvider, { until: number; error: TranslationError }>();
  const active = new Set<TtsProvider>();
  return {
    identity: JSON.stringify(['tts-pool-v1', providers.map(provider => provider.identity)]),
    cacheIdentities: providers.flatMap(provider => [provider.identity, ...(provider.cacheIdentities ?? [])]),
    async generate(text, language = 'vi') {
      const start = cursor++ % providers.length;
      let last: TranslationError | undefined;
      let onlyUnsupported = true;
      for (let offset = 0; offset < providers.length; offset++) {
        const provider = providers[(start + offset) % providers.length]!;
        const failed = cooldown.get(provider);
        if (failed && failed.until > now()) { last = failed.error; onlyUnsupported = false; continue; }
        if (active.has(provider)) { last = new TranslationError('PROVIDER_BUSY'); onlyUnsupported = false; continue; }
        active.add(provider);
        try { return await provider.generate(text, language); }
        catch (error) {
          if (!(error instanceof TranslationError)) throw error;
          if (error.code === 'UNSUPPORTED_LANGUAGE') continue;
          if (!['PROVIDER_QUOTA', 'PROVIDER_UNAVAILABLE', 'PROVIDER_NOT_CONFIGURED', 'PROVIDER_TIMEOUT', 'PROVIDER_BUSY'].includes(error.code)) throw error;
          onlyUnsupported = false; last = error;
          cooldown.set(provider, { until: now() + (error.code === 'PROVIDER_QUOTA' ? 60000 : 10000), error });
        } finally { active.delete(provider); }
      }
      throw last ?? new TranslationError(onlyUnsupported ? 'UNSUPPORTED_LANGUAGE' : 'PROVIDER_UNAVAILABLE');
    },
  };
}

export function createTtsProvider(): TtsProvider {
  const names = [...new Set((process.env.TTS_PROVIDERS ?? 'gemini,azure,google').split(',').map(name => name.trim()).filter(Boolean))];
  if (!names.length || names.some(name => !['gemini', 'azure', 'google'].includes(name))) throw new Error('TTS_PROVIDERS must contain gemini, azure or google');
  const providers = names.flatMap(name => {
    if (name === 'gemini' && process.env.GEMINI_API_KEY?.trim()) return [createGeminiTts()];
    if (name === 'azure' && process.env.AZURE_SPEECH_KEY?.trim() && process.env.AZURE_SPEECH_REGION?.trim()) return [createAzureTts()];
    if (name === 'google' && process.env.GOOGLE_TTS_API_KEY?.trim()) return [createGoogleCloudTts()];
    return [];
  });
  if (!providers.length) return { identity: 'unconfigured-tts', async generate() { throw new TranslationError('PROVIDER_NOT_CONFIGURED'); } };
  return createTtsPool(providers);
}
