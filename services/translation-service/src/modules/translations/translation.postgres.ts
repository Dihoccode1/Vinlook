import { query } from '@vinlook/server/postgres';
import type { TranslationRepository } from './types.js';
export const postgres_translation_repository: TranslationRepository = {
  async find(id, language, hash) {
    const row = (
      await query(
        `SELECT poi_id,language_code AS language,source_language,source_hash,name,description,provider,translated_at FROM poi_translations WHERE poi_id=$1 AND language_code=$2 AND source_hash=$3`,
        [id, language, hash],
      )
    ).rows[0];
    return row ? ({ ...row, translated_at: row.translated_at.toISOString() } as any) : undefined;
  },
  async save(value) {
    await query(
      `INSERT INTO poi_translations(poi_id,language_code,source_language,source_hash,name,description,provider,translated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(poi_id,language_code) DO UPDATE SET source_language=EXCLUDED.source_language,source_hash=EXCLUDED.source_hash,name=EXCLUDED.name,description=EXCLUDED.description,provider=EXCLUDED.provider,translated_at=EXCLUDED.translated_at`,
      [
        value.poi_id,
        value.language,
        value.source_language,
        value.source_hash,
        value.name,
        value.description,
        value.provider,
        new Date(value.translated_at),
      ],
    );
  },
  async ready() {
    await query('SELECT poi_id FROM poi_translations LIMIT 0');
    await query('SELECT poi_id FROM poi_narrations LIMIT 0');
  },
};
