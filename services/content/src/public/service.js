import { DraftFailure } from '../drafts/validation.js';
import { languageCodes } from '../models/index.js';
import { snapshotId, readCursor, signCursor } from './cursor.js';
const fail = (code = 'PUBLIC_CONTENT_UNAVAILABLE', status = 503) => {
  throw new DraftFailure(code, status);
};
const MAX_BYTES = 8 * 1024 * 1024;
export function distanceMeters(lat, lon, coordinates) {
  const [lng, latitude] = coordinates,
    rad = Math.PI / 180;
  const a =
    Math.sin(((latitude - lat) * rad) / 2) ** 2 +
    Math.cos(lat * rad) * Math.cos(latitude * rad) * Math.sin(((lng - lon) * rad) / 2) ** 2;
  return (
    6371008.8 *
    2 *
    Math.atan2(Math.sqrt(Math.max(0, Math.min(1, a))), Math.sqrt(Math.max(0, 1 - a)))
  );
}
export function createPublicService(runtime) {
  const { connection, models, now = Date.now } = runtime;
  const key = runtime.publicCursorKey ? Buffer.from(runtime.publicCursorKey) : null;
  const configured = () => {
    if (!key || key.length !== 32) fail();
  };
  async function scan(language, withdrawals = false) {
    configured();
    const session = await connection.startSession();
    let output;
    try {
      await session.withTransaction(
        async () => {
          const generatedAt = new Date(now()).toISOString(),
            items = [],
            ids = [];
          let bytes = 0;
          const parents = await models.POI.find({}).sort({ _id: 1 }).limit(1001).session(session);
          if (parents.length > 1000) fail();
          for (const poi of parents) {
            try {
              await poi.validate();
            } catch {
              fail();
            }
            if (withdrawals) {
              if (
                !poi.deletedAt &&
                poi.publishedRevisionId &&
                !(await models.POIRevision.exists({
                  _id: poi.publishedRevisionId,
                  poiId: poi._id,
                  status: 'published',
                }).session(session))
              )
                fail();
              if (
                poi.deletedAt ||
                (!poi.publishedRevisionId &&
                  (await models.POIRevision.exists({ poiId: poi._id, status: 'published' }).session(
                    session,
                  )))
              )
                ids.push(String(poi._id));
              continue;
            }
            if (poi.deletedAt || !poi.publishedRevisionId) continue;
            const rev = await models.POIRevision.findOne({
              _id: poi.publishedRevisionId,
              poiId: poi._id,
              status: 'published',
            }).session(session);
            if (!rev) fail();
            const rows = await models.LocalizedContent.find({ revisionId: rev._id })
              .limit(17)
              .session(session);
            if (
              rows.length !== 16 ||
              new Set(rows.map((r) => r.languageCode)).size !== 16 ||
              languageCodes.some((code) => !rows.some((r) => r.languageCode === code))
            )
              fail();
            try {
              await rev.validate();
              for (const row of rows) await row.validate();
            } catch {
              fail();
            }
            for (const row of rows) {
              if (
                row.sourceVersion !== rev.sourceVersion ||
                row.reviewStatus !== 'approved' ||
                !row.audioAsset ||
                row.audioAsset.format !== 'mp3' ||
                row.audioAsset.textVersion !== row.textVersion ||
                (row.languageCode === 'en' && row.text !== rev.sourceTextEN)
              )
                fail();
            }
            const row = rows.find((r) => r.languageCode === language);
            const point = (value) => ({ type: 'Point', coordinates: [...value.coordinates] });
            const item = {
              id: String(poi._id),
              revisionId: String(rev._id),
              nameEN: rev.nameEN,
              location: point(rev.location),
              entrance: point(rev.entrance),
              thumbnail: { url: rev.thumbnailAsset.url },
              languageCode: language,
              text: row.text,
              audio: { url: row.audioAsset.url, durationSeconds: row.durationSeconds },
            };
            bytes += Buffer.byteLength(JSON.stringify(item));
            if (bytes > MAX_BYTES) fail();
            items.push(item);
          }
          output = withdrawals
            ? { poiIds: ids, snapshotId: snapshotId(ids), generatedAt, complete: true }
            : items;
        },
        { readConcern: { level: 'snapshot' }, readPreference: 'primary', timeoutMS: 10000 },
      );
      return output;
    } catch (error) {
      if (error instanceof DraftFailure) throw error;
      fail();
    } finally {
      await session.endSession();
    }
  }
  return {
    async list(filters) {
      configured();
      const time = now(),
        cursor = filters.cursor ? readCursor(filters.cursor, key, filters, time) : null;
      const items = (await scan(filters.language)).filter((item) =>
        item.nameEN.toLowerCase().includes(filters.q.toLowerCase()),
      );
      const digest = snapshotId(items);
      if (cursor && cursor.snapshotId !== digest) fail('PUBLIC_SNAPSHOT_CHANGED', 409);
      const remaining = cursor ? items.filter((item) => item.id > cursor.lastId) : items,
        page = remaining.slice(0, filters.limit);
      const nextCursor =
        remaining.length > filters.limit
          ? signCursor(
              {
                v: 1,
                kind: 'pois',
                language: filters.language,
                q: filters.q,
                limit: filters.limit,
                snapshotId: digest,
                lastId: page.at(-1).id,
                expiresAt: cursor?.expiresAt ?? time + 900000,
              },
              key,
            )
          : null;
      return { items: page, nextCursor, snapshotId: digest };
    },
    async detail(id, language) {
      const item = (await scan(language)).find((item) => item.id === id);
      if (!item) fail('POI_NOT_FOUND', 404);
      return item;
    },
    async nearby(filters) {
      const ranked = (await scan(filters.language))
        .map((item) => ({
          item,
          distance: distanceMeters(filters.lat, filters.lon, item.location.coordinates),
        }))
        .filter((row) => row.distance <= 3000)
        .sort((a, b) => a.distance - b.distance || a.item.id.localeCompare(b.item.id))
        .slice(0, filters.limit);
      return {
        items: ranked.map(({ item, distance }) => ({
          ...item,
          straightLineDistanceMeters: Math.round(distance * 100) / 100,
        })),
        actualCount: ranked.length,
        radiusMeters: 3000,
      };
    },
    deletions: () => scan('en', true),
  };
}
