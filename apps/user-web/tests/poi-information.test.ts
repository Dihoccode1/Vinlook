import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PoiTranslation } from '../src/features/translation/PoiTranslation';
import type { Poi } from '../src/types/poi';

const poi: Poi = { id: 'POI001', slug: 'museum', name: 'Bảo tàng', description: 'KỊCH BẢN AUDIO KHÔNG HIỂN THỊ', visitor_description: 'Giới thiệu cho khách đọc.', address: '97 Phó Đức Chính', latitude: 10.77, longitude: 106.7, category: 'history', source_language: 'vi', image_url: null, image_credit: null, image_source_url: null, image_license_url: null };
test('POI card displays visitor information and never renders the audio script', () => {
  const markup = renderToStaticMarkup(createElement(PoiTranslation, { poi, language: 'vi', on_language: () => {} }));
  assert.ok(markup.includes('Giới thiệu cho khách đọc.'));
  assert.ok(markup.includes('97 Phó Đức Chính'));
  assert.ok(markup.includes('Nghe thuyết minh'));
  assert.ok(!markup.includes(poi.description));
});
test('POI without an introduction shows basic place information instead of falling back to narration', () => {
  const markup = renderToStaticMarkup(createElement(PoiTranslation, { poi: { ...poi, visitor_description: '' }, language: 'vi', on_language: () => {} }));
  assert.ok(markup.includes('Thông tin địa điểm'));
  assert.ok(!markup.includes(poi.description));
});
