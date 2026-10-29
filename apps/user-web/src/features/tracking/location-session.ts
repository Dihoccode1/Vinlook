import { create_location_tracker, type LocationEnvironment } from './location-tracker';

const preference_key = 'vinlook.gps.enabled';
interface SessionEnvironment extends LocationEnvironment {
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  permissions?: Pick<Permissions, 'query'>;
  page?: EventTarget;
}

/** One watch for the entire browser tab. Storage contains a preference, never coordinates. */
export function create_location_session(environment: SessionEnvironment) {
  const tracker = create_location_tracker(environment);
  let preference: string | null = null;
  let revision = 0;
  let disposed = false;
  try { preference = environment.storage?.getItem(preference_key) ?? null; } catch { /* Storage can be blocked. */ }

  function remember(value: 'enabled' | 'disabled') {
    preference = value;
    try { environment.storage?.setItem(preference_key, value); } catch { /* Keep the in-memory session. */ }
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
    if (disposed || preference === 'disabled' || tracker.get_snapshot().active) return;
    const current = ++revision;
    let permission: PermissionState | undefined;
    try { permission = (await environment.permissions?.query({ name: 'geolocation' }))?.state; } catch { /* Unsupported Permissions API. */ }
    if (disposed || current !== revision || preference === 'disabled') return;
    if (permission === 'granted' || (preference === 'enabled' && permission !== 'denied')) start();
  }
  const on_hide = () => { revision++; tracker.stop(); };
  const on_show = () => { void resume(); };
  environment.page?.addEventListener('pagehide', on_hide);
  environment.page?.addEventListener('pageshow', on_show);

  return {
    get_snapshot: tracker.get_snapshot, subscribe: tracker.subscribe,
    start, stop, resume,
    dispose() {
      disposed = true;
      revision++;
      environment.page?.removeEventListener('pagehide', on_hide);
      environment.page?.removeEventListener('pageshow', on_show);
      tracker.stop();
    },
  };
}

let browser_session: ReturnType<typeof create_location_session> | undefined;
export function get_browser_location_session() {
  if (!browser_session) {
    let storage: Storage | undefined;
    try { storage = window.sessionStorage; } catch { /* Sandboxed/private browser mode. */ }
    browser_session = create_location_session({
      secure_context: window.isSecureContext, geolocation: navigator.geolocation,
      storage, permissions: navigator.permissions, page: window,
    });
  }
  return browser_session;
}
