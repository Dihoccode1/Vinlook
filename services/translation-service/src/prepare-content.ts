import { z } from 'zod';
import { languages, supportsLanguage } from './modules/languages/languages.js';
import { createPoiSource } from './providers/poi-source.js';
import { createTranslationProvider } from './providers/translation-provider.js';
import { createTtsProvider } from './providers/tts-provider.js';
import { createTranslationService } from './modules/translations/translation.service.js';
import { createNarrationService } from './modules/translations/narration.service.js';
import { translationRepository } from './modules/translations/translation.repository.js';
import { narrationRepository } from './modules/translations/narration.repository.js';
import { closePool } from './config/database.js';
import { prepareBatch } from './modules/translations/prepare-batch.js';
import { createNarrationFileStore } from './modules/translations/narration-files.js';

async function main() {
  const requested = process.argv.slice(2).filter(value => !value.startsWith('--'));
  const targets = requested.length ? requested : languages.map(item => item.code);
  if (!targets.every(supportsLanguage)) throw new Error('Unsupported language');
  const textOnly = process.argv.includes('--text-only');
  const source = createPoiSource();
  const translations = createTranslationService(source, translationRepository, createTranslationProvider());
  const narration = createNarrationService(translations, createTtsProvider(), narrationRepository, createNarrationFileStore());
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const url = new URL('/pois', process.env.POI_SERVICE_URL ?? 'http://localhost:4001');
    url.search = new URLSearchParams({ page: String(page), limit: '20' }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(6000), redirect: 'error' });
    if (!response.ok) throw new Error('POI list unavailable');
    const result = z.object({ data: z.array(z.object({ id: z.string().uuid() })), pagination: z.object({ total: z.number() }) }).parse(await response.json());
    ids.push(...result.data.map(poi => poi.id));
    if (ids.length >= result.pagination.total || !result.data.length) break;
  }
  console.log(`Preparing ${ids.length} POIs, ${targets.length} languages. Existing content is reused.`);
  const result = await prepareBatch(ids, targets, {
    translate: async (id, language) => {
      const result = await translations.get(id, language);
      console.log(`TEXT ${id} ${language} ${result.original ? 'original' : result.fromCache ? 'cached' : 'saved'}`);
    },
    narrate: textOnly ? undefined : async (id, language) => {
      const audio = await narration.get(id, language);
      console.log(`AUDIO ${id} ${language} ready (${audio.length} bytes)`);
    },
    report: console.log,
  });
  console.log(`Preparation finished: text ${result.textReady}/${result.total}, audio ${result.audioReady}/${result.total}, errors ${result.failures.length}.`);
  if (result.failures.length) process.exitCode = 1;
}
main().catch(error => { console.error('Preparation stopped:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; }).finally(closePool);
