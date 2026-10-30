import sql from 'mssql';
import { get_pool } from '../../config/database.js';

export interface NarrationRepository {
  find(id: string, language: string, hash: string): Promise<Buffer | undefined>;
  save(id: string, language: string, hash: string, audio: Buffer): Promise<void>;
}
export interface NarrationMetadata { language: string; hash: string; bytes: number; created_at: string }
export const narration_repository: NarrationRepository & { metadata(id: string): Promise<NarrationMetadata[]> } = {
  async metadata(id) {
    const pool = await get_pool();
    const result = await pool.request().input('id', sql.VarChar(36), id)
      .query<{ language: string; hash: string; bytes: number; created_at: Date }>('SELECT language_code AS language, content_hash AS hash, CONVERT(INT, DATALENGTH(audio)) AS bytes, created_at AS created_at FROM dbo.poi_narrations WHERE poi_id = @id');
    return result.recordset.map(row => ({ ...row, created_at: row.created_at.toISOString() }));
  },
  async find(id, language, hash) {
    const pool = await get_pool();
    const result = await pool.request().input('id', sql.VarChar(36), id).input('language', sql.VarChar(10), language).input('hash', sql.Char(64), hash)
      .query<{ audio: Buffer }>('SELECT audio AS audio FROM dbo.poi_narrations WHERE poi_id = @id AND language_code = @language AND content_hash = @hash');
    return result.recordset[0]?.audio;
  },
  async save(id, language, hash, audio) {
    const pool = await get_pool();
    await pool.request().input('id', sql.VarChar(36), id).input('language', sql.VarChar(10), language)
      .input('hash', sql.Char(64), hash).input('audio', sql.VarBinary(sql.MAX), audio)
      .query(`SET XACT_ABORT ON; BEGIN TRANSACTION;
        UPDATE dbo.poi_narrations WITH (UPDLOCK, SERIALIZABLE) SET content_hash = @hash, audio = @audio, created_at = SYSUTCDATETIME()
          WHERE poi_id = @id AND language_code = @language;
        IF @@ROWCOUNT = 0 INSERT INTO dbo.poi_narrations (poi_id, language_code, content_hash, audio) VALUES (@id, @language, @hash, @audio);
        COMMIT TRANSACTION;`);
  },
};
