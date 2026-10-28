import { z } from 'zod';
import { TranslationError } from '../modules/translations/types.js';
import { checkTtsStatus, requireWav, synthesisError, type TtsProvider } from './tts-types.js';

const voices: Record<string, { languageCode: string; name: string }> = {
  vi: { languageCode: 'vi-VN', name: 'vi-VN-Standard-A' },
  en: { languageCode: 'en-US', name: 'en-US-Standard-C' },
  'zh-CN': { languageCode: 'cmn-CN', name: 'cmn-CN-Standard-A' },
};
const schema = z.object({ audioContent: z.string().min(1).max(28000000) });
export function createGoogleCloudTts(key = process.env.GOOGLE_TTS_API_KEY, fetcher: typeof fetch = fetch): TtsProvider {
  return { identity: JSON.stringify(['google-standard-v1', voices, 'LINEAR16', 24000]), async generate(text, language = 'vi') {
    if (!key?.trim()) throw new TranslationError('PROVIDER_NOT_CONFIGURED');
    const voice = voices[language]; if (!voice) throw new TranslationError('UNSUPPORTED_LANGUAGE');
    if (Buffer.byteLength(text) > 5000) throw new TranslationError('PROVIDER_UNAVAILABLE');
    const signal = AbortSignal.timeout(20000);
    try {
      const response = await fetcher('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal, redirect: 'error',
        body: JSON.stringify({ input: { text }, voice, audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 } }),
      });
      checkTtsStatus(response.status);
      const parsed = schema.safeParse(await response.json());
      if (!parsed.success) throw new TranslationError('PROVIDER_UNAVAILABLE');
      return requireWav(Buffer.from(parsed.data.audioContent, 'base64'));
    } catch (error) { return synthesisError(error, signal); }
  } };
}
