import { TranslationError } from '../modules/translations/types.js';
export interface TtsProvider {
  identity: string;
  cache_identities?: string[];
  generate(text: string, language?: string): Promise<Buffer>;
}
export function require_wav(audio: Buffer) {
  if (audio.length < 44 || audio.length > 21000000 || audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE') throw new TranslationError('PROVIDER_UNAVAILABLE');
  return audio;
}
export function synthesis_error(error: unknown, signal: AbortSignal): never {
  if (error instanceof TranslationError) throw error;
  throw new TranslationError(signal.aborted || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE');
}
export function check_tts_status(status: number) {
  if (status === 429) throw new TranslationError('PROVIDER_QUOTA');
  if (status === 401 || status === 403) throw new TranslationError('PROVIDER_NOT_CONFIGURED');
  if (status < 200 || status >= 300) throw new TranslationError('PROVIDER_UNAVAILABLE');
}
