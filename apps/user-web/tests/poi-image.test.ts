import assert from 'node:assert/strict';
import { test } from 'node:test';
import { httpsUrl, placeholderImage, poiImageUrl } from '../src/features/poi/image-url.js';

test('POI images support bundled photos and HTTPS URLs', () => {
  assert.equal(poiImageUrl('/images/pois/ben-thanh.jpg'), '/images/pois/ben-thanh.jpg');
  assert.equal(poiImageUrl('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
  const databaseImage = '/api/pois/11111111-1111-4111-8111-111111111111/image';
  assert.equal(poiImageUrl(databaseImage), databaseImage);
});

test('missing, insecure and malformed image URLs use the placeholder', () => {
  for (const value of [null, undefined, '', '//example.com/photo.jpg', '/\\example.com/photo.jpg', 'javascript:alert(1)', 'http://example.com/a.jpg', 'https://user:password@example.com/a.jpg', '/api/pois/bad/image', '/api/pois/11111111-1111-4111-8111-111111111111/image?redirect=evil']) {
    assert.equal(poiImageUrl(value), placeholderImage);
  }
});

test('photo credit links reject script URLs and local paths', () => {
  assert.equal(httpsUrl('https://creativecommons.org/licenses/by/2.0/'), 'https://creativecommons.org/licenses/by/2.0/');
  assert.equal(httpsUrl('javascript:alert(1)'), null);
  assert.equal(httpsUrl('/images/credit'), null);
});
