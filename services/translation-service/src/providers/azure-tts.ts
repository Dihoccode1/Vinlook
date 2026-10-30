import { TranslationError } from '../modules/translations/types.js';
import { check_tts_status, require_wav, synthesis_error, type TtsProvider } from './tts-types.js';

const voices: Record<string, { locale: string; name: string }> = {
  vi: { locale: 'vi-VN', name: 'vi-VN-HoaiMyNeural' },
  en: { locale: 'en-US', name: 'en-US-JennyNeural' },
  'zh-CN': { locale: 'zh-CN', name: 'zh-CN-XiaoxiaoNeural' },
};
export function escape_ssml(text: string) { return text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!); }
export function create_azure_tts(key = process.env.AZURE_SPEECH_KEY, region = process.env.AZURE_SPEECH_REGION, fetcher: typeof fetch = fetch): TtsProvider {
  return { identity: JSON.stringify(['azure-neural-v1', region ?? '', voices, 'riff-24khz-16bit-mono-pcm']), async generate(text, language = 'vi') {
    if (!key?.trim() || !region || !/^[a-z0-9]{3,40}$/.test(region)) throw new TranslationError('PROVIDER_NOT_CONFIGURED');
    const voice = voices[language]; if (!voice) throw new TranslationError('UNSUPPORTED_LANGUAGE');
    const body = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.locale}"><voice name="${voice.name}">${escape_ssml(text)}</voice></speak>`;
    if (Buffer.byteLength(body) > 64000) throw new TranslationError('PROVIDER_UNAVAILABLE');
    const signal = AbortSignal.timeout(20000);
    try {
      const response = await fetcher(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key, 'content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm', 'User-Agent': 'Vinlook' },
        body, signal, redirect: 'error',
      });
      check_tts_status(response.status);
      return require_wav(Buffer.from(await response.arrayBuffer()));
    } catch (error) { return synthesis_error(error, signal); }
  } };
}
