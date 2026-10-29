import { get_pool, close_pool } from './config/database.js';
import { create_narration_file_store } from './modules/translations/narration-files.js';
async function main() {
  const pool = await get_pool();
  const rows = (await pool.request().query<{ id: string; language: string; hash: string; audio: Buffer }>(
    'SELECT poi_id AS id, language_code AS language, content_hash AS hash, audio AS audio FROM dbo.poi_narrations',
  )).recordset;
  const files = create_narration_file_store();
  for (const row of rows) { await files.save(row.id, row.language, row.hash, row.audio); console.log(`Saved WAV: ${row.id}/${row.language}-${row.hash}.wav`); }
  console.log(`Exported ${rows.length} audio files from SQL Server without calling Gemini.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Export failed'); process.exitCode = 1; }).finally(close_pool);
