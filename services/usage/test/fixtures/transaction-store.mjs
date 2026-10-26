// TEST ONLY: deterministic serialized transaction model. Not Mongo or a production fallback.
export function createTransactionFixture({ fixtureMode, seed = { presences: [], playbacks: [] }, failAt = () => false } = {}) {
  if (fixtureMode !== true) throw new Error('EXPLICIT_TRANSACTION_FIXTURE_REQUIRED');
  let state = structuredClone(seed), tail = Promise.resolve();
  const calls = [];
  const failure = operation => { calls.push(operation); if (failAt(operation)) throw Error('synthetic-private-database-error'); };
  return { calls, inspect: () => structuredClone(state),
    transact(action) {
      const pending = tail.then(async () => {
        failure('begin');
        const working = structuredClone(state);
        const tx = {
          async getPlayback(id) { failure('getPlayback'); return structuredClone(working.playbacks.find(row => row.playbackId === id) ?? null); },
          async insertPlayback(row) { failure('insertPlayback'); if (working.playbacks.some(item => item.playbackId === row.playbackId)) throw Error('fixture unique conflict'); working.playbacks.push(structuredClone(row)); },
          async replacePlayback(row) { failure('replacePlayback'); const index = working.playbacks.findIndex(item => item.playbackId === row.playbackId); if (index < 0) throw Error('fixture missing row'); working.playbacks[index] = structuredClone(row); },
          async touchPresence(row) { failure('touchPresence'); const previous = working.presences.find(item => item.browserId === row.browserId);
            if (previous) previous.lastSeenAt = Math.max(previous.lastSeenAt, row.lastSeenAt); else working.presences.push(structuredClone(row)); },
          async snapshot() { failure('snapshot'); return structuredClone(working); },
        };
        const result = await action(tx); failure('commit'); state = working; failure('afterCommit');
        return structuredClone(result);
      });
      tail = pending.catch(() => {});
      return pending;
    },
  };
}
