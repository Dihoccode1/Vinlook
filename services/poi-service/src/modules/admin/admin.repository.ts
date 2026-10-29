import sql from 'mssql';
import { get_pool } from '../../config/database.js';
import type { Poi } from '../pois/poi.repository.js';
import { decode_admin_image, type AdminPoiInput, type AdminPoiQuery } from './admin.schema.js';

export interface AdminPoi extends Poi { is_published: boolean; updated_at: string }
export interface AdminStats { total: number; published: number; drafts: number; with_images: number; categories: { category: string; total: number }[] }
export interface AdminRepository {
  list(query: AdminPoiQuery): Promise<{ data: AdminPoi[]; pagination: { total: number; page: number; limit: number } }>;
  find(id: string): Promise<AdminPoi | undefined>;
  save(id: string, input: AdminPoiInput, create: boolean, user_id?: string): Promise<boolean>;
  stats(): Promise<AdminStats>;
}
const columns = `id AS id, slug AS slug, name AS name, description AS description, visitor_description AS visitor_description, address AS address,
 latitude AS latitude, longitude AS longitude, category AS category, source_language AS source_language, is_published AS is_published,
 CASE WHEN EXISTS (SELECT 1 FROM dbo.poi_images WHERE poi_id = dbo.pois.id) THEN '/api/pois/' + CONVERT(VARCHAR(36), id) + '/image' ELSE image_url END AS image_url,
 image_credit AS image_credit, image_source_url AS image_source_url, image_license_url AS image_license_url, CONVERT(DATETIME2(3), updated_at) AS updated_at`;
type DatabasePoi = Omit<AdminPoi, 'updated_at'> & { updated_at: Date };
const to_poi = (row: DatabasePoi): AdminPoi => ({ ...row, updated_at: row.updated_at.toISOString() });
export const admin_repository: AdminRepository = {
  async list(query) {
    const pool = await get_pool();
    const where = `(@q = N'' OR name LIKE @q ESCAPE N'~' OR address LIKE @q ESCAPE N'~') AND (@category IS NULL OR category = @category)
      AND (@published IS NULL OR is_published = @published)`;
    const result = await pool.request().input('q', sql.NVarChar(404), query.q ? `%${query.q.replace(/[~%_\[]/g, '~$&')}%` : '')
      .input('category', sql.NVarChar(50), query.category ?? null).input('published', sql.Bit, query.status === 'all' ? null : query.status === 'published')
      .input('offset', sql.Int, (query.page - 1) * query.limit).input('limit', sql.Int, query.limit)
      .query(`SELECT ${columns} FROM dbo.pois WHERE ${where} ORDER BY updated_at DESC, name, id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        SELECT COUNT(*) AS total FROM dbo.pois WHERE ${where}`);
    const sets = result.recordsets as sql.IRecordSet<unknown>[];
    return { data: (sets[0] as unknown as DatabasePoi[]).map(to_poi), pagination: { total: (sets[1]?.[0] as { total: number }).total, page: query.page, limit: query.limit } };
  },
  async find(id) {
    const pool = await get_pool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query<DatabasePoi>(`SELECT ${columns} FROM dbo.pois WHERE id = @id`);
    return result.recordset[0] ? to_poi(result.recordset[0]) : undefined;
  },
  async stats() {
    const pool = await get_pool();
    const result = await pool.request().query(`SELECT COUNT(*) AS total, COALESCE(SUM(CAST(is_published AS INT)),0) AS published,
      COUNT(*) - COALESCE(SUM(CAST(is_published AS INT)),0) AS drafts,
      (SELECT COUNT(*) FROM dbo.poi_images) AS with_images FROM dbo.pois;
      SELECT category AS category, COUNT(*) AS total FROM dbo.pois GROUP BY category ORDER BY category`);
    const sets = result.recordsets as sql.IRecordSet<unknown>[];
    return { ...(sets[0]?.[0] as Omit<AdminStats, 'categories'>), categories: sets[1] as unknown as AdminStats['categories'] };
  },
  async save(id, input, create, user_id) {
    const image = decode_admin_image(input);
    const pool = await get_pool();
    const tx = new sql.Transaction(pool); await tx.begin();
    try {
      const req = new sql.Request(tx).input('id', sql.UniqueIdentifier, id).input('name', sql.NVarChar(200), input.name).input('slug', sql.NVarChar(160), input.slug)
        .input('user_id', sql.UniqueIdentifier, user_id ?? null)
        .input('description', sql.NVarChar(sql.MAX), input.description).input('address', sql.NVarChar(500), input.address)
        .input('visitor_description', sql.NVarChar(3000), input.visitor_description ?? null)
        .input('lat', sql.Float, input.latitude).input('lon', sql.Float, input.longitude).input('category', sql.NVarChar(50), input.category)
        .input('source', sql.VarChar(10), input.source_language).input('published', sql.Bit, input.is_published)
        .input('credit', sql.NVarChar(300), input.image_credit || null).input('imageSource', sql.NVarChar(2048), input.image_source_url || null)
        .input('license', sql.NVarChar(2048), input.image_license_url || null).input('version', sql.DateTime2(3), input.updated_at ? new Date(input.updated_at) : null);
      const result = await req.query(create ? `INSERT INTO dbo.pois (id, name, slug, description, visitor_description, address, latitude, longitude, category, source_language, is_published, image_credit, image_source_url, image_license_url, created_by, updated_by)
        VALUES (@id,@name,@slug,@description,COALESCE(@visitor_description,N''),@address,@lat,@lon,@category,@source,@published,@credit,@imageSource,@license,@user_id,@user_id); SELECT 1 AS changed;`
        : `UPDATE dbo.pois SET name=@name, slug=@slug, description=@description, visitor_description=COALESCE(@visitor_description,visitor_description), address=@address, latitude=@lat, longitude=@lon,
          category=@category, source_language=@source, is_published=@published, image_credit=@credit, image_source_url=@imageSource, image_license_url=@license, updated_at=SYSUTCDATETIME(), updated_by=@user_id
          WHERE id=@id AND CONVERT(DATETIME2(3), updated_at)=@version; SELECT @@ROWCOUNT AS changed;`);
      if (!result.recordset[0]?.changed) { await tx.rollback(); return false; }
      if (user_id) await new sql.Request(tx).input('user', sql.UniqueIdentifier, user_id).input('poi', sql.UniqueIdentifier, id)
        .input('action', sql.VarChar(50), create ? 'poi_created' : 'poi_updated')
        .query(`INSERT INTO dbo.system_logs(user_id,poi_id,component,level,action,message) VALUES(@user,@poi,N'poi-service','info',@action,N'Cập nhật nội dung địa điểm.');`);
      if (image) {
        await new sql.Request(tx).input('id', sql.UniqueIdentifier, id).input('content', sql.VarBinary(sql.MAX), image.content)
          .input('type', sql.VarChar(30), image.content_type).input('hash', sql.Char(64), image.hash)
          .query(`UPDATE dbo.poi_images SET content=@content, content_type=@type, sha256=@hash, updated_at=SYSUTCDATETIME() WHERE poi_id=@id;
            IF @@ROWCOUNT=0 INSERT INTO dbo.poi_images (poi_id,content,content_type,sha256) VALUES (@id,@content,@type,@hash);
            UPDATE dbo.pois SET image_url='/api/pois/'+CONVERT(VARCHAR(36),@id)+'/image' WHERE id=@id;`);
      }
      await tx.commit(); return true;
    } catch (error) { await tx.rollback(); throw error; }
  },
};
