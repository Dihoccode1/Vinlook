import sql from 'mssql';
import { get_pool } from '../../config/database.js';
import type { Translation, TranslationRepository } from './types.js';

export const translation_repository: TranslationRepository = {
  async find(poi_id, language, source_hash) {
    const pool = await get_pool();
    const result = await pool.request().input('id', sql.VarChar(36), poi_id).input('language', sql.VarChar(10), language).input('hash', sql.Char(64), source_hash)
      .query(`SELECT poi_id AS poi_id, language_code AS language, source_language AS source_language, source_hash AS source_hash,
        name AS name, description AS description, provider AS provider, translated_at AS translated_at
        FROM dbo.poi_translations WHERE poi_id = @id AND language_code = @language AND source_hash = @hash`);
    const row = result.recordset[0] as (Omit<Translation, 'translated_at'> & { translated_at: Date }) | undefined;
    return row ? { ...row, translated_at: row.translated_at.toISOString() } : undefined;
  },
  async save(value) {
    const pool = await get_pool();
    await pool.request().input('id', sql.VarChar(36), value.poi_id).input('language', sql.VarChar(10), value.language)
      .input('source', sql.VarChar(10), value.source_language).input('hash', sql.Char(64), value.source_hash)
      .input('name', sql.NVarChar(2000), value.name).input('description', sql.NVarChar(sql.MAX), value.description)
      .input('provider', sql.NVarChar(50), value.provider).input('time', sql.DateTime2, new Date(value.translated_at))
      .query(`SET XACT_ABORT ON; BEGIN TRANSACTION;
        UPDATE dbo.poi_translations WITH (UPDLOCK, SERIALIZABLE)
          SET source_language = @source, source_hash = @hash, name = @name, description = @description, provider = @provider, translated_at = @time
          WHERE poi_id = @id AND language_code = @language;
        IF @@ROWCOUNT = 0 INSERT INTO dbo.poi_translations (poi_id, language_code, source_language, source_hash, name, description, provider, translated_at)
          VALUES (@id, @language, @source, @hash, @name, @description, @provider, @time);
        COMMIT TRANSACTION;`);
  },
  async ready() { const pool = await get_pool(); await pool.request().query('SELECT TOP(0) poi_id FROM dbo.poi_translations; SELECT TOP(0) poi_id FROM dbo.poi_narrations;'); },
};
