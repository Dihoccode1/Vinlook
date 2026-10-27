import { useEffect, useState, useSyncExternalStore } from 'react';
import { getBrowserLocationSession } from './location-session';

export function useLocation() {
  const [tracker] = useState(getBrowserLocationSession);
  const snapshot = useSyncExternalStore(tracker.subscribe, tracker.getSnapshot);
  const [now, setNow] = useState(Date.now);

  // Component changes must not tear down a watch owned by the browser tab.
  useEffect(() => { void tracker.resume(); }, [tracker]);
  useEffect(() => {
    if (!snapshot.active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, [snapshot.active]);

  const stale = snapshot.position !== null && (Math.max(now, Date.now()) - snapshot.position.timestamp > 30000 || snapshot.status !== 'tracking');
  return { ...snapshot, stale, start: tracker.start, stop: tracker.stop };
}
