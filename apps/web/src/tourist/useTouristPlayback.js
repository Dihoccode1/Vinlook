import { useEffect, useRef, useState } from 'react';
import { createPlayer } from './player.js';
import { createTelemetry } from './telemetry.js';
import { identityForBrowser } from './browser-identity.js';
const unavailableUsage = Object.fromEntries(
  ['presence', 'start', 'heartbeat', 'end'].map((method) => [
    method,
    () => Promise.reject(Error('USAGE_BRIDGE_PENDING')),
  ]),
);
export function useTouristPlayback(usage, locale) {
  const [playback, setPlayback] = useState({ state: 'idle', item: null }),
    [time, setTime] = useState(0);
  const player = useRef(null);
  useEffect(() => {
    const media = new Audio();
    media.preload = 'none';
    const telemetry = createTelemetry({
      usage: usage ?? unavailableUsage,
      identity: identityForBrowser(),
    });
    const p = createPlayer({
      media,
      telemetry,
      onChange: (s) => {
        setPlayback(s);
        if (s.state === 'idle') setTime(0);
      },
    });
    player.current = p;
    telemetry.mount();
    const tick = () => setTime(media.currentTime),
      offline = () => telemetry.offline(),
      online = () => telemetry.reconnect(),
      hide = () => {
        p.close('page_closed');
      };
    media.addEventListener('timeupdate', tick);
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    window.addEventListener('pagehide', hide);
    return () => {
      p.dispose();
      telemetry.dispose();
      media.removeEventListener('timeupdate', tick);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
      window.removeEventListener('pagehide', hide);
      player.current = null;
    };
  }, [usage]);
  useEffect(() => {
    player.current?.localeChanged(locale);
  }, [locale]);

  return { player, playback, time };
}
