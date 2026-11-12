import { query } from '@vinlook/server/postgres';
import { read_object, write_object } from '@vinlook/server/storage';
import type { NarrationRepository, NarrationMetadata } from './narration.repository.js';
export const postgres_narration_repository: NarrationRepository & {
  metadata(id: string): Promise<NarrationMetadata[]>;
} = {
  async metadata(id) {
    return (
      await query(
        'SELECT language_code AS language,content_hash AS hash,bytes,created_at FROM poi_narrations WHERE poi_id=$1',
        [id],
      )
    ).rows.map((row) => ({
      ...row,
      created_at: row.created_at.toISOString(),
    })) as NarrationMetadata[];
  },
  async find(id, language, hash) {
    const row = (
      await query(
        'SELECT audio,storage_path FROM poi_narrations WHERE poi_id=$1 AND language_code=$2 AND content_hash=$3',
        [id, language, hash],
      )
    ).rows[0];
    if (!row) return;
    return row.audio ?? (row.storage_path ? read_object(row.storage_path) : undefined);
  },
  async save(id, language, hash, audio) {
    if (
      !/^POI\d{3,20}$/i.test(id) ||
      !/^[a-zA-Z0-9-]{2,10}$/.test(language) ||
      !/^[a-f0-9]{64}$/.test(hash)
    )
      throw new Error('Invalid narration key');
    const path = `narrations/${id}/${language}/${hash}.wav`;
    await write_object(path, audio, 'audio/wav');
    await query(
      `INSERT INTO poi_narrations(poi_id,language_code,content_hash,storage_path,bytes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(poi_id,language_code) DO UPDATE SET content_hash=EXCLUDED.content_hash,storage_path=EXCLUDED.storage_path,bytes=EXCLUDED.bytes,audio=NULL,created_at=now()`,
      [id, language, hash, path, audio.length],
    );
  },
};
