import { TranslationError } from './types.js';

export async function prepareBatch(ids: string[], languages: string[], actions: {
  translate(id: string, language: string): Promise<void>;
  narrate?(id: string, language: string): Promise<void>;
  report(message: string): void;
}) {
  const ready: { id: string; language: string }[] = [];
  const failures: string[] = [];
  for (const id of ids) for (const language of languages) {
    try { await actions.translate(id, language); ready.push({ id, language }); }
    catch (error) {
      const reason = error instanceof TranslationError ? error.code : 'UNEXPECTED_ERROR';
      failures.push(`TEXT ${id} ${language}: ${reason}`);
      actions.report(failures.at(-1)!);
    }
  }
  let audioReady = 0;
  if (actions.narrate) for (const { id, language } of ready) {
    try { await actions.narrate(id, language); audioReady++; }
    catch (error) {
      const reason = error instanceof TranslationError ? error.code : 'UNEXPECTED_ERROR';
      failures.push(`AUDIO ${id} ${language}: ${reason}`); actions.report(failures.at(-1)!);
      // Don't repeatedly call a TTS provider that has exhausted its quota.
      if (error instanceof TranslationError && ['PROVIDER_QUOTA', 'PROVIDER_NOT_CONFIGURED'].includes(error.code)) break;
    }
  }
  return { textReady: ready.length, audioReady, total: ids.length * languages.length, failures };
}
