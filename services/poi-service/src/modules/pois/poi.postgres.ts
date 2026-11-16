import { query } from '@vinlook/server/postgres';
import type { PoiRepository } from './poi.repository.js';

export const poi_columns = `p.id,p.name,p.description,p.visitor_description,p.address,
 p.latitude,p.longitude,p.category,p.source_language,f.image_credit,f.image_source_url,f.image_license_url,
 CASE WHEN f.content IS NOT NULL
 THEN '/api/pois/'||p.id||'/image' ELSE f.image_url END AS image_url`;
export const poi_with_photo =
  'vinlook_runtime.pois p LEFT JOIN vinlook_runtime.poi_photos f ON f.poi_id=p.id';
export const search_pattern = (text: string) => (text ? `%${text.replace(/[~%_]/g, '~$&')}%` : '');
export const postgres_poi_repository: PoiRepository = {
  async list(input) {
    const values = [search_pattern(input.q), input.category ?? null];
    const filter = `p.is_published AND ($1='' OR p.name ILIKE $1 ESCAPE '~' OR p.address ILIKE $1 ESCAPE '~') AND ($2::text IS NULL OR p.category=$2)`;
    const { rows } = await query(
      `SELECT ${poi_columns} FROM ${poi_with_photo} WHERE ${filter} ORDER BY p.name,p.id LIMIT $3 OFFSET $4`,
      [...values, input.limit, (input.page - 1) * input.limit],
    );
    const count = await query(
      `SELECT count(*)::int AS total FROM vinlook_runtime.pois p WHERE ${filter}`,
      values,
    );
    return {
      data: rows as any,
      pagination: { page: input.page, limit: input.limit, total: count.rows[0].total },
    };
  },
  async find(id) {
    return (
      await query(`SELECT ${poi_columns} FROM ${poi_with_photo} WHERE p.id=$1 AND p.is_published`, [
        id,
      ])
    ).rows[0] as any;
  },
  async find_image(id) {
    return (
      await query(
        `SELECT f.content,f.content_type,f.sha256 FROM ${poi_with_photo}
         WHERE p.id=$1 AND p.is_published AND f.content IS NOT NULL`,
        [id],
      )
    ).rows[0] as any;
  },
  async ready() {
    await query(`SELECT ${poi_columns} FROM ${poi_with_photo} LIMIT 0`);
  },
};
