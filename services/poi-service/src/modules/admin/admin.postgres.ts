import { query, transaction } from '@vinlook/server/postgres';
import type { AdminRepository, AdminPoi } from './admin.repository.js';
import { poi_columns, search_pattern } from '../pois/poi.postgres.js';
import { decode_admin_image } from './admin.schema.js';

const columns = `${poi_columns},p.is_published,p.updated_at`;
const to_poi = (row: any): AdminPoi => ({ ...row, updated_at: row.updated_at.toISOString() });
export const postgres_admin_repository: AdminRepository = {
  async next_id() {
    return (await query("SELECT next_code('POI','pois_id_seq') AS id")).rows[0].id;
  },
  async list(input) {
    const args = [
      search_pattern(input.q),
      input.category ?? null,
      input.status === 'all' ? null : input.status === 'published',
    ];
    const filter = `($1='' OR p.name ILIKE $1 ESCAPE '~' OR p.address ILIKE $1 ESCAPE '~') AND ($2::text IS NULL OR p.category=$2) AND ($3::boolean IS NULL OR p.is_published=$3)`;
    const result = await query(
      `SELECT ${columns} FROM pois p WHERE ${filter} ORDER BY p.updated_at DESC,p.name,p.id LIMIT $4 OFFSET $5`,
      [...args, input.limit, (input.page - 1) * input.limit],
    );
    const count = await query(`SELECT count(*)::int AS total FROM pois p WHERE ${filter}`, args);
    return {
      data: result.rows.map(to_poi),
      pagination: { total: count.rows[0].total, page: input.page, limit: input.limit },
    };
  },
  async find(id) {
    const row = (await query(`SELECT ${columns} FROM pois p WHERE p.id=$1`, [id])).rows[0];
    return row ? to_poi(row) : undefined;
  },
  async stats() {
    const stats = (
      await query(
        `SELECT count(*)::int AS total,count(*) FILTER(WHERE is_published)::int AS published,count(*) FILTER(WHERE NOT is_published)::int AS drafts,(SELECT count(*)::int FROM poi_images) AS with_images FROM pois`,
      )
    ).rows[0];
    const categories = (
      await query(
        'SELECT category,count(*)::int AS total FROM pois GROUP BY category ORDER BY category',
      )
    ).rows;
    return { ...stats, categories } as any;
  },
  async save(id, input, create, user_id) {
    const image = decode_admin_image(input);
    return transaction(async (tx) => {
      const args = [
        id,
        input.name,
        input.slug,
        input.description,
        input.visitor_description ?? null,
        input.address,
        input.latitude,
        input.longitude,
        input.category,
        input.source_language,
        input.is_published,
        input.image_credit || null,
        input.image_source_url || null,
        input.image_license_url || null,
        user_id ?? null,
      ];
      const result = create
        ? await tx.query(
            `INSERT INTO pois(id,name,slug,description,visitor_description,address,latitude,longitude,category,source_language,is_published,image_credit,image_source_url,image_license_url,created_by,updated_by) VALUES($1,$2,$3,$4,COALESCE($5,''),$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)`,
            args,
          )
        : await tx.query(
            `UPDATE pois SET name=$2,slug=$3,description=$4,visitor_description=COALESCE($5,visitor_description),address=$6,latitude=$7,longitude=$8,category=$9,source_language=$10,is_published=$11,image_credit=$12,image_source_url=$13,image_license_url=$14,updated_by=$15,updated_at=date_trunc('milliseconds',clock_timestamp()) WHERE id=$1 AND updated_at=$16`,
            [...args, new Date(input.updated_at!)],
          );
      if (!result.rowCount) return false;
      if (user_id)
        await tx.query(
          `INSERT INTO system_logs(user_id,poi_id,component,level,action,message) VALUES($1,$2,'poi-service','info',$3,'Cập nhật nội dung địa điểm.')`,
          [user_id, id, create ? 'poi_created' : 'poi_updated'],
        );
      if (image) {
        await tx.query(
          `INSERT INTO poi_images(poi_id,content,content_type,sha256) VALUES($1,$2,$3,$4) ON CONFLICT(poi_id) DO UPDATE SET content=EXCLUDED.content,content_type=EXCLUDED.content_type,sha256=EXCLUDED.sha256,updated_at=now()`,
          [id, image.content, image.content_type, image.hash],
        );
        await tx.query("UPDATE pois SET image_url='/api/pois/'||id||'/image' WHERE id=$1", [id]);
      }
      return true;
    });
  },
};
