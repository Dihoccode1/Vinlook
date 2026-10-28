import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { usePoiDiscovery } from '../src/features/poi/use-poi-discovery.js';
import type { Poi } from '../src/types/poi.js';

type Options = Parameters<typeof usePoiDiscovery>[0];
const origin = { latitude: 0, longitude: 0 };
const defaults: Options = { search: '', category: '', position: origin };
function poi(id: string, meters: number, overrides: Partial<Poi> = {}): Poi {
  return { id, slug: id, name: id, description: '', address: 'Địa chỉ', latitude: meters / 6371000 * 180 / Math.PI, longitude: 0,
    category: 'history', sourceLanguage: 'vi', imageUrl: null, imageCredit: null, imageSourceUrl: null, imageLicenseUrl: null, ...overrides };
}
const pageResponse = (data: Poi[], total = data.length, page = 1) => Response.json({ data, pagination: { total, page, limit: 100 } });
async function mount(t: TestContext, fetcher: (url: string, init?: RequestInit) => Promise<Response>, initial = defaults) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const previous = { window: globalThis.window, document: globalThis.document, reactAct: (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  t.mock.method(globalThis, 'fetch', fetcher);
  const root = createRoot(document.getElementById('root')!);
  let options = initial, retry = 0;
  let state!: ReturnType<typeof usePoiDiscovery>;
  function Probe() { state = usePoiDiscovery(options, retry); return null; }
  t.after(async () => {
    await act(() => root.unmount());
    Object.assign(globalThis, { window: previous.window, document: previous.document, IS_REACT_ACT_ENVIRONMENT: previous.reactAct });
    dom.window.close();
  });
  async function render(next = options, nextRetry = retry) {
    options = next; retry = nextRetry;
    await act(() => root.render(createElement(Probe)));
  }
  await render();
  return { state: () => state, render };
}

test('discovery filters the list while keeping every map POI; search, GPS and category never refetch catalog', async t => {
  const catalog = [poi('near museum', 1000), poi('Xa Độc Lập', 15000), poi('near market', 500, { category: 'market' })];
  const requests: URL[] = [];
  const f = await mount(t, async url => { requests.push(new URL(url, 'http://localhost')); return pageResponse(catalog); });
  assert.equal(f.state().loading, false); assert.equal(f.state().error, '');
  assert.deepEqual(f.state().allPois.map(item => item.id), catalog.map(item => item.id));
  assert.deepEqual(f.state().matches.map(item => item.poi.id), ['near market', 'near museum']);
  await f.render({ search: 'doc lap', category: '', position: null });
  assert.deepEqual(f.state().matches.map(item => item.poi.id), ['Xa Độc Lập']);
  assert.equal(f.state().matches[0]?.distanceMeters, null);
  await f.render({ search: 'near', category: 'market', position: null });
  assert.deepEqual(f.state().matches.map(item => item.poi.id), ['near market']);
  await f.render({ search: '', category: '', position: { latitude: catalog[1]!.latitude, longitude: 0 } });
  assert.deepEqual(f.state().matches.map(item => item.poi.id), ['Xa Độc Lập']);
  await f.render({ search: '   ', category: '', position: null });
  assert.deepEqual(f.state().matches, []); assert.equal(f.state().allPois.length, 3);
  assert.equal(requests.length, 1);
  assert.deepEqual([...requests[0]!.searchParams.entries()], [['page', '1'], ['limit', '100']]);
});

test('discovery loads every catalog page so POIs past the first 100 remain on map and globally searchable', async t => {
  const catalog = [...Array.from({ length: 100 }, (_, index) => poi(`near-${index}`, 100 + index)), poi('Xa ở trang hai', 20000)];
  const requests: number[] = [];
  const f = await mount(t, async url => {
    const page = Number(new URL(url, 'http://localhost').searchParams.get('page')); requests.push(page);
    return pageResponse(catalog.slice((page - 1) * 100, page * 100), catalog.length, page);
  });
  assert.deepEqual(requests, [1, 2]); assert.equal(f.state().allPois.length, 101);
  assert.equal(f.state().matches.length, 100);
  await f.render({ search: 'trang hai', category: '', position: null });
  assert.deepEqual(f.state().matches.map(item => item.poi.id), ['Xa ở trang hai']);
  assert.deepEqual(requests, [1, 2]);
});

test('retry aborts the prior request and ignores its late catalog response', async t => {
  let resolveOld!: (response: Response) => void;
  let calls = 0; let firstSignal: AbortSignal | undefined;
  const f = await mount(t, async (_url, init) => {
    calls++;
    if (calls === 1) { firstSignal = init?.signal ?? undefined; return new Promise<Response>(resolve => { resolveOld = resolve; }); }
    return pageResponse([poi('new catalog', 500)]);
  });
  assert.equal(f.state().loading, true);
  await f.render(defaults, 1);
  assert.equal(firstSignal?.aborted, true); assert.equal(f.state().loading, false);
  assert.deepEqual(f.state().allPois.map(item => item.id), ['new catalog']);
  await act(async () => { resolveOld(pageResponse([poi('stale catalog', 10)])); });
  assert.deepEqual(f.state().allPois.map(item => item.id), ['new catalog']);
  assert.equal(calls, 2);
});

test('catalog errors are reported and retry can recover the complete list', async t => {
  let calls = 0;
  const f = await mount(t, async () => ++calls === 1 ? Response.json({}, { status: 503 }) : pageResponse([poi('recovered', 500)]));
  assert.equal(f.state().loading, false); assert.ok(f.state().error); assert.deepEqual(f.state().allPois, []);
  await f.render(defaults, 1);
  assert.equal(f.state().error, ''); assert.equal(f.state().loading, false);
  assert.equal(f.state().allPois[0]?.id, 'recovered');
});
