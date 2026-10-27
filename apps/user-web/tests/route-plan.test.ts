import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { useRoutePlan } from '../src/features/navigation/use-route-plan.js';
import type { Poi } from '../src/types/poi.js';
import type { LocationFix } from '../src/features/tracking/location-tracker.js';

const poi: Poi = { id: '11111111-1111-4111-8111-111111111111', slug: 'cho-ben-thanh', name: 'Chợ Bến Thành', description: '', address: '', latitude: 10.77, longitude: 106.69, category: 'market', sourceLanguage: 'vi', imageUrl: null, imageCredit: null, imageSourceUrl: null, imageLicenseUrl: null };
const other: Poi = { ...poi, id: '22222222-2222-4222-8222-222222222222', name: 'Dinh Độc Lập', latitude: 10.78 };
function result(profile = 'driving') {
  return { data: { profile, provider: 'Valhalla', optimization: profile === 'bus' ? 'transit' : 'shortest', distance: 1234, duration: 200,
    geometry: { type: 'LineString', coordinates: [[106.69, 10.77], [106.69, 10.78]] }, legs: [{ distance: 1234, duration: 200, steps: [] }] } };
}

test('direct POI action waits for GPS then routes once; switching vehicle automatically recalculates', async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const root = createRoot(document.getElementById('root')!);
  t.after(async () => { await act(() => root.unmount()); Object.assign(globalThis, { window: oldWindow, document: oldDocument }); dom.window.close(); });
  let starts = 0;
  let gps: { active: boolean; position: LocationFix | null; stale: boolean; error: string | null; start: () => void } = { active: false, position: null, stale: false, error: null, start() { starts++; } };
  let plan!: ReturnType<typeof useRoutePlan>;
  function Probe() { plan = useRoutePlan([poi, other], gps); return null; }
  const requests: { profile: string; optimization: string; waypoints: unknown[] }[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
    const body = JSON.parse(options.body as string); requests.push(body); return Response.json(result(body.profile));
  });
  await act(() => root.render(createElement(Probe)));
  await act(() => plan.addStop(other, true));
  assert.equal(starts, 1);
  assert.equal(plan.waitingForGps, true);
  assert.equal(requests.length, 0);
  gps = { ...gps, active: true, position: { latitude: 10.77, longitude: 106.69, accuracy: 10, timestamp: Date.now() } };
  await act(() => root.render(createElement(Probe)));
  assert.equal(requests.length, 1);
  assert.equal(requests[0].profile, 'driving');
  assert.equal(plan.route?.distance, 1234);
  gps = { ...gps, position: { ...gps.position!, latitude: 10.771 } };
  await act(() => root.render(createElement(Probe)));
  assert.equal(requests.length, 1); // GPS updates do not spam the routing provider.
  await act(() => plan.setProfile('motorcycle'));
  assert.equal(requests.length, 2);
  assert.equal(plan.route?.profile, 'motorcycle');
  await act(() => plan.setProfile('bus'));
  assert.equal(requests[2].optimization, 'transit');
  await act(() => plan.addStop(poi, true));
  assert.equal(plan.profile, 'driving');
  assert.equal(requests.at(-1)?.profile, 'driving');
});

test('changing vehicle aborts the previous request and ignores its late result', async t => {
  const dom = new JSDOM('<div id="root"></div>');
  const oldWindow = globalThis.window, oldDocument = globalThis.document;
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  const root = createRoot(document.getElementById('root')!);
  t.after(async () => { await act(() => root.unmount()); Object.assign(globalThis, { window: oldWindow, document: oldDocument }); dom.window.close(); });
  let plan!: ReturnType<typeof useRoutePlan>;
  const gps = { active: true, position: { latitude: 10.77, longitude: 106.69, accuracy: 10, timestamp: Date.now() }, stale: false, start() {} };
  function Probe() { plan = useRoutePlan([poi, other], gps); return null; }
  let firstSignal: AbortSignal | undefined;
  let resolveFirst!: (value: Response) => void;
  let calls = 0;
  t.mock.method(globalThis, 'fetch', (_url: string, options: RequestInit) => {
    if (++calls === 1) { firstSignal = options.signal as AbortSignal; return new Promise<Response>(resolve => { resolveFirst = resolve; }); }
    return Promise.resolve(Response.json(result('motorcycle')));
  });
  await act(() => root.render(createElement(Probe)));
  await act(() => plan.addStop(other, true));
  await act(() => plan.setProfile('motorcycle'));
  assert.equal(firstSignal?.aborted, true);
  await act(async () => resolveFirst(Response.json(result('driving'))));
  assert.equal(plan.route?.profile, 'motorcycle');
});
