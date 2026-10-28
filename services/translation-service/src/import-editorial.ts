import { createHash } from 'node:crypto';
import sql from 'mssql';
import { config } from './config/index.js';
import { saigonPois, editorialProvider } from './content/saigon-pois.js';
import { renderEditorial } from './content/editorial-locales.js';
import { languages } from './modules/languages/languages.js';

async function main() {
  const poiPool = await new sql.ConnectionPool({ ...config.database,
    database: process.env.SQLSERVER_DATABASE ?? 'PoiDb', user: process.env.SQLSERVER_USER ?? 'sa', password: process.env.SQLSERVER_PASSWORD ?? '',
  }).connect();
  const translationPool = await new sql.ConnectionPool(config.database).connect();
  let inserted = 0; let translated = 0; let preserved = 0;
  try {
    for (const [index, poi] of saigonPois.entries()) {
      const description = renderEditorial(poi, 'vi');
      const id = `20000000-0000-4000-8000-${String(index + 4).padStart(12, '0')}`;
      const result = await poiPool.request().input('id', sql.UniqueIdentifier, id).input('slug', sql.NVarChar(160), poi.slug)
        .input('name', sql.NVarChar(200), poi.name).input('description', sql.NVarChar(sql.MAX), description)
        .input('address', sql.NVarChar(500), poi.address).input('lat', sql.Float, poi.latitude).input('lon', sql.Float, poi.longitude)
        .input('category', sql.NVarChar(50), poi.category)
        .query(`SET XACT_ABORT ON; BEGIN TRANSACTION; DECLARE @inserted INT = 0;
          IF NOT EXISTS (SELECT 1 FROM dbo.Pois WITH (UPDLOCK, SERIALIZABLE) WHERE Slug = @slug OR Id = @id)
          BEGIN
            INSERT INTO dbo.Pois (Id, Slug, Name, Description, Address, Latitude, Longitude, Category, SourceLanguage, IsPublished)
            VALUES (@id, @slug, @name, @description, @address, @lat, @lon, @category, 'vi', 1);
            SET @inserted = 1;
          END;
          SELECT @inserted AS inserted;
          SELECT Id AS id, Name AS name, Description AS description, SourceLanguage AS sourceLanguage FROM dbo.Pois WHERE Slug = @slug;
          COMMIT TRANSACTION;`);
      const sets = result.recordsets as sql.IRecordSet<unknown>[];
      inserted += Number((sets[0]?.[0] as { inserted?: number })?.inserted ?? 0);
      const current = sets[1]?.[0] as { id: string; name: string; description: string; sourceLanguage: string } | undefined;
      if (!current || current.name !== poi.name || current.description !== description || current.sourceLanguage !== 'vi') {
        preserved++; console.log(`Preserved edited/conflicting POI: ${poi.slug}`); continue;
      }
      const hash = createHash('sha256').update(JSON.stringify(['vi', current.name, description])).digest('hex');
      for (const { code } of languages) {
        if (code === 'vi') continue;
        const translation = renderEditorial(poi, code);
        const saved = await translationPool.request().input('id', sql.UniqueIdentifier, current.id).input('language', sql.VarChar(10), code)
          .input('hash', sql.Char(64), hash).input('name', sql.NVarChar(2000), poi.name)
          .input('description', sql.NVarChar(sql.MAX), translation).input('provider', sql.NVarChar(50), editorialProvider)
          .query(`SET XACT_ABORT ON; BEGIN TRANSACTION; DECLARE @inserted INT = 0;
            IF NOT EXISTS (SELECT 1 FROM dbo.PoiTranslations WITH (UPDLOCK, SERIALIZABLE) WHERE PoiId = @id AND LanguageCode = @language)
            BEGIN
              INSERT INTO dbo.PoiTranslations (PoiId, LanguageCode, SourceLanguage, SourceHash, Name, Description, Provider, TranslatedAt)
              VALUES (@id, @language, 'vi', @hash, @name, @description, @provider, SYSUTCDATETIME());
              SET @inserted = 1;
            END;
            SELECT @inserted AS inserted;
            COMMIT TRANSACTION;`);
        translated += Number(saved.recordset[0]?.inserted ?? 0);
      }
    }
    const totals = await poiPool.request().query('SELECT COUNT(*) AS total FROM dbo.Pois WHERE IsPublished = 1');
    console.log(JSON.stringify({ insertedPois: inserted, insertedTranslations: translated, preservedEditedPois: preserved, publishedPois: totals.recordset[0].total }));
  } finally { await poiPool.close(); await translationPool.close(); }
}
main().catch(error => { console.error('Editorial import failed:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
