import { UsageDomainFailure } from './domain.js';
import { limits } from './policy.js';
const fail = () => {
  throw new UsageDomainFailure('USAGE_UNAVAILABLE');
};
const toPlayback = (row) =>
  row === null
    ? null
    : {
        browserId: row.browserId,
        playbackId: row.playbackId,
        poiId: row.poiId === null ? null : String(row.poiId),
        languageCode: row.languageCode,
        startedAt: row.startedAt === null ? null : +row.startedAt,
        lastSeenAt: +row.lastSeenAt,
        endedAt: row.endedAt === null ? null : +row.endedAt,
        endReason: row.endReason,
      };
const dates = (row) => ({
  ...row,
  startedAt: row.startedAt === null ? null : new Date(row.startedAt),
  lastSeenAt: new Date(row.lastSeenAt),
  endedAt: row.endedAt === null ? null : new Date(row.endedAt),
});

/** Single-process bounded transaction queue; Mongo uniqueness/transactions protect durable identity. */
export function createMongoUsageStore({ connection, models, now = Date.now }) {
  if (connection.name !== 'vinlook_usage' && connection.name !== 'vinlook_usage_poc_test') fail();
  let tail = Promise.resolve(),
    pending = 0;
  async function run(action) {
    const session = await connection.startSession();
    try {
      let output;
      await session.withTransaction(
        async () => {
          const sampleTime = now();
          const fresh = () => ({ $gt: new Date(sampleTime - 90000) });
          const query = (cursor) => cursor.session(session).maxTimeMS(3000).lean();
          const activePresences = async () => {
            const rows = await query(
              models.Presence.find({ lastSeenAt: fresh() }).limit(limits.browsers + 1),
            );
            if (rows.length > limits.browsers) fail();
            return rows;
          };
          const activePlaybacks = async () => {
            const rows = await query(
              models.Listening.find({ endedAt: null, lastSeenAt: fresh() }).limit(
                limits.playbacks + 1,
              ),
            );
            if (rows.length > limits.playbacks) fail();
            return rows;
          };
          output = await action({
            async getPlayback(playbackId) {
              return toPlayback(await query(models.Listening.findOne({ playbackId })));
            },
            async insertPlayback(row) {
              if (row.endedAt === null && (await activePlaybacks()).length >= limits.playbacks)
                fail();
              await models.Listening.create([dates(row)], { session });
            },
            async replacePlayback(row) {
              const result = await models.Listening.updateOne(
                { playbackId: row.playbackId, browserId: row.browserId, endedAt: null },
                {
                  $set: {
                    lastSeenAt: new Date(row.lastSeenAt),
                    endedAt: row.endedAt === null ? null : new Date(row.endedAt),
                    endReason: row.endReason,
                  },
                },
                { session, runValidators: true },
              );
              if (result.matchedCount !== 1) fail();
            },
            async touchPresence(row) {
              const active = await activePresences();
              if (
                !active.some((item) => item.browserId === row.browserId) &&
                active.length >= limits.browsers
              )
                fail();
              await models.Presence.updateOne(
                { browserId: row.browserId },
                {
                  $setOnInsert: { browserId: row.browserId },
                  $max: { lastSeenAt: new Date(row.lastSeenAt) },
                },
                { session, upsert: true, runValidators: true },
              );
            },
            async snapshot() {
              const presences = await activePresences(),
                playbacks = await activePlaybacks();
              return {
                presences: presences.map((row) => ({
                  browserId: row.browserId,
                  lastSeenAt: +row.lastSeenAt,
                })),
                playbacks: playbacks.map(toPlayback),
              };
            },
          });
        },
        {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          readPreference: 'primary',
          timeoutMS: 10000,
          maxCommitTimeMS: 3000,
        },
      );
      return output;
    } catch (error) {
      if (error instanceof UsageDomainFailure) throw error;
      fail();
    } finally {
      await session.endSession();
    }
  }
  return Object.freeze({
    transact(action) {
      if (pending >= limits.inflight || connection.readyState !== 1)
        return Promise.reject(new UsageDomainFailure('USAGE_UNAVAILABLE'));
      pending++;
      const result = tail.then(() => run(action));
      tail = result.catch(() => {});
      return result.finally(() => {
        pending--;
      });
    },
  });
}
