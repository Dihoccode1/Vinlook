import { query } from '@vinlook/server/postgres';
import type { PoiRepository } from './poi.repository.js';

export const poi_columns = `p.id,p.slug,p.name,p.description,p.visitor_description,p.address,
 p.latitude,p.longitude,p.category,p.source_language,p.image_credit,p.image_source_url,p.image_license_url,
 CASE WHEN EXISTS(SELECT 1 FROM poi_images i WHERE i.poi_id=p.id)
 THEN '/api/pois/'||p.id||'/image' ELSE p.image_url END AS image_url`;
export const search_pattern = (text: string) => (text ? `%${text.replace(/[~%_]/g, '~$&')}%` : '');
export const postgres_poi_repository: PoiRepository = {
  async list(input) {
    const values = [search_pattern(input.q), input.category ?? null];
    const filter = `p.is_published AND ($1='' OR p.name ILIKE $1 ESCAPE '~' OR p.address ILIKE $1 ESCAPE '~') AND ($2::text IS NULL OR p.category=$2)`;
    const { rows } = await query(
      `SELECT ${poi_columns} FROM pois p WHERE ${filter} ORDER BY p.name,p.id LIMIT $3 OFFSET $4`,
      [...values, input.limit, (input.page - 1) * input.limit],
    );
    const count = await query(`SELECT count(*)::int AS total FROM pois p WHERE ${filter}`, values);
    return {
      data: rows as any,
      pagination: { page: input.page, limit: input.limit, total: count.rows[0].total },
    };
  },
  async find(id) {
    return (await query(`SELECT ${poi_columns} FROM pois p WHERE p.id=$1 AND p.is_published`, [id]))
      .rows[0] as any;
  },
  async find_image(id) {
    return (
      await query(
        `SELECT i.content,i.content_type,i.sha256 FROM poi_images i JOIN pois p ON p.id=i.poi_id WHERE p.id=$1 AND p.is_published`,
        [id],
      )
    ).rows[0] as any;
  },
  async ready() {
    await query('SELECT p.id FROM pois p LEFT JOIN poi_images i ON i.poi_id=p.id LIMIT 0');
  },
};
