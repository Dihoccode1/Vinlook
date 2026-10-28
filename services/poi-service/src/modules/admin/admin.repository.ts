import sql from 'mssql';
import { getPool } from '../../config/database.js';
import type { Poi } from '../pois/poi.repository.js';
import { decodeAdminImage, type AdminPoiInput, type AdminPoiQuery } from './admin.schema.js';

export interface AdminPoi extends Poi { isPublished: boolean; updatedAt: string }
export interface AdminStats { total: number; published: number; drafts: number; withImages: number; categories: { category: string; total: number }[] }
export interface AdminRepository {
  list(query: AdminPoiQuery): Promise<{ data: AdminPoi[]; pagination: { total: number; page: number; limit: number } }>;
  find(id: string): Promise<AdminPoi | undefined>;
  save(id: string, input: AdminPoiInput, create: boolean, userId?: string): Promise<boolean>;
  stats(): Promise<AdminStats>;
}
const columns = `Id AS id, Slug AS slug, Name AS name, Description AS description, VisitorDescription AS visitorDescription, Address AS address,
 Latitude AS latitude, Longitude AS longitude, Category AS category, SourceLanguage AS sourceLanguage, IsPublished AS isPublished,
 CASE WHEN EXISTS (SELECT 1 FROM dbo.PoiImages WHERE PoiId = dbo.Pois.Id) THEN '/api/pois/' + CONVERT(VARCHAR(36), Id) + '/image' ELSE ImageUrl END AS imageUrl,
 ImageCredit AS imageCredit, ImageSourceUrl AS imageSourceUrl, ImageLicenseUrl AS imageLicenseUrl, CONVERT(DATETIME2(3), UpdatedAt) AS updatedAt`;
type DatabasePoi = Omit<AdminPoi, 'updatedAt'> & { updatedAt: Date };
const toPoi = (row: DatabasePoi): AdminPoi => ({ ...row, updatedAt: row.updatedAt.toISOString() });
export const adminRepository: AdminRepository = {
  async list(query) {
    const pool = await getPool();
    const where = `(@q = N'' OR Name LIKE @q ESCAPE N'~' OR Address LIKE @q ESCAPE N'~') AND (@category IS NULL OR Category = @category)
      AND (@published IS NULL OR IsPublished = @published)`;
    const result = await pool.request().input('q', sql.NVarChar(404), query.q ? `%${query.q.replace(/[~%_\[]/g, '~$&')}%` : '')
      .input('category', sql.NVarChar(50), query.category ?? null).input('published', sql.Bit, query.status === 'all' ? null : query.status === 'published')
      .input('offset', sql.Int, (query.page - 1) * query.limit).input('limit', sql.Int, query.limit)
      .query(`SELECT ${columns} FROM dbo.Pois WHERE ${where} ORDER BY UpdatedAt DESC, Name, Id OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        SELECT COUNT(*) AS total FROM dbo.Pois WHERE ${where}`);
    const sets = result.recordsets as sql.IRecordSet<unknown>[];
    return { data: (sets[0] as unknown as DatabasePoi[]).map(toPoi), pagination: { total: (sets[1]?.[0] as { total: number }).total, page: query.page, limit: query.limit } };
  },
  async find(id) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.UniqueIdentifier, id).query<DatabasePoi>(`SELECT ${columns} FROM dbo.Pois WHERE Id = @id`);
    return result.recordset[0] ? toPoi(result.recordset[0]) : undefined;
  },
  async stats() {
    const pool = await getPool();
    const result = await pool.request().query(`SELECT COUNT(*) AS total, COALESCE(SUM(CAST(IsPublished AS INT)),0) AS published,
      COUNT(*) - COALESCE(SUM(CAST(IsPublished AS INT)),0) AS drafts,
      (SELECT COUNT(*) FROM dbo.PoiImages) AS withImages FROM dbo.Pois;
      SELECT Category AS category, COUNT(*) AS total FROM dbo.Pois GROUP BY Category ORDER BY Category`);
    const sets = result.recordsets as sql.IRecordSet<unknown>[];
    return { ...(sets[0]?.[0] as Omit<AdminStats, 'categories'>), categories: sets[1] as unknown as AdminStats['categories'] };
  },
  async save(id, input, create, userId) {
    const image = decodeAdminImage(input);
    const pool = await getPool();
    const tx = new sql.Transaction(pool); await tx.begin();
    try {
      const req = new sql.Request(tx).input('id', sql.UniqueIdentifier, id).input('name', sql.NVarChar(200), input.name).input('slug', sql.NVarChar(160), input.slug)
        .input('userId', sql.UniqueIdentifier, userId ?? null)
        .input('description', sql.NVarChar(sql.MAX), input.description).input('address', sql.NVarChar(500), input.address)
        .input('visitorDescription', sql.NVarChar(3000), input.visitorDescription ?? null)
        .input('lat', sql.Float, input.latitude).input('lon', sql.Float, input.longitude).input('category', sql.NVarChar(50), input.category)
        .input('source', sql.VarChar(10), input.sourceLanguage).input('published', sql.Bit, input.isPublished)
        .input('credit', sql.NVarChar(300), input.imageCredit || null).input('imageSource', sql.NVarChar(2048), input.imageSourceUrl || null)
        .input('license', sql.NVarChar(2048), input.imageLicenseUrl || null).input('version', sql.DateTime2(3), input.updatedAt ? new Date(input.updatedAt) : null);
      const result = await req.query(create ? `INSERT INTO dbo.Pois (Id, Name, Slug, Description, VisitorDescription, Address, Latitude, Longitude, Category, SourceLanguage, IsPublished, ImageCredit, ImageSourceUrl, ImageLicenseUrl, CreatedBy, UpdatedBy)
        VALUES (@id,@name,@slug,@description,COALESCE(@visitorDescription,N''),@address,@lat,@lon,@category,@source,@published,@credit,@imageSource,@license,@userId,@userId); SELECT 1 AS changed;`
        : `UPDATE dbo.Pois SET Name=@name, Slug=@slug, Description=@description, VisitorDescription=COALESCE(@visitorDescription,VisitorDescription), Address=@address, Latitude=@lat, Longitude=@lon,
          Category=@category, SourceLanguage=@source, IsPublished=@published, ImageCredit=@credit, ImageSourceUrl=@imageSource, ImageLicenseUrl=@license, UpdatedAt=SYSUTCDATETIME(), UpdatedBy=@userId
          WHERE Id=@id AND CONVERT(DATETIME2(3), UpdatedAt)=@version; SELECT @@ROWCOUNT AS changed;`);
      if (!result.recordset[0]?.changed) { await tx.rollback(); return false; }
      if (userId) await new sql.Request(tx).input('user', sql.UniqueIdentifier, userId).input('poi', sql.UniqueIdentifier, id)
        .input('action', sql.VarChar(50), create ? 'poi_created' : 'poi_updated')
        .query(`INSERT INTO dbo.SystemLogs(UserId,PoiId,Component,Level,Action,Message) VALUES(@user,@poi,N'poi-service','info',@action,N'Cập nhật nội dung địa điểm.');`);
      if (image) {
        await new sql.Request(tx).input('id', sql.UniqueIdentifier, id).input('content', sql.VarBinary(sql.MAX), image.content)
          .input('type', sql.VarChar(30), image.contentType).input('hash', sql.Char(64), image.hash)
          .query(`UPDATE dbo.PoiImages SET Content=@content, ContentType=@type, Sha256=@hash, UpdatedAt=SYSUTCDATETIME() WHERE PoiId=@id;
            IF @@ROWCOUNT=0 INSERT INTO dbo.PoiImages (PoiId,Content,ContentType,Sha256) VALUES (@id,@content,@type,@hash);
            UPDATE dbo.Pois SET ImageUrl='/api/pois/'+CONVERT(VARCHAR(36),@id)+'/image' WHERE Id=@id;`);
      }
      await tx.commit(); return true;
    } catch (error) { await tx.rollback(); throw error; }
  },
};
