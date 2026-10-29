import assert from 'node:assert/strict';
import { test } from 'node:test';
import { create_location_session } from '../src/features/tracking/location-session.js';

function environment(permission: PermissionState = 'prompt') {
  const values = new Map<string, string>();
  let watches = 0;
  const cleared: number[] = [];
  return {
    secure_context: true,
    geolocation: { watchPosition() { return watches++; }, clearWatch(id: number) { cleared.push(id); } },
    permissions: { async query() { return { state: permission } as PermissionStatus; } },
    storage: { getItem(key: string) { return values.get(key) ?? null; }, setItem(key: string, value: string) { values.set(key, value); } },
    page: new EventTarget(), values, cleared, watches: () => watches,
  };
}

test('previously granted permission resumes GPS without a new enable action', async () => {
  const env = environment('granted');
  const session = create_location_session(env);
  await session.resume();
  await session.resume();
  assert.equal(env.watches(), 1);
  assert.equal(session.get_snapshot().active, true);
  session.dispose();
});

test('first permission prompt requires start; subscriber changes preserve the tab watch', async () => {
  const env = environment();
  const session = create_location_session(env);
  await session.resume();
  assert.equal(env.watches(), 0);
  session.start();
  const unsubscribe = session.subscribe(() => {});
  unsubscribe();
  session.subscribe(() => {});
  await session.resume();
  assert.equal(env.watches(), 1);
  assert.equal(session.get_snapshot().active, true);
  assert.deepEqual(env.cleared, []);
  session.dispose();
});

test('refresh restores preference without storing any position', async () => {
  const env = environment('granted');
  const first = create_location_session(env);
  first.start();
  first.dispose();
  const second = create_location_session(env);
  await second.resume();
  assert.equal(env.watches(), 2);
  assert.deepEqual([...env.values.values()], ['enabled']);
  second.dispose();
});

test('explicit stop survives refresh even when browser permission remains granted', async () => {
  const env = environment('granted');
  const session = create_location_session(env);
  session.start();
  session.stop();
  const next = create_location_session(env);
  await next.resume();
  assert.equal(env.watches(), 1);
  assert.equal(next.get_snapshot().active, false);
  session.dispose(); next.dispose();
});

test('pagehide releases GPS and pageshow can resume a restored page', async () => {
  const env = environment('granted');
  const session = create_location_session(env);
  session.start();
  env.page.dispatchEvent(new Event('pagehide'));
  assert.deepEqual(env.cleared, [0]);
  assert.equal(session.get_snapshot().active, false);
  env.page.dispatchEvent(new Event('pageshow'));
  await session.resume();
  assert.equal(env.watches(), 2);
  session.dispose();
});

test('a late permission result cannot restart GPS after the user stops it', async () => {
  const env = environment();
  let resolve!: (status: PermissionStatus) => void;
  env.permissions.query = () => new Promise<PermissionStatus>(done => { resolve = done; });
  const session = create_location_session(env);
  const pending = session.resume();
  session.stop();
  resolve({ state: 'granted' } as PermissionStatus);
  await pending;
  assert.equal(env.watches(), 0);
  session.dispose();
});

test('denied permission does not trigger an automatic watch or repeated prompts', async () => {
  const env = environment('denied');
  env.values.set('vinlook.gps.enabled', 'enabled');
  const session = create_location_session(env);
  await session.resume();
  assert.equal(env.watches(), 0);
  session.dispose();
});
