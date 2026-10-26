// TEST/LOCAL FIXTURE ONLY. No HTTP, database, production auth or live metrics.
import { readFileSync } from 'node:fs';
const registry = JSON.parse(readFileSync(new URL('../../../content/src/adapters/hybrid-v1.json', import.meta.url), 'utf8'));
const locales = new Set(Object.keys(registry.profiles));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const objectId = /^[0-9a-f]{24}$/;
export const FIXTURE_ONLY = true;
export const FIXTURE_EPOCH = Date.parse('2026-10-26T00:00:00.000Z');
export const FIXTURE_IDS = Object.freeze({
  browserA: '00000000-0000-4000-8000-000000000001',
  browserB: '00000000-0000-4000-8000-000000000002',
  playbackA: '00000000-0000-4000-8000-000000000011',
  playbackB: '00000000-0000-4000-8000-000000000012',
  playbackC: '00000000-0000-4000-8000-000000000013',
  poiA: '000000000000000000000001', poiB: '000000000000000000000002',
});
export class FixtureFailure extends Error {
  constructor(code, status) { super(code); this.code = code; this.status = status; }
}
const fail = (code = 'INVALID_INPUT', status = 422) => { throw new FixtureFailure(code, status); };
function valid(value, pattern) { if (typeof value !== 'string' || !pattern.test(value)) fail(); }
function clock(now) {
  const value = now();
  if (!Number.isSafeInteger(value) || value < 0 || !Number.isFinite(new Date(value).getTime())) fail();
  return value;
}
const iso = value => new Date(value).toISOString();

/** Deterministic semantic oracle for the PROPOSED bridge, never a server implementation. */
export function createUsageFixture({ fixtureMode, now, publicPois, available = () => true } = {}) {
  if (fixtureMode !== true || typeof now !== 'function' || !(publicPois instanceof Map)) {
    throw new Error('Explicit fixture mode, clock and synthetic catalog required');
  }
  const presence = new Map(), playbacks = new Map();
  const browser = value => valid(value, uuid);
  const playback = value => valid(value, uuid);
  const owned = (browserId, playbackId) => {
    const record = playbacks.get(playbackId);
    if (record && record.browserId !== browserId) fail('PLAYBACK_CONFLICT', 409);
    return record;
  };
  return Object.freeze({
    fixtureOnly: true,
    presence(browserId) {
      browser(browserId);
      const time = clock(now);
      presence.set(browserId, time);
      return { acceptedAt: iso(time) };
    },
    start(browserId, playbackId, poiId, languageCode) {
      browser(browserId); playback(playbackId); valid(poiId, objectId);
      if (!locales.has(languageCode)) fail();
      const previous = owned(browserId, playbackId);
      if (previous) {
        if (previous.startedAt !== null && (previous.poiId !== poiId || previous.languageCode !== languageCode)) fail('PLAYBACK_CONFLICT', 409);
        return { playbackId, acceptedAt: iso(previous.startedAt ?? previous.endedAt), endedAt: previous.endedAt === null ? null : iso(previous.endedAt) };
      }
      if (!publicPois.get(poiId)?.includes(languageCode)) fail('POI_NOT_AVAILABLE', 404);
      const time = clock(now);
      playbacks.set(playbackId, { browserId, poiId, languageCode, startedAt: time, lastSeenAt: time, endedAt: null, endReason: null });
      presence.set(browserId, time);
      return { playbackId, acceptedAt: iso(time), endedAt: null };
    },
    heartbeat(browserId, playbackId) {
      browser(browserId); playback(playbackId);
      const previous = owned(browserId, playbackId);
      if (!previous || previous.endedAt !== null) fail('PLAYBACK_NOT_OPEN', 409);
      const time = clock(now);
      previous.lastSeenAt = time;
      presence.set(browserId, time);
      return { playbackId, acceptedAt: iso(time) };
    },
    end(browserId, playbackId, reason) {
      browser(browserId); playback(playbackId);
      if (!['completed', 'page_closed', 'closed', 'replaced'].includes(reason)) fail();
      const previous = owned(browserId, playbackId);
      if (previous?.endedAt !== undefined && previous.endedAt !== null) return { playbackId, endedAt: iso(previous.endedAt) };
      const time = clock(now);
      if (previous) Object.assign(previous, { endedAt: time, endReason: reason });
      else playbacks.set(playbackId, { browserId, poiId: null, languageCode: null, startedAt: null, lastSeenAt: time, endedAt: time, endReason: reason });
      return { playbackId, endedAt: iso(time) };
    },
    summary(token) {
      if (!['fixture-staff', 'fixture-manager'].includes(token)) {
        fail(token === 'fixture-locked' ? 'ACCESS_DENIED' : 'AUTHENTICATION_REQUIRED', token === 'fixture-locked' ? 403 : 401);
      }
      if (!available()) fail('USAGE_UNAVAILABLE', 503);
      const time = clock(now), cutoff = time - 90000;
      const online = new Set([...presence].filter(([, lastSeenAt]) => lastSeenAt > cutoff).map(([id]) => id));
      const listeners = new Set(), byPoi = new Map();
      for (const record of playbacks.values()) {
        if (record.endedAt !== null || record.lastSeenAt <= cutoff || !online.has(record.browserId)) continue;
        listeners.add(record.browserId);
        if (!byPoi.has(record.poiId)) byPoi.set(record.poiId, new Set());
        byPoi.get(record.poiId).add(record.browserId);
      }
      return { asOf: iso(time), refreshedAt: iso(time), onlineVisitors: online.size, currentListeners: listeners.size,
        byPoi: [...byPoi].sort(([a], [b]) => a.localeCompare(b)).map(([poiId, ids]) => ({ poiId, currentListeners: ids.size })) };
    },
  });
}

/** Fixture response presented to a UI adapter after a failed refresh. */
export function staleSummaryFixture(lastKnown, observedAt) {
  return { status: 'error', stale: true, observedAt, data: lastKnown, errorCode: 'USAGE_UNAVAILABLE' };
}
