import { z } from 'zod';
import { TranslationError } from '../modules/translations/types.js';

const responseSchema = z.object({ steps: z.array(z.object({ type: z.string(), content: z.array(z.object({ type: z.string(), data: z.string().optional() })).optional() })) });
export function createGeminiTts(apiKey = process.env.GEMINI_API_KEY, fetcher: typeof fetch = fetch) {
  const model = process.env.GEMINI_TTS_MODEL ?? 'gemini-3.8-flash-tts';
  const voice = process.env.GEMINI_TTS_VOICE ?? 'Kore';
  const style = process.env.GEMINI_TTS_STYLE?.trim() || 'Warm, welcoming and clear tour guide narration. Speak at a relaxed, moderate pace with natural pauses between sentences and longer pauses between paragraphs. Pronounce place names carefully. Read the transcript verbatim in its original language; do not add introductions, commentary, or music.';
  return { identity: JSON.stringify([model, voice, style]), async generate(text: string): Promise<Buffer> {
    if (!apiKey?.trim()) throw new TranslationError('PROVIDER_NOT_CONFIGURED');
    const signal = AbortSignal.timeout(120000);
    try {
      const response = await fetcher('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, signal, redirect: 'error',
        body: JSON.stringify({ model, input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style }] }] }], response_format: { type: 'audio', mime_type: 'audio/wav', sample_rate: 24000 }, generation_config: { speech_config: [{ voice }] } }),
      });
      if (response.status === 429) throw new TranslationError('PROVIDER_QUOTA');
      if (!response.ok) throw new TranslationError('PROVIDER_UNAVAILABLE');
      const body = responseSchema.safeParse(await response.json());
      if (!body.success) throw new TranslationError('PROVIDER_UNAVAILABLE');
      const encoded = body.data.steps.filter(step => step.type === 'model_output').flatMap(step => step.content ?? []).filter(part => part.type === 'audio').at(-1)?.data;
      if (!encoded || encoded.length > 28_000_000) throw new TranslationError('PROVIDER_UNAVAILABLE');
      const wav = Buffer.from(encoded, 'base64');
      if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') throw new TranslationError('PROVIDER_UNAVAILABLE');
      return wav;
    } catch (error) {
      if (error instanceof TranslationError) throw error;
      throw new TranslationError(signal.aborted || (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE');
    }
  } };
}
