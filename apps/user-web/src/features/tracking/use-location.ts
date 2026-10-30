import { useEffect, useState, useSyncExternalStore } from 'react';
import { get_browser_location_session } from './location-session';

export function use_location() {
  const [tracker] = useState(get_browser_location_session);
  const snapshot = useSyncExternalStore(tracker.subscribe, tracker.get_snapshot);
  const [now, set_now] = useState(Date.now);

  // Component changes must not tear down a watch owned by the browser tab.
  useEffect(() => { void tracker.resume(); }, [tracker]);
  useEffect(() => {
    if (!snapshot.active) return;
    set_now(Date.now());
    const timer = window.setInterval(() => set_now(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, [snapshot.active]);

  const stale = snapshot.position !== null && (Math.max(now, Date.now()) - snapshot.position.timestamp > 30000 || snapshot.status !== 'tracking');
  return { ...snapshot, stale, start: tracker.start, stop: tracker.stop, refresh: tracker.refresh };
}
