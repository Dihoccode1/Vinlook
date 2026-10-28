import { getPool, closePool } from './config/database.js';
import { createNarrationFileStore } from './modules/translations/narration-files.js';
async function main() {
  const pool = await getPool();
  const rows = (await pool.request().query<{ id: string; language: string; hash: string; audio: Buffer }>(
    'SELECT PoiId AS id, LanguageCode AS language, ContentHash AS hash, Audio AS audio FROM dbo.PoiNarrations',
  )).recordset;
  const files = createNarrationFileStore();
  for (const row of rows) { await files.save(row.id, row.language, row.hash, row.audio); console.log(`Saved WAV: ${row.id}/${row.language}-${row.hash}.wav`); }
  console.log(`Exported ${rows.length} audio files from SQL Server without calling Gemini.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Export failed'); process.exitCode = 1; }).finally(closePool);
