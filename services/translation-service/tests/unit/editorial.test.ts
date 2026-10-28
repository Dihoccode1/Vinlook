import test from 'node:test';
import assert from 'node:assert/strict';
import { saigonPois } from '../../src/content/saigon-pois.js';
import { editorialLocales, renderEditorial } from '../../src/content/editorial-locales.js';
import { languages } from '../../src/modules/languages/languages.js';

test('editorial catalog adds 17 unique POIs with complete supported language coverage', () => {
  assert.equal(saigonPois.length, 17);
  assert.equal(new Set(saigonPois.map(poi => poi.slug)).size, 17);
  assert.deepEqual(Object.keys(editorialLocales).sort(), languages.map(language => language.code).sort());
  for (const poi of saigonPois) {
    assert.ok(poi.latitude > 10.7 && poi.latitude < 10.9);
    assert.ok(poi.longitude > 106.6 && poi.longitude < 106.8);
    for (const language of languages) {
      const text = renderEditorial(poi, language.code);
      assert.ok(text.includes(poi.name) && text.includes(poi.address));
      assert.ok(text.length > 500 && text.length <= 20000);
      assert.ok(!text.includes('undefined') && !text.includes('\\n'));
      assert.ok(text.split('\n\n').length >= 6);
    }
  }
});
