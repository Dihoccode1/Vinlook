import assert from 'node:assert/strict';
import { test } from 'node:test';
import { https_url, placeholder_image, poi_image_url } from '../src/features/poi/image-url.js';

test('POI images support bundled photos and HTTPS URLs', () => {
  assert.equal(poi_image_url('/images/pois/ben-thanh.jpg'), '/images/pois/ben-thanh.jpg');
  assert.equal(poi_image_url('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
  const database_image = '/api/pois/11111111-1111-4111-8111-111111111111/image';
  assert.equal(poi_image_url(database_image), database_image);
});

test('missing, insecure and malformed image URLs use the placeholder', () => {
  for (const value of [null, undefined, '', '//example.com/photo.jpg', '/\\example.com/photo.jpg', 'javascript:alert(1)', 'http://example.com/a.jpg', 'https://user:password@example.com/a.jpg', '/api/pois/bad/image', '/api/pois/11111111-1111-4111-8111-111111111111/image?redirect=evil']) {
    assert.equal(poi_image_url(value), placeholder_image);
  }
});

test('photo credit links reject script URLs and local paths', () => {
  assert.equal(https_url('https://creativecommons.org/licenses/by/2.0/'), 'https://creativecommons.org/licenses/by/2.0/');
  assert.equal(https_url('javascript:alert(1)'), null);
  assert.equal(https_url('/images/credit'), null);
});
