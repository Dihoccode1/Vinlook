import { isLocale } from '../i18n/locales.js';
import { ApiError, createTransport } from './http.js';

const idPattern = /^[a-f0-9]{24}$/;
const invalid = () => {
  throw new ApiError('INVALID_RESPONSE');
};
function id(value) {
  if (!idPattern.test(value ?? '')) throw new ApiError('INVALID_INPUT');
  return value;
}
function language(value) {
  if (!isLocale(value)) throw new ApiError('INVALID_INPUT');
  return value;
}
function asset(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    invalid();
  }
  if (url.protocol !== 'https:' || url.username || url.password) invalid();
  return url.href;
}
function point(value) {
  const c = value?.coordinates;
  if (
    value?.type !== 'Point' ||
    !Array.isArray(c) ||
    c.length !== 2 ||
    !c.every(Number.isFinite) ||
    Math.abs(c[0]) > 180 ||
    Math.abs(c[1]) > 90
  )
    invalid();
  return { type: 'Point', coordinates: [...c] };
}
// Copy only public DTO fields. No administrative/draft response is consumed.
export function publicPoi(value, selectedLanguage) {
  if (
    !idPattern.test(value?.id ?? '') ||
    !idPattern.test(value?.revisionId ?? '') ||
    value.languageCode !== selectedLanguage ||
    typeof value.nameEN !== 'string' ||
    !value.nameEN.trim() ||
    typeof value.text !== 'string' ||
    !value.text.trim() ||
    !Number.isFinite(value.audio?.durationSeconds) ||
    value.audio.durationSeconds < 90 ||
    value.audio.durationSeconds > 150
  )
    invalid();
  return {
    id: value.id,
    revisionId: value.revisionId,
    nameEN: value.nameEN,
    location: point(value.location),
    entrance: point(value.entrance),
    thumbnail: { url: asset(value.thumbnail?.url) },
    languageCode: selectedLanguage,
    text: value.text,
    audio: { url: asset(value.audio.url), durationSeconds: value.audio.durationSeconds },
  };
}
export function createContentAdapter(origin, options) {
  const request = createTransport(origin, options);
  return {
    async list({ locale = 'en', q, cursor, limit = 20, signal } = {}) {
      language(locale);
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 50 ||
        (q !== undefined && (typeof q !== 'string' || !q.trim() || [...q.trim()].length > 200))
      )
        throw new ApiError('INVALID_INPUT');
      const data = await request('/api/v1/pois', {
        query: { language: locale, q: q?.trim(), cursor, limit },
        signal,
      });
      if (
        !Array.isArray(data?.items) ||
        data.items.length > limit ||
        typeof data.snapshotId !== 'string' ||
        !(data.nextCursor === null || typeof data.nextCursor === 'string')
      )
        invalid();
      return {
        items: data.items.map((item) => publicPoi(item, locale)),
        nextCursor: data.nextCursor,
        snapshotId: data.snapshotId,
      };
    },
    async detail(poiId, locale = 'en', { signal } = {}) {
      const data = await request(`/api/v1/pois/${id(poiId)}`, {
        query: { language: language(locale) },
        signal,
      });
      const item = publicPoi(data, locale);
      if (item.id !== poiId) invalid();
      return item;
    },
    async nearby({ lat, lon, locale = 'en', signal }) {
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180
      )
        throw new ApiError('INVALID_INPUT');
      const data = await request('/api/v1/pois/nearby', {
        query: { lat, lon, language: language(locale), limit: 4 },
        signal,
      });
      if (
        !Array.isArray(data?.items) ||
        data.items.length > 4 ||
        data.actualCount !== data.items.length ||
        data.radiusMeters !== 3000
      )
        invalid();
      return {
        items: data.items.map((item) => {
          if (
            !Number.isFinite(item.straightLineDistanceMeters) ||
            item.straightLineDistanceMeters < 0 ||
            item.straightLineDistanceMeters > 3000
          )
            invalid();
          return {
            ...publicPoi(item, locale),
            straightLineDistanceMeters: item.straightLineDistanceMeters,
          };
        }),
        actualCount: data.actualCount,
        radiusMeters: 3000,
      };
    },
  };
}
