import sql from 'mssql';
import { getPool } from '../../config/database.js';

export interface Poi {
  id: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string;
  sourceLanguage: string;
}

export interface PoiQuery { q: string; category?: string; page: number; limit: number }
export interface PoiPage { data: Poi[]; pagination: { page: number; limit: number; total: number } }
export interface PoiRepository {
  list(query: PoiQuery): Promise<PoiPage>;
  find(id: string): Promise<Poi | undefined>;
  ready(): Promise<void>;
}

const columns = 'Id AS id, Slug AS slug, Name AS name, Description AS description, Address AS address, Latitude AS latitude, Longitude AS longitude, Category AS category, SourceLanguage AS sourceLanguage';
const filter = `IsPublished = 1 AND (@search = N'' OR Name LIKE @search ESCAPE N'~' OR Address LIKE @search ESCAPE N'~') AND (@category IS NULL OR Category = @category)`;

export const poiRepository: PoiRepository = {
  async list(query) {
    const pool = await getPool();
    const escaped = query.q.replace(/[~%_\[]/g, '~$&');
    const result = await pool.request()
      .input('search', sql.NVarChar(404), query.q ? `%${escaped}%` : '')
      .input('category', sql.NVarChar(50), query.category ?? null)
      .input('offset', sql.Int, (query.page - 1) * query.limit)
      .input('limit', sql.Int, query.limit)
      .query(`SELECT ${columns} FROM dbo.Pois WHERE ${filter} ORDER BY Name, Id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        SELECT COUNT(*) AS total FROM dbo.Pois WHERE ${filter};`);
    const sets = result.recordsets as sql.IRecordSet<unknown>[];
    return {
      data: sets[0] as unknown as Poi[],
      pagination: { page: query.page, limit: query.limit, total: (sets[1][0] as { total: number }).total },
    };
  },
  async find(id) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id)
      .query<Poi>(`SELECT ${columns} FROM dbo.Pois WHERE Id = @id AND IsPublished = 1`);
    return result.recordset[0];
  },
  async ready() {
    const pool = await getPool();
    await pool.request().query('SELECT TOP (0) Id FROM dbo.Pois');
  },
};
