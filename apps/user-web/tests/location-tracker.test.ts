import assert from 'node:assert/strict';
import { test } from 'node:test';
import { create_location_tracker } from '../src/features/tracking/location-tracker.js';

function mock_gps() {
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
  return { code, message: 'provider message' } as GeolocationPositionError;
}

test('does not ask permission before start and prevents duplicate watches', () => {
  const gps = mock_gps();
  const tracker = create_location_tracker({ secure_context: true, geolocation: gps.geolocation });
  assert.equal(gps.callbacks.length, 0);
  assert.equal(tracker.get_snapshot().status, 'idle');
  tracker.start();
  tracker.start();
  assert.equal(gps.callbacks.length, 1);
  assert.equal(tracker.get_snapshot().status, 'locating');
  assert.deepEqual(gps.options[0], { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  gps.callbacks[0].success(fix());
  assert.equal(tracker.get_snapshot().position?.latitude, 10.77);
  assert.equal(tracker.get_snapshot().status, 'tracking');
});

test('stop clears watch 0 and coordinates; late callbacks cannot restore location', () => {
  const gps = mock_gps();
  const tracker = create_location_tracker({ secure_context: true, geolocation: gps.geolocation });
  tracker.start();
  gps.callbacks[0].success(fix());
  tracker.stop();
  gps.callbacks[0].success(fix(20));
  gps.callbacks[0].failure?.(error(1));
  assert.deepEqual(gps.cleared, [0]);
  assert.deepEqual(tracker.get_snapshot(), { status: 'idle', active: false, position: null, error: null });
  tracker.start();
  gps.callbacks[0].success(fix(30));
  assert.equal(tracker.get_snapshot().position, null);
  gps.callbacks[1].success(fix(40));
  assert.equal(tracker.get_snapshot().position?.latitude, 40);
});

test('permission denial stops GPS and clears previous location', () => {
  const gps = mock_gps();
  const tracker = create_location_tracker({ secure_context: true, geolocation: gps.geolocation });
  tracker.start();
  gps.callbacks[0].success(fix());
  gps.callbacks[0].failure?.(error(1));
  assert.equal(tracker.get_snapshot().active, false);
  assert.equal(tracker.get_snapshot().position, null);
  assert.match(tracker.get_snapshot().error!, /từ chối/);
  assert.deepEqual(gps.cleared, [0]);
});

test('temporary errors keep the watch and recover on the next fix', () => {
  for (const code of [2, 3]) {
    const gps = mock_gps();
    const tracker = create_location_tracker({ secure_context: true, geolocation: gps.geolocation });
    tracker.start();
    gps.callbacks[0].success(fix());
    gps.callbacks[0].failure?.(error(code));
    assert.equal(tracker.get_snapshot().active, true);
    assert.equal(tracker.get_snapshot().status, 'error');
    assert.equal(tracker.get_snapshot().position?.timestamp, 1000);
    gps.callbacks[0].success(fix(11, 2000));
    assert.equal(tracker.get_snapshot().error, null);
    assert.equal(tracker.get_snapshot().position?.latitude, 11);
    assert.deepEqual(gps.cleared, []);
  }
});

test('ignores older fixes and rejects invalid coordinates', () => {
  const gps = mock_gps();
  const tracker = create_location_tracker({ secure_context: true, geolocation: gps.geolocation });
  tracker.start();
  gps.callbacks[0].success(fix(10, 2000));
  gps.callbacks[0].success(fix(11, 1000));
  assert.equal(tracker.get_snapshot().position?.latitude, 10);
  for (const latitude of [NaN, Infinity, 91]) {
    gps.callbacks[0].success(fix(latitude, 3000));
    assert.equal(tracker.get_snapshot().status, 'error');
    assert.equal(tracker.get_snapshot().position?.latitude, 10);
  }
});

test('unsupported browser or insecure context never registers a watch', () => {
  const gps = mock_gps();
  for (const environment of [{ secure_context: false, geolocation: gps.geolocation }, { secure_context: true }]) {
    const tracker = create_location_tracker(environment);
    tracker.start();
    assert.equal(tracker.get_snapshot().status, 'error');
    assert.equal(tracker.get_snapshot().active, false);
  }
  assert.equal(gps.callbacks.length, 0);
});

test('synchronous denial clears the returned watch id and start exceptions are handled', () => {
  const cleared: number[] = [];
  const tracker = create_location_tracker({ secure_context: true, geolocation: {
    watchPosition(_success, failure) { failure?.(error(1)); return 0; },
    clearWatch(id) { cleared.push(id); },
  } });
  tracker.start();
  assert.deepEqual(cleared, [0]);
  assert.equal(tracker.get_snapshot().active, false);
  const throwing = create_location_tracker({ secure_context: true, geolocation: {
    watchPosition() { throw new Error('Blocked'); }, clearWatch() {},
  } });
  throwing.start();
  assert.equal(throwing.get_snapshot().status, 'error');
  assert.equal(throwing.get_snapshot().active, false);
});

test('subscribers receive changes and unsubscribe removes the listener', () => {
  const gps = mock_gps();
  const tracker = create_location_tracker({ secure_context: true, geolocation: gps.geolocation });
  let changes = 0;
  const unsubscribe = tracker.subscribe(() => changes++);
  tracker.start();
  assert.equal(changes, 1);
  unsubscribe();
  gps.callbacks[0].success(fix());
  assert.equal(changes, 1);
});
