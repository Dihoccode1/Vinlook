import { createHash } from 'node:crypto';
import sql from 'mssql';
import { config } from './config/index.js';
import { benThanhTranslations } from './content/ben-thanh-translations.js';
import { palaceTranslations } from './content/palace-translations.js';
import { editorialProvider } from './content/saigon-pois.js';
import { languages } from './modules/languages/languages.js';

async function main() {
  const poiPool = new sql.ConnectionPool({ ...config.database, database: process.env.SQLSERVER_DATABASE ?? 'PoiDb', user: process.env.SQLSERVER_USER ?? 'sa', password: process.env.SQLSERVER_PASSWORD ?? '' });
  const translations = new sql.ConnectionPool(config.database);
  try {
    await poiPool.connect(); await translations.connect();
    const pois = (await poiPool.request().query<{ id: string; slug: string; name: string; description: string; sourceLanguage: string }>(
      'SELECT Id AS id, Slug AS slug, Name AS name, Description AS description, SourceLanguage AS sourceLanguage FROM dbo.Pois WHERE IsPublished = 1',
    )).recordset;
    const hashOf = (poi: typeof pois[number]) => createHash('sha256').update(JSON.stringify([poi.sourceLanguage, poi.name, poi.description])).digest('hex');
    const sets = [benThanhTranslations, palaceTranslations];
    // Validate every source before writing any translated text.
    for (const set of sets) {
      const poi = pois.find(item => item.slug === set.slug);
      if (!poi || hashOf(poi) !== set.sourceHash) throw new Error(`Source changed; review translations before import: ${set.slug}`);
    }
    let inserted = 0;
    for (const set of sets) {
      const poi = pois.find(item => item.slug === set.slug)!;
      for (const [language, text] of Object.entries(set.translations)) {
        const result = await translations.request().input('id', sql.UniqueIdentifier, poi.id).input('language', sql.VarChar(10), language)
          .input('hash', sql.Char(64), set.sourceHash).input('source', sql.VarChar(10), poi.sourceLanguage)
          .input('name', sql.NVarChar(2000), text.name).input('description', sql.NVarChar(sql.MAX), text.description)
          .input('provider', sql.NVarChar(50), editorialProvider)
          .query(`SET XACT_ABORT ON; BEGIN TRANSACTION; DECLARE @written INT = 0;
            IF NOT EXISTS (SELECT 1 FROM dbo.PoiTranslations WITH (UPDLOCK, SERIALIZABLE)
              WHERE PoiId = @id AND LanguageCode = @language AND SourceHash = @hash)
            BEGIN
              UPDATE dbo.PoiTranslations SET SourceLanguage = @source, SourceHash = @hash, Name = @name,
                Description = @description, Provider = @provider, TranslatedAt = SYSUTCDATETIME()
                WHERE PoiId = @id AND LanguageCode = @language;
              IF @@ROWCOUNT = 0 INSERT INTO dbo.PoiTranslations (PoiId, LanguageCode, SourceLanguage, SourceHash, Name, Description, Provider, TranslatedAt)
                VALUES (@id, @language, @source, @hash, @name, @description, @provider, SYSUTCDATETIME());
              SET @written = 1;
            END;
            SELECT @written AS written; COMMIT TRANSACTION;`);
        inserted += Number(result.recordset[0].written);
      }
    }
    const rows = (await translations.request().query<{ poiId: string; language: string; hash: string; name: string; description: string }>(
      'SELECT PoiId AS poiId, LanguageCode AS language, SourceHash AS hash, Name AS name, Description AS description FROM dbo.PoiTranslations',
    )).recordset;
    const targets = languages.filter(item => item.code !== 'vi').map(item => item.code);
    const coverage = pois.map(poi => {
      const valid = rows.filter(row => row.poiId.toLowerCase() === poi.id.toLowerCase() && row.hash === hashOf(poi) && row.name.trim() && row.description.trim()).map(row => row.language);
      return { name: poi.name, missing: targets.filter(language => !valid.includes(language)) };
    });
    const missing = coverage.filter(poi => poi.missing.length);
    console.log(JSON.stringify({ written: inserted, publishedPois: pois.length, completePois: coverage.length - missing.length,
      validTranslations: coverage.reduce((sum, poi) => sum + targets.length - poi.missing.length, 0), missing }, null, 2));
    if (missing.length) process.exitCode = 1;
  } finally { await Promise.allSettled([poiPool.close(), translations.close()]); }
}
main().catch(error => { console.error('Translation completion failed:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
