// Semantic interface from CONTRACTS.md. Intentionally no Usage HTTP routes yet.
export function createTelemetry({usage, identity, online = () => navigator.onLine !== false,
  uuid = () => crypto.randomUUID(), schedule = setInterval, cancel = clearInterval}) {
  let current = null, timer = null, disposed = false, epoch = 0;
  const send = operation => {
    if (disposed || !online()) return;
    // Capture events now, not after async identity or a subsequent POI selection.
    const sentEpoch = epoch;
    void Promise.resolve().then(identity).then(({browserId}) => {
      if (sentEpoch === epoch && online()) return operation(browserId);
    }).catch(() => {}); // telemetry may never interrupt the tourist flow
  };
  const end = reason => {
    const ended = current;
    current = null;
    if (ended) send(browserId => usage.end(browserId, ended.playbackId, reason));
  };
  const tick = () => {
    send(browserId => usage.presence(browserId));
    const active = current;
    if (active) send(browserId => usage.heartbeat(browserId, active.playbackId));
  };
  return {
    mount() { if (!disposed && timer === null) { tick(); timer = schedule(tick, 30000); } },
    start(poiId, languageCode) {
      end('replaced');
      current = {playbackId: uuid(), poiId, languageCode};
      const started = current;
      send(browserId => usage.start(browserId, started.playbackId, poiId, languageCode));
      return current.playbackId;
    },
    // Pause/resume deliberately has no end/start; the periodic heartbeat remains.
    end,
    offline() { epoch++; },
    reconnect() {
      tick();
      const active = current;
      // Re-admit only the currently active playback after a long offline expiry.
      if (active) send(browserId => usage.start(browserId, active.playbackId, active.poiId, active.languageCode));
    },
    dispose() {
      if (disposed) return;
      end('page_closed');
      if (timer !== null) cancel(timer);
      timer = null;
      disposed = true;
      // Let the captured best-effort end dispatch; no retry/queue after unmount.
    },
  };
}
