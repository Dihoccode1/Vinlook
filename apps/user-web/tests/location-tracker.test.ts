import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLocationTracker } from '../src/features/tracking/location-tracker.js';

function mockGps() {
  const callbacks: { success: PositionCallback; failure: PositionErrorCallback | null }[] = [];
  const cleared: number[] = [];
  const options: (PositionOptions | undefined)[] = [];
  const geolocation = {
    watchPosition(success: PositionCallback, failure: PositionErrorCallback | null = null, settings?: PositionOptions) {
      callbacks.push({ success, failure });
      options.push(settings);
      return callbacks.length - 1; // Zero is a valid watch id.
    },
    clearWatch(id: number) { cleared.push(id); },
  };
  return { callbacks, cleared, options, geolocation };
}

function fix(latitude = 10.77, timestamp = 1000): GeolocationPosition {
  return { coords: { latitude, longitude: 106.69, accuracy: 12 }, timestamp } as GeolocationPosition;
}
function error(code: number): GeolocationPositionError {
  return { code, message: 'Provider message' } as GeolocationPositionError;
}

test('does not ask permission before start and prevents duplicate watches', () => {
  const gps = mockGps();
  const tracker = createLocationTracker({ secureContext: true, geolocation: gps.geolocation });
  assert.equal(gps.callbacks.length, 0);
  assert.equal(tracker.getSnapshot().status, 'idle');
  tracker.start();
  tracker.start();
  assert.equal(gps.callbacks.length, 1);
  assert.equal(tracker.getSnapshot().status, 'locating');
  assert.deepEqual(gps.options[0], { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  gps.callbacks[0].success(fix());
  assert.equal(tracker.getSnapshot().position?.latitude, 10.77);
  assert.equal(tracker.getSnapshot().status, 'tracking');
});

test('stop clears watch 0 and coordinates; late callbacks cannot restore location', () => {
  const gps = mockGps();
  const tracker = createLocationTracker({ secureContext: true, geolocation: gps.geolocation });
  tracker.start();
  gps.callbacks[0].success(fix());
  tracker.stop();
  gps.callbacks[0].success(fix(20));
  gps.callbacks[0].failure?.(error(1));
  assert.deepEqual(gps.cleared, [0]);
  assert.deepEqual(tracker.getSnapshot(), { status: 'idle', active: false, position: null, error: null });
  tracker.start();
  gps.callbacks[0].success(fix(30));
  assert.equal(tracker.getSnapshot().position, null);
  gps.callbacks[1].success(fix(40));
  assert.equal(tracker.getSnapshot().position?.latitude, 40);
});

test('permission denial stops GPS and clears previous location', () => {
  const gps = mockGps();
  const tracker = createLocationTracker({ secureContext: true, geolocation: gps.geolocation });
  tracker.start();
  gps.callbacks[0].success(fix());
  gps.callbacks[0].failure?.(error(1));
  assert.equal(tracker.getSnapshot().active, false);
  assert.equal(tracker.getSnapshot().position, null);
  assert.match(tracker.getSnapshot().error!, /từ chối/);
  assert.deepEqual(gps.cleared, [0]);
});

test('temporary errors keep the watch and recover on the next fix', () => {
  for (const code of [2, 3]) {
    const gps = mockGps();
    const tracker = createLocationTracker({ secureContext: true, geolocation: gps.geolocation });
    tracker.start();
    gps.callbacks[0].success(fix());
    gps.callbacks[0].failure?.(error(code));
    assert.equal(tracker.getSnapshot().active, true);
    assert.equal(tracker.getSnapshot().status, 'error');
    assert.equal(tracker.getSnapshot().position?.timestamp, 1000);
    gps.callbacks[0].success(fix(11, 2000));
    assert.equal(tracker.getSnapshot().error, null);
    assert.equal(tracker.getSnapshot().position?.latitude, 11);
    assert.deepEqual(gps.cleared, []);
  }
});

test('ignores older fixes and rejects invalid coordinates', () => {
  const gps = mockGps();
  const tracker = createLocationTracker({ secureContext: true, geolocation: gps.geolocation });
  tracker.start();
  gps.callbacks[0].success(fix(10, 2000));
  gps.callbacks[0].success(fix(11, 1000));
  assert.equal(tracker.getSnapshot().position?.latitude, 10);
  for (const latitude of [NaN, Infinity, 91]) {
    gps.callbacks[0].success(fix(latitude, 3000));
    assert.equal(tracker.getSnapshot().status, 'error');
    assert.equal(tracker.getSnapshot().position?.latitude, 10);
  }
});

test('unsupported browser or insecure context never registers a watch', () => {
  const gps = mockGps();
  for (const environment of [{ secureContext: false, geolocation: gps.geolocation }, { secureContext: true }]) {
    const tracker = createLocationTracker(environment);
    tracker.start();
    assert.equal(tracker.getSnapshot().status, 'error');
    assert.equal(tracker.getSnapshot().active, false);
  }
  assert.equal(gps.callbacks.length, 0);
});

test('synchronous denial clears the returned watch id and start exceptions are handled', () => {
  const cleared: number[] = [];
  const tracker = createLocationTracker({ secureContext: true, geolocation: {
    watchPosition(_success, failure) { failure?.(error(1)); return 0; },
    clearWatch(id) { cleared.push(id); },
  } });
  tracker.start();
  assert.deepEqual(cleared, [0]);
  assert.equal(tracker.getSnapshot().active, false);
  const throwing = createLocationTracker({ secureContext: true, geolocation: {
    watchPosition() { throw new Error('Blocked'); }, clearWatch() {},
  } });
  throwing.start();
  assert.equal(throwing.getSnapshot().status, 'error');
  assert.equal(throwing.getSnapshot().active, false);
});

test('subscribers receive changes and unsubscribe removes the listener', () => {
  const gps = mockGps();
  const tracker = createLocationTracker({ secureContext: true, geolocation: gps.geolocation });
  let changes = 0;
  const unsubscribe = tracker.subscribe(() => changes++);
  tracker.start();
  assert.equal(changes, 1);
  unsubscribe();
  gps.callbacks[0].success(fix());
  assert.equal(changes, 1);
});
