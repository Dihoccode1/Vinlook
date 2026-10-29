import { createHash } from 'node:crypto';
import sql from 'mssql';
import { config } from './config/index.js';
import { saigon_pois, editorial_provider } from './content/saigon-pois.js';
import { render_editorial } from './content/editorial-locales.js';
import { languages } from './modules/languages/languages.js';

async function main() {
  const poi_pool = await new sql.ConnectionPool({ ...config.database,
    database: process.env.SQLSERVER_DATABASE ?? 'PoiDb', user: process.env.SQLSERVER_USER ?? 'sa', password: process.env.SQLSERVER_PASSWORD ?? '',
  }).connect();
  const translation_pool = await new sql.ConnectionPool(config.database).connect();
  let inserted = 0; let translated = 0; let preserved = 0;
  try {
    for (const [index, poi] of saigon_pois.entries()) {
      const description = render_editorial(poi, 'vi');
      const id = `20000000-0000-4000-8000-${String(index + 4).padStart(12, '0')}`;
      const result = await poi_pool.request().input('id', sql.UniqueIdentifier, id).input('slug', sql.NVarChar(160), poi.slug)
        .input('name', sql.NVarChar(200), poi.name).input('description', sql.NVarChar(sql.MAX), description)
        .input('address', sql.NVarChar(500), poi.address).input('lat', sql.Float, poi.latitude).input('lon', sql.Float, poi.longitude)
        .input('category', sql.NVarChar(50), poi.category)
        .query(`SET XACT_ABORT ON; BEGIN TRANSACTION; DECLARE @inserted INT = 0;
          IF NOT EXISTS (SELECT 1 FROM dbo.pois WITH (UPDLOCK, SERIALIZABLE) WHERE slug = @slug OR id = @id)
          BEGIN
            INSERT INTO dbo.pois (id, slug, name, description, address, latitude, longitude, category, source_language, is_published)
            VALUES (@id, @slug, @name, @description, @address, @lat, @lon, @category, 'vi', 1);
            SET @inserted = 1;
          END;
          SELECT @inserted AS inserted;
          SELECT id AS id, name AS name, description AS description, source_language AS source_language FROM dbo.pois WHERE slug = @slug;
          COMMIT TRANSACTION;`);
      const sets = result.recordsets as sql.IRecordSet<unknown>[];
      inserted += Number((sets[0]?.[0] as { inserted?: number })?.inserted ?? 0);
      const current = sets[1]?.[0] as { id: string; name: string; description: string; source_language: string } | undefined;
      if (!current || current.name !== poi.name || current.description !== description || current.source_language !== 'vi') {
        preserved++; console.log(`Preserved edited/conflicting POI: ${poi.slug}`); continue;
      }
      const hash = createHash('sha256').update(JSON.stringify(['vi', current.name, description])).digest('hex');
      for (const { code } of languages) {
        if (code === 'vi') continue;
        const translation = render_editorial(poi, code);
        const saved = await translation_pool.request().input('id', sql.UniqueIdentifier, current.id).input('language', sql.VarChar(10), code)
          .input('hash', sql.Char(64), hash).input('name', sql.NVarChar(2000), poi.name)
          .input('description', sql.NVarChar(sql.MAX), translation).input('provider', sql.NVarChar(50), editorial_provider)
          .query(`SET XACT_ABORT ON; BEGIN TRANSACTION; DECLARE @inserted INT = 0;
            IF NOT EXISTS (SELECT 1 FROM dbo.poi_translations WITH (UPDLOCK, SERIALIZABLE) WHERE poi_id = @id AND language_code = @language)
            BEGIN
              INSERT INTO dbo.poi_translations (poi_id, language_code, source_language, source_hash, name, description, provider, translated_at)
              VALUES (@id, @language, 'vi', @hash, @name, @description, @provider, SYSUTCDATETIME());
              SET @inserted = 1;
            END;
            SELECT @inserted AS inserted;
            COMMIT TRANSACTION;`);
        translated += Number(saved.recordset[0]?.inserted ?? 0);
      }
    }
    const totals = await poi_pool.request().query('SELECT COUNT(*) AS total FROM dbo.pois WHERE is_published = 1');
    console.log(JSON.stringify({ inserted_pois: inserted, inserted_translations: translated, preserved_edited_pois: preserved, published_pois: totals.recordset[0].total }));
  } finally { await poi_pool.close(); await translation_pool.close(); }
}
main().catch(error => { console.error('Editorial import failed:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
