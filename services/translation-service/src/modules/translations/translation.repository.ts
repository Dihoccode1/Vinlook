import sql from 'mssql';
import { getPool } from '../../config/database.js';
import type { Translation, TranslationRepository } from './types.js';

export const translationRepository: TranslationRepository = {
  async find(poiId, language, sourceHash) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, poiId).input('language', sql.VarChar(10), language).input('hash', sql.Char(64), sourceHash)
      .query(`SELECT PoiId AS poiId, LanguageCode AS language, SourceLanguage AS sourceLanguage, SourceHash AS sourceHash,
        Name AS name, Description AS description, Provider AS provider, TranslatedAt AS translatedAt
        FROM dbo.PoiTranslations WHERE PoiId = @id AND LanguageCode = @language AND SourceHash = @hash`);
    const row = result.recordset[0] as (Omit<Translation, 'translatedAt'> & { translatedAt: Date }) | undefined;
    return row ? { ...row, translatedAt: row.translatedAt.toISOString() } : undefined;
  },
  async save(value) {
    const pool = await getPool();
    await pool.request().input('id', sql.UniqueIdentifier, value.poiId).input('language', sql.VarChar(10), value.language)
      .input('source', sql.VarChar(10), value.sourceLanguage).input('hash', sql.Char(64), value.sourceHash)
      .input('name', sql.NVarChar(2000), value.name).input('description', sql.NVarChar(sql.MAX), value.description)
      .input('provider', sql.NVarChar(50), value.provider).input('time', sql.DateTime2, new Date(value.translatedAt))
      .query(`SET XACT_ABORT ON; BEGIN TRANSACTION;
        UPDATE dbo.PoiTranslations WITH (UPDLOCK, SERIALIZABLE)
          SET SourceLanguage = @source, SourceHash = @hash, Name = @name, Description = @description, Provider = @provider, TranslatedAt = @time
          WHERE PoiId = @id AND LanguageCode = @language;
        IF @@ROWCOUNT = 0 INSERT INTO dbo.PoiTranslations (PoiId, LanguageCode, SourceLanguage, SourceHash, Name, Description, Provider, TranslatedAt)
          VALUES (@id, @language, @source, @hash, @name, @description, @provider, @time);
        COMMIT TRANSACTION;`);
  },
  async ready() { const pool = await getPool(); await pool.request().query('SELECT TOP(0) PoiId FROM dbo.PoiTranslations; SELECT TOP(0) PoiId FROM dbo.PoiNarrations;'); },
};
