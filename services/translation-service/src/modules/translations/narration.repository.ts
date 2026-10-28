import sql from 'mssql';
import { getPool } from '../../config/database.js';

export interface NarrationRepository {
  find(id: string, language: string, hash: string): Promise<Buffer | undefined>;
  save(id: string, language: string, hash: string, audio: Buffer): Promise<void>;
}
export interface NarrationMetadata { language: string; hash: string; bytes: number; createdAt: string }
export const narrationRepository: NarrationRepository & { metadata(id: string): Promise<NarrationMetadata[]> } = {
  async metadata(id) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id)
      .query<{ language: string; hash: string; bytes: number; createdAt: Date }>('SELECT LanguageCode AS language, ContentHash AS hash, CONVERT(INT, DATALENGTH(Audio)) AS bytes, CreatedAt AS createdAt FROM dbo.PoiNarrations WHERE PoiId = @id');
    return result.recordset.map(row => ({ ...row, createdAt: row.createdAt.toISOString() }));
  },
  async find(id, language, hash) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).input('language', sql.VarChar(10), language).input('hash', sql.Char(64), hash)
      .query<{ audio: Buffer }>('SELECT Audio AS audio FROM dbo.PoiNarrations WHERE PoiId = @id AND LanguageCode = @language AND ContentHash = @hash');
    return result.recordset[0]?.audio;
  },
  async save(id, language, hash, audio) {
    const pool = await getPool();
    await pool.request().input('id', sql.UniqueIdentifier, id).input('language', sql.VarChar(10), language)
      .input('hash', sql.Char(64), hash).input('audio', sql.VarBinary(sql.MAX), audio)
      .query(`SET XACT_ABORT ON; BEGIN TRANSACTION;
        UPDATE dbo.PoiNarrations WITH (UPDLOCK, SERIALIZABLE) SET ContentHash = @hash, Audio = @audio, CreatedAt = SYSUTCDATETIME()
          WHERE PoiId = @id AND LanguageCode = @language;
        IF @@ROWCOUNT = 0 INSERT INTO dbo.PoiNarrations (PoiId, LanguageCode, ContentHash, Audio) VALUES (@id, @language, @hash, @audio);
        COMMIT TRANSACTION;`);
  },
};
