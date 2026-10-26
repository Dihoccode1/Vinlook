const KEY = 'vinlook.telemetry.browserId.v1';
const LOCK = 'vinlook.telemetry.browserId.v1';
const valid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);

// Without an atomic cross-tab coordinator do not race a localStorage write.
// A stable existing ID is reusable; first use falls back to memory with an explicit disposition.
export function createBrowserIdentity({ storage, locks, uuid = () => crypto.randomUUID() } = {}) {
  let pending;
  const memory = (reason) => ({ browserId: uuid(), quality: 'best-effort', reason });
  async function initialize() {
    try {
      const stored = storage?.getItem(KEY);
      if (valid(stored)) return { browserId: stored, quality: 'shared', reason: null };
      if (!storage || !locks?.request) return memory('coordination-unavailable');
      return await locks.request(LOCK, () => {
        const current = storage.getItem(KEY);
        if (valid(current)) return { browserId: current, quality: 'shared', reason: null };
        const browserId = uuid();
        storage.setItem(KEY, browserId);
        if (storage.getItem(KEY) !== browserId) return memory('storage-unavailable');
        return { browserId, quality: 'shared', reason: null };
      });
    } catch {
      return memory('storage-unavailable');
    }
  }
  return () => (pending ??= initialize());
}
export function identityForBrowser(win = window) {
  let storage;
  try {
    storage = win.localStorage;
  } catch {
    /* privacy mode: memory fallback */
  }
  return createBrowserIdentity({
    storage,
    locks: win.navigator.locks,
    uuid: () => win.crypto.randomUUID(),
  });
}
