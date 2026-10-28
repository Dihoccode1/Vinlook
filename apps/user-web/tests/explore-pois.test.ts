import assert from 'node:assert/strict';
import test from 'node:test';
import { distanceMeters, filterExplorePois } from '../src/features/poi/explore-pois.js';
import type { Poi } from '../src/types/poi.js';

const origin = { latitude: 0, longitude: 0 };
function poi(id: string, meters: number, overrides: Partial<Poi> = {}): Poi {
  return { id, slug: id, name: id, description: '', address: 'Đường Nguyễn Huệ', latitude: meters / 6371000 * 180 / Math.PI,
    longitude: 0, category: 'history', sourceLanguage: 'vi', imageUrl: null, imageCredit: null, imageSourceUrl: null, imageLicenseUrl: null, ...overrides };
}
const options = { search: '', category: '', position: origin };

test('explore includes the 5 km boundary, excludes farther POIs and sorts nearest first without changing map catalog', () => {
  const catalog = [poi('boundary', 5000), poi('outside', 5000.01), poi('near', 200), poi('middle', 3000)];
  const results = filterExplorePois(catalog, options);
  assert.deepEqual(results.map(item => item.poi.id), ['near', 'middle', 'boundary']);
  assert.ok(Math.abs(results.at(-1)!.distanceMeters! - 5000) < 0.000001);
  assert.deepEqual(catalog.map(item => item.id), ['boundary', 'outside', 'near', 'middle']);
});

test('search finds distant POIs by name or address without GPS and preserves catalog order', () => {
  const catalog = [poi('far', 30000, { name: 'Bảo tàng Mỹ thuật' }), poi('near', 100, { name: 'Bảo tàng Lịch sử' })];
  assert.deepEqual(filterExplorePois(catalog, { ...options, search: 'bao tang', position: null }).map(item => [item.poi.id, item.distanceMeters]), [['far', null], ['near', null]]);
  assert.deepEqual(filterExplorePois(catalog, { ...options, search: 'nguyen hue' }).map(item => item.poi.id), ['far', 'near']);
});

test('search normalizes Vietnamese diacritics, đ, case and surrounding whitespace', () => {
  const catalog = [poi('far', 30000, { name: 'Dinh Độc Lập', address: '135 Nam Kỳ Khởi Nghĩa' })];
  assert.equal(filterExplorePois(catalog, { ...options, search: '  DINH DOC LAP  ' }).length, 1);
  assert.equal(filterExplorePois(catalog, { ...options, search: 'nam ky khoi nghia' }).length, 1);
  assert.equal(filterExplorePois(catalog, { ...options, search: 'khong ton tai' }).length, 0);
});

test('category remains active for nearby results and global search; blank search keeps radius restriction', () => {
  const catalog = [poi('near museum', 100), poi('far museum', 10000), poi('near market', 300, { category: 'market' })];
  assert.deepEqual(filterExplorePois(catalog, { ...options, category: 'history', search: '   ' }).map(item => item.poi.id), ['near museum']);
  assert.deepEqual(filterExplorePois(catalog, { ...options, category: 'history', search: 'museum' }).map(item => item.poi.id), ['near museum', 'far museum']);
});

test('no GPS or invalid coordinates do not expose the full explore list', () => {
  const catalog = [poi('valid', 100), poi('invalid', 0, { latitude: 91 }), poi('NaN', 0, { longitude: NaN })];
  for (const position of [null, { latitude: NaN, longitude: 0 }, { latitude: 0, longitude: 181 }]) {
    assert.deepEqual(filterExplorePois(catalog, { ...options, position }), []);
  }
  assert.deepEqual(filterExplorePois(catalog, options).map(item => item.poi.id), ['valid']);
  assert.deepEqual(filterExplorePois(catalog, { ...options, search: 'invalid' }), []);
});

test('distance calculation handles identical and antipodal points without NaN', () => {
  assert.equal(distanceMeters(origin, origin), 0);
  assert.ok(Math.abs(distanceMeters(origin, { latitude: 0, longitude: 180 })! - Math.PI * 6371000) < 0.001);
  assert.equal(distanceMeters(origin, { latitude: Infinity, longitude: 0 }), null);
});
