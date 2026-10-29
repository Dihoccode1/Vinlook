import { z } from 'zod';
import { languages, supports_language } from './modules/languages/languages.js';
import { create_poi_source } from './providers/poi-source.js';
import { create_translation_provider } from './providers/translation-provider.js';
import { create_tts_provider } from './providers/tts-provider.js';
import { create_translation_service } from './modules/translations/translation.service.js';
import { create_narration_service } from './modules/translations/narration.service.js';
import { translation_repository } from './modules/translations/translation.repository.js';
import { narration_repository } from './modules/translations/narration.repository.js';
import { close_pool } from './config/database.js';
import { prepare_batch } from './modules/translations/prepare-batch.js';
import { create_narration_file_store } from './modules/translations/narration-files.js';

async function main() {
  const requested = process.argv.slice(2).filter(value => !value.startsWith('--'));
  const targets = requested.length ? requested : languages.map(item => item.code);
  if (!targets.every(supports_language)) throw new Error('Unsupported language');
  const text_only = process.argv.includes('--text-only');
  const source = create_poi_source();
  const translations = create_translation_service(source, translation_repository, create_translation_provider());
  const narration = create_narration_service(translations, create_tts_provider(), narration_repository, create_narration_file_store());
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
  const result = await prepare_batch(ids, targets, {
    translate: async (id, language) => {
      const result = await translations.get(id, language);
      console.log(`TEXT ${id} ${language} ${result.original ? 'original' : result.from_cache ? 'cached' : 'saved'}`);
    },
    narrate: text_only ? undefined : async (id, language) => {
      const audio = await narration.get(id, language);
      console.log(`AUDIO ${id} ${language} ready (${audio.length} bytes)`);
    },
    report: console.log,
  });
  console.log(`Preparation finished: text ${result.text_ready}/${result.total}, audio ${result.audio_ready}/${result.total}, errors ${result.failures.length}.`);
  if (result.failures.length) process.exitCode = 1;
}
main().catch(error => { console.error('Preparation stopped:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; }).finally(close_pool);
