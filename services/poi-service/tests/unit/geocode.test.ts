import test from 'node:test';
import assert from 'node:assert/strict';
import { createAddressLookup } from '../../src/modules/admin/geocode.js';
const feature = (name: string, coordinates: unknown[], housenumber?: string) => ({ properties: { name, countrycode: 'VN', housenumber }, geometry: { type: 'Point', coordinates } });
test('geocoding validates coordinates and caches normalized addresses', async () => {
  let calls = 0;
  const lookup = createAddressLookup(async (url, init) => {
    calls++;
    assert.equal(new URL(String(url)).searchParams.get('countrycode'), 'VN');
    assert.match(String((init?.headers as Record<string,string>)['User-Agent']), /Vinlook/);
    return Response.json({ features: [feature('Chợ Bến Thành', [106.698, 10.772]), feature('Bad', [106, 91]), feature('Empty', ['', '']), feature('NaN', [106, NaN])] });
  });
  const found = await lookup('Chợ Bến Thành');
  assert.deepEqual(found, [{ label: 'Chợ Bến Thành', latitude: 10.772, longitude: 106.698 }]);
  assert.deepEqual(await lookup('  chợ   bến thành  '), found); assert.equal(calls, 1);
});
test('changing house number uses a distinct query and never accepts a street or another number', async () => {
  const queries: string[] = [];
  const lookup = createAddressLookup(async url => {
    queries.push(new URL(String(url)).searchParams.get('q')!);
    return Response.json({ features: [feature('Street', [106.7, 10.77]), feature('Building', [106.71, 10.78], '135')] });
  });
  assert.equal((await lookup('135 Nam Kỳ Khởi Nghĩa'))[0]?.latitude, 10.78);
  assert.deepEqual(await lookup('136 Nam Kỳ Khởi Nghĩa'), []);
  assert.equal(queries.length, 2);
});
test('upstream failures release the request lock', async () => {
  const lookup = createAddressLookup(async () => Response.json({}, { status: 429 }));
  await assert.rejects(lookup('Địa chỉ thử'), /GEOCODE_UNAVAILABLE/);
  await assert.rejects(lookup('Địa chỉ khác'), /GEOCODE_UNAVAILABLE/);
});

test('concurrent lookups share identical requests and serialize a changed address', async () => {
  const queries: string[] = []; let active = 0; let peak = 0;
  const starts: number[] = [];
  const lookup = createAddressLookup(async url => {
    const address = new URL(String(url)).searchParams.get('q')!;
    queries.push(address); starts.push(Date.now()); active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 30)); active--;
    return Response.json({ features: [feature(address, [106.7, address.startsWith('135') ? 10.77 : 10.78], address.split(' ')[0])] });
  });
  const first = lookup('135 Nam Kỳ Khởi Nghĩa');
  const duplicate = lookup('135 Nam Kỳ Khởi Nghĩa');
  const changed = lookup('136 Nam Kỳ Khởi Nghĩa');
  const [a, b, c] = await Promise.all([first, duplicate, changed]);
  assert.deepEqual(a, b); assert.notEqual(a[0]?.latitude, c[0]?.latitude);
  assert.equal(queries.length, 2); assert.equal(peak, 1);
  assert.ok(starts[1]! - starts[0]! >= 990);
});
