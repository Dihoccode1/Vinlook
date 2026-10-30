import sql from 'mssql';
import { get_pool } from '../../config/database.js';

export interface Poi {
  id: string;
  slug: string;
  name: string;
  description: string;
  visitor_description?: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  source_language: string;
  image_url: string | null;
  image_credit: string | null;
  image_source_url: string | null;
  image_license_url: string | null;
}

export interface PoiQuery { q: string; category?: string; page: number; limit: number }
export interface PoiPage { data: Poi[]; pagination: { page: number; limit: number; total: number } }
export interface PoiImageRecord { content: Buffer; content_type: string; sha256: string }
export interface PoiRepository {
  list(query: PoiQuery): Promise<PoiPage>;
  find(id: string): Promise<Poi | undefined>;
  find_image(id: string): Promise<PoiImageRecord | undefined>;
  ready(): Promise<void>;
}

const columns = `id AS id, slug AS slug, name AS name, description AS description, visitor_description AS visitor_description, address AS address,
  latitude AS latitude, longitude AS longitude, category AS category, source_language AS source_language,
  CASE WHEN EXISTS (SELECT 1 FROM dbo.poi_images WHERE poi_id = dbo.pois.id)
    THEN '/api/pois/' + CONVERT(VARCHAR(36), id) + '/image' ELSE image_url END AS image_url,
  image_credit AS image_credit, image_source_url AS image_source_url, image_license_url AS image_license_url`;
const filter = `is_published = 1 AND (@search = N'' OR name LIKE @search ESCAPE N'~' OR address LIKE @search ESCAPE N'~') AND (@category IS NULL OR category = @category)`;

export const poi_repository: PoiRepository = {
  async list(query) {
    const pool = await get_pool();
    const escaped = query.q.replace(/[~%_\[]/g, '~$&');
    const result = await pool.request()
      .input('search', sql.NVarChar(404), query.q ? `%${escaped}%` : '')
      .input('category', sql.NVarChar(50), query.category ?? null)
      .input('offset', sql.Int, (query.page - 1) * query.limit)
      .input('limit', sql.Int, query.limit)
      .query(`SELECT ${columns} FROM dbo.pois WHERE ${filter} ORDER BY name, id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        SELECT COUNT(*) AS total FROM dbo.pois WHERE ${filter};`);
    const sets = result.recordsets as sql.IRecordSet<unknown>[];
    return {
      data: sets[0] as unknown as Poi[],
      pagination: { page: query.page, limit: query.limit, total: (sets[1][0] as { total: number }).total },
    };
  },
  async find(id) {
    const pool = await get_pool();
    const result = await pool.request().input('id', sql.VarChar(36), id)
      .query<Poi>(`SELECT ${columns} FROM dbo.pois WHERE id = @id AND is_published = 1`);
    return result.recordset[0];
  },
  async ready() {
    const pool = await get_pool();
    await pool.request().query('SELECT TOP (0) p.id FROM dbo.pois p LEFT JOIN dbo.poi_images i ON i.poi_id = p.id');
  },
  async find_image(id) {
    const pool = await get_pool();
    const result = await pool.request().input('id', sql.VarChar(36), id)
      .query<PoiImageRecord>(`SELECT i.content AS content, i.content_type AS content_type, i.sha256 AS sha256
        FROM dbo.poi_images i INNER JOIN dbo.pois p ON p.id = i.poi_id
        WHERE p.id = @id AND p.is_published = 1`);
    return result.recordset[0];
  },
};
