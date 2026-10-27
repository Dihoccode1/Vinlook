import { createLocationTracker, type LocationEnvironment } from './location-tracker';

const preferenceKey = 'vinlook.gps.enabled';
interface SessionEnvironment extends LocationEnvironment {
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  permissions?: Pick<Permissions, 'query'>;
  page?: EventTarget;
}

/** One watch for the entire browser tab. Storage contains a preference, never coordinates. */
export function createLocationSession(environment: SessionEnvironment) {
  const tracker = createLocationTracker(environment);
  let preference: string | null = null;
  let revision = 0;
  let disposed = false;
  try { preference = environment.storage?.getItem(preferenceKey) ?? null; } catch { /* Storage can be blocked. */ }

  function remember(value: 'enabled' | 'disabled') {
    preference = value;
    try { environment.storage?.setItem(preferenceKey, value); } catch { /* Keep the in-memory session. */ }
  }
  function start() {
    if (disposed) return;
    revision++;
    remember('enabled');
    tracker.start();
  }
  function stop() {
    revision++;
    remember('disabled');
    tracker.stop();
  }
  async function resume() {
    if (disposed || preference === 'disabled' || tracker.getSnapshot().active) return;
    const current = ++revision;
    let permission: PermissionState | undefined;
    try { permission = (await environment.permissions?.query({ name: 'geolocation' }))?.state; } catch { /* Unsupported Permissions API. */ }
    if (disposed || current !== revision || preference === 'disabled') return;
    if (permission === 'granted' || (preference === 'enabled' && permission !== 'denied')) start();
  }
  const onHide = () => { revision++; tracker.stop(); };
  const onShow = () => { void resume(); };
  environment.page?.addEventListener('pagehide', onHide);
  environment.page?.addEventListener('pageshow', onShow);

  return {
    getSnapshot: tracker.getSnapshot, subscribe: tracker.subscribe,
    start, stop, resume,
    dispose() {
      disposed = true;
      revision++;
      environment.page?.removeEventListener('pagehide', onHide);
      environment.page?.removeEventListener('pageshow', onShow);
      tracker.stop();
    },
  };
}

let browserSession: ReturnType<typeof createLocationSession> | undefined;
export function getBrowserLocationSession() {
  if (!browserSession) {
    let storage: Storage | undefined;
    try { storage = window.sessionStorage; } catch { /* Sandboxed/private browser mode. */ }
    browserSession = createLocationSession({
      secureContext: window.isSecureContext, geolocation: navigator.geolocation,
      storage, permissions: navigator.permissions, page: window,
    });
  }
  return browserSession;
}
