// Usage domain semantics; no HTTP, schema creation or runtime activation.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const objectId = /^[0-9a-f]{24}$/;
const reasons = new Set(['completed', 'page_closed', 'closed', 'replaced']);
const recordKeys = [
  'browserId',
  'playbackId',
  'poiId',
  'languageCode',
  'startedAt',
  'lastSeenAt',
  'endedAt',
  'endReason',
];
const exact = (value, fields) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === fields.length &&
  fields.every((key) => Object.hasOwn(value, key));
const matches = (value, pattern) => typeof value === 'string' && pattern.test(value);
const timestamp = (value) =>
  Number.isSafeInteger(value) && value >= 0 && Number.isFinite(new Date(value).getTime());

export class UsageDomainFailure extends Error {
  constructor(code) {
    super(code);
    this.name = 'UsageDomainFailure';
    this.code = code;
  }
}
const fail = (code) => {
  throw new UsageDomainFailure(code);
};
const unavailable = () => fail('USAGE_UNAVAILABLE');
const clock = (now) => {
  const value = now();
  if (!timestamp(value)) unavailable();
  return value;
};
function input(value, fields) {
  if (
    !exact(value, fields) ||
    !matches(value.browserId, uuid) ||
    (fields.includes('playbackId') && !matches(value.playbackId, uuid))
  )
    fail('INVALID_INPUT');
  return Object.freeze({ ...value }); // Capture selection before the first await.
}
function record(value, locales, expectedId = null) {
  if (
    !exact(value, recordKeys) ||
    !matches(value.browserId, uuid) ||
    !matches(value.playbackId, uuid) ||
    (expectedId !== null && value.playbackId !== expectedId) ||
    !timestamp(value.lastSeenAt)
  )
    unavailable();
  if (value.startedAt === null) {
    if (value.poiId !== null || value.languageCode !== null || value.endedAt === null)
      unavailable();
  } else if (
    !timestamp(value.startedAt) ||
    value.startedAt > value.lastSeenAt ||
    !matches(value.poiId, objectId) ||
    !locales.has(value.languageCode)
  )
    unavailable();
  if (value.endedAt === null) {
    if (value.endReason !== null) unavailable();
  } else if (
    !timestamp(value.endedAt) ||
    value.endedAt < value.lastSeenAt ||
    !reasons.has(value.endReason)
  )
    unavailable();
  return { ...value };
}
function existing(value, selection, locales) {
  if (value === null) return null;
  const previous = record(value, locales, selection.playbackId);
  if (
    previous.browserId !== selection.browserId ||
    (selection.poiId !== undefined &&
      previous.startedAt !== null &&
      (previous.poiId !== selection.poiId || previous.languageCode !== selection.languageCode))
  )
    fail('PLAYBACK_CONFLICT');
  return previous;
}
const startResult = (row) =>
  Object.freeze({
    playbackId: row.playbackId,
    acceptedAt: row.startedAt ?? row.endedAt,
    endedAt: row.endedAt,
  });
const noClockRegression = (time, row) => {
  if (row && time < Math.max(row.lastSeenAt, row.endedAt ?? 0)) unavailable();
};

/** A consistent, complete Usage-only snapshot is mandatory; dependency failure never yields zero. */
export function countUsage(snapshot, asOf, languageCodes) {
  const locales = new Set(languageCodes);
  if (
    !timestamp(asOf) ||
    !exact(snapshot, ['presences', 'playbacks']) ||
    !Array.isArray(snapshot.presences) ||
    !Array.isArray(snapshot.playbacks)
  )
    unavailable();
  const cutoff = asOf - 90000,
    online = new Set(),
    seenBrowsers = new Set(),
    seenPlaybacks = new Set();
  for (const row of snapshot.presences) {
    if (
      !exact(row, ['browserId', 'lastSeenAt']) ||
      !matches(row.browserId, uuid) ||
      !timestamp(row.lastSeenAt) ||
      row.lastSeenAt > asOf ||
      seenBrowsers.has(row.browserId)
    )
      unavailable();
    seenBrowsers.add(row.browserId);
    if (row.lastSeenAt > cutoff) online.add(row.browserId);
  }
  const listening = new Set(),
    byPoi = new Map();
  for (const raw of snapshot.playbacks) {
    const row = record(raw, locales);
    if (
      seenPlaybacks.has(row.playbackId) ||
      row.lastSeenAt > asOf ||
      (row.endedAt !== null && row.endedAt > asOf)
    )
      unavailable();
    seenPlaybacks.add(row.playbackId);
    if (row.endedAt !== null || row.lastSeenAt <= cutoff || !online.has(row.browserId)) continue;
    listening.add(row.browserId);
    if (!byPoi.has(row.poiId)) byPoi.set(row.poiId, new Set());
    byPoi.get(row.poiId).add(row.browserId);
  }
  return {
    asOf,
    onlineVisitors: online.size * 2,
    currentListeners: listening.size,
    byPoi: [...byPoi]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([poiId, browsers]) => ({ poiId, currentListeners: browsers.size })),
  };
}

/**
 * Store port: transact(callback) must commit/rollback all callback operations atomically,
 * serialize conflicting playback/presence writes, and supply one consistent complete snapshot.
 * No in-memory store, DB driver, catalog or HTTP adapter is used by production code here.
 */
export function createUsageService({ store, verifyPublicPoi, languageCodes, now = Date.now } = {}) {
  if (
    !store ||
    typeof store.transact !== 'function' ||
    typeof verifyPublicPoi !== 'function' ||
    typeof now !== 'function' ||
    !Array.isArray(languageCodes) ||
    languageCodes.length !== 16 ||
    new Set(languageCodes).size !== 16 ||
    languageCodes.some((code) => typeof code !== 'string' || !code) ||
    !languageCodes.includes('en') ||
    !languageCodes.includes('zh-Hant')
  )
    throw new Error('INVALID_USAGE_DEPENDENCIES');
  const locales = new Set(languageCodes); // Caller supplies the reviewed registry; no Content DB/file/runtime coupling.
  async function safe(action) {
    try {
      return await action();
    } catch (error) {
      if (error instanceof UsageDomainFailure) throw error;
      unavailable();
    }
  }
  const transaction = (action) =>
    store.transact(async (tx) => {
      if (
        !tx ||
        ['getPlayback', 'insertPlayback', 'replacePlayback', 'touchPresence', 'snapshot'].some(
          (key) => typeof tx[key] !== 'function',
        )
      )
        unavailable();
      return action(tx);
    });
  return Object.freeze({
    presence(value) {
      return safe(async () => {
        const selection = input(value, ['browserId']);
        return transaction(async (tx) => {
          const time = clock(now);
          await tx.touchPresence({ browserId: selection.browserId, lastSeenAt: time });
          return { acceptedAt: time };
        });
      });
    },
    start(value) {
      return safe(async () => {
        const selection = input(value, ['browserId', 'playbackId', 'poiId', 'languageCode']);
        if (!matches(selection.poiId, objectId) || !locales.has(selection.languageCode))
          fail('INVALID_INPUT');
        const previous = await transaction(async (tx) =>
          existing(await tx.getPlayback(selection.playbackId), selection, locales),
        );
        if (previous) return startResult(previous); // Duplicate/tombstone never refreshes or checks Content.
        let admitted;
        try {
          admitted = await verifyPublicPoi(
            Object.freeze({ poiId: selection.poiId, languageCode: selection.languageCode }),
          );
        } catch {
          fail('PUBLIC_CONTENT_UNAVAILABLE');
        }
        if (admitted === false) fail('POI_NOT_AVAILABLE');
        if (admitted !== true) fail('PUBLIC_CONTENT_UNAVAILABLE');
        return transaction(async (tx) => {
          // End/another start may have committed while public admission was pending.
          const raced = existing(await tx.getPlayback(selection.playbackId), selection, locales);
          if (raced) return startResult(raced);
          const time = clock(now),
            row = {
              ...selection,
              startedAt: time,
              lastSeenAt: time,
              endedAt: null,
              endReason: null,
            };
          await tx.insertPlayback(row);
          await tx.touchPresence({ browserId: selection.browserId, lastSeenAt: time });
          return startResult(row);
        });
      });
    },
    heartbeat(value) {
      return safe(async () => {
        const selection = input(value, ['browserId', 'playbackId']);
        return transaction(async (tx) => {
          const previous = existing(await tx.getPlayback(selection.playbackId), selection, locales);
          if (!previous || previous.endedAt !== null) fail('PLAYBACK_NOT_OPEN');
          const time = clock(now);
          noClockRegression(time, previous);
          await tx.replacePlayback({ ...previous, lastSeenAt: time });
          await tx.touchPresence({ browserId: selection.browserId, lastSeenAt: time });
          return { playbackId: selection.playbackId, acceptedAt: time };
        });
      });
    },
    end(value) {
      return safe(async () => {
        const selection = input(value, ['browserId', 'playbackId', 'reason']);
        if (!reasons.has(selection.reason)) fail('INVALID_INPUT');
        return transaction(async (tx) => {
          const previous = existing(await tx.getPlayback(selection.playbackId), selection, locales);
          if (previous && previous.endedAt !== null)
            return { playbackId: selection.playbackId, endedAt: previous.endedAt };
          const time = clock(now);
          noClockRegression(time, previous);
          const ended = previous
            ? { ...previous, endedAt: time, endReason: selection.reason }
            : {
                browserId: selection.browserId,
                playbackId: selection.playbackId,
                poiId: null,
                languageCode: null,
                startedAt: null,
                lastSeenAt: time,
                endedAt: time,
                endReason: selection.reason,
              };
          if (previous) await tx.replacePlayback(ended);
          else await tx.insertPlayback(ended);
          return { playbackId: selection.playbackId, endedAt: time };
        });
      });
    },
    summary() {
      return safe(() =>
        transaction(async (tx) => countUsage(await tx.snapshot(), clock(now), [...locales])),
      );
    },
  });
}
