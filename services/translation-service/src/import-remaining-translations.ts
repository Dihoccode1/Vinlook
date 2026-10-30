import { createHash } from 'node:crypto';
import sql from 'mssql';
import { config } from './config/index.js';
import { ben_thanh_translations } from './content/ben-thanh-translations.js';
import { palace_translations } from './content/palace-translations.js';
import { editorial_provider } from './content/saigon-pois.js';
import { languages } from './modules/languages/languages.js';

async function main() {
  const poi_pool = new sql.ConnectionPool({ ...config.database, database: process.env.SQLSERVER_DATABASE ?? 'PoiDb', user: process.env.SQLSERVER_USER ?? 'sa', password: process.env.SQLSERVER_PASSWORD ?? '' });
  const translations = new sql.ConnectionPool(config.database);
  try {
    await poi_pool.connect(); await translations.connect();
    const pois = (await poi_pool.request().query<{ id: string; slug: string; name: string; description: string; source_language: string }>(
      'SELECT id AS id, slug AS slug, name AS name, description AS description, source_language AS source_language FROM dbo.pois WHERE is_published = 1',
    )).recordset;
    const hash_of = (poi: typeof pois[number]) => createHash('sha256').update(JSON.stringify([poi.source_language, poi.name, poi.description])).digest('hex');
    const sets = [ben_thanh_translations, palace_translations];
    // Validate every source before writing any translated text.
    for (const set of sets) {
      const poi = pois.find(item => item.slug === set.slug);
      if (!poi || hash_of(poi) !== set.source_hash) throw new Error(`Source changed; review translations before import: ${set.slug}`);
    }
    let inserted = 0;
    for (const set of sets) {
      const poi = pois.find(item => item.slug === set.slug)!;
      for (const [language, text] of Object.entries(set.translations)) {
        const result = await translations.request().input('id', sql.VarChar(36), poi.id).input('language', sql.VarChar(10), language)
          .input('hash', sql.Char(64), set.source_hash).input('source', sql.VarChar(10), poi.source_language)
          .input('name', sql.NVarChar(2000), text.name).input('description', sql.NVarChar(sql.MAX), text.description)
          .input('provider', sql.NVarChar(50), editorial_provider)
          .query(`SET XACT_ABORT ON; BEGIN TRANSACTION; DECLARE @written INT = 0;
            IF NOT EXISTS (SELECT 1 FROM dbo.poi_translations WITH (UPDLOCK, SERIALIZABLE)
              WHERE poi_id = @id AND language_code = @language AND source_hash = @hash)
            BEGIN
              UPDATE dbo.poi_translations SET source_language = @source, source_hash = @hash, name = @name,
                description = @description, provider = @provider, translated_at = SYSUTCDATETIME()
                WHERE poi_id = @id AND language_code = @language;
              IF @@ROWCOUNT = 0 INSERT INTO dbo.poi_translations (poi_id, language_code, source_language, source_hash, name, description, provider, translated_at)
                VALUES (@id, @language, @source, @hash, @name, @description, @provider, SYSUTCDATETIME());
              SET @written = 1;
            END;
            SELECT @written AS written; COMMIT TRANSACTION;`);
        inserted += Number(result.recordset[0].written);
      }
    }
    const rows = (await translations.request().query<{ poi_id: string; language: string; hash: string; name: string; description: string }>(
      'SELECT poi_id AS poi_id, language_code AS language, source_hash AS hash, name AS name, description AS description FROM dbo.poi_translations',
    )).recordset;
    const targets = languages.filter(item => item.code !== 'vi').map(item => item.code);
    const coverage = pois.map(poi => {
      const valid = rows.filter(row => row.poi_id.toLowerCase() === poi.id.toLowerCase() && row.hash === hash_of(poi) && row.name.trim() && row.description.trim()).map(row => row.language);
      return { name: poi.name, missing: targets.filter(language => !valid.includes(language)) };
    });
    const missing = coverage.filter(poi => poi.missing.length);
    console.log(JSON.stringify({ written: inserted, published_pois: pois.length, complete_pois: coverage.length - missing.length,
      valid_translations: coverage.reduce((sum, poi) => sum + targets.length - poi.missing.length, 0), missing }, null, 2));
    if (missing.length) process.exitCode = 1;
  } finally { await Promise.allSettled([poi_pool.close(), translations.close()]); }
}
main().catch(error => { console.error('Translation completion failed:', error instanceof Error ? error.message : 'Unknown error'); process.exitCode = 1; });
