/**
 * @file admin.test.ts
 * @description Kiểm thử đơn vị cho các hàm tiện ích QR, danh mục và dịch vụ gọi API của trang quản trị (Admin Web).
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { api, categories } from '../src/services/api.js';
import { default_public_url, qr_link } from '../src/services/qr.js';

const valid_token = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

test('qr_link builds public QR URLs and rejects invalid origins or tokens', () => {
  assert.equal(qr_link('https://vinlook.vn', valid_token), `https://vinlook.vn/qr/${valid_token}`);
  assert.equal(qr_link('http://localhost:5173/', valid_token), `http://localhost:5173/qr/${valid_token}`);

  for (const invalid_base of [
    'ftp://vinlook.vn',
    'https://user:pass@vinlook.vn',
    'https://vinlook.vn/subpath',
    'https://vinlook.vn?query=1',
    'https://vinlook.vn#hash'
  ]) {
    assert.throws(() => qr_link(invalid_base, valid_token), /Nhập địa chỉ gốc/);
  }

  for (const invalid_token of ['short', 'G'.repeat(32), 'a'.repeat(31), 'a'.repeat(33)]) {
    assert.throws(() => qr_link('https://vinlook.vn', invalid_token), /Nhập địa chỉ gốc/);
  }
});

test('default_public_url maps admin dev port 5174 to user-web port 5173 unless configured', () => {
  assert.equal(default_public_url('http://localhost:5174'), 'http://localhost:5173');
  assert.equal(default_public_url('https://admin.vinlook.vn'), 'https://admin.vinlook.vn');
  assert.equal(default_public_url('http://localhost:5174', 'https://vinlook.vn'), 'https://vinlook.vn');
});

test('categories dictionary exposes Vietnamese labels for all standard POI categories', () => {
  assert.deepEqual(Object.keys(categories), ['market', 'history', 'architecture']);
  assert.equal(categories.market, 'Chợ & mua sắm');
});

test('api client attaches x-vinlook-admin header, dispatches session-expired event on 401 and surfaces errors', async () => {
  const original_fetch = globalThis.fetch;
  const original_window = globalThis.window;
  let expired_events = 0;

  const fake_target = new EventTarget();
  fake_target.addEventListener('admin-session-expired', () => {
    expired_events++;
  });
  Object.defineProperty(globalThis, 'window', { value: fake_target, configurable: true });

  try {
    let seen_header: string | null = null;
    let seen_url = '';
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seen_url = String(input);
      seen_header = new Headers(init?.headers).get('x-vinlook-admin');
      return Response.json({ data: { ok: true } }, { status: 200 });
    }) as typeof fetch;

    const res = await api<{ data: { ok: boolean } }>('/stats');
    assert.equal(seen_url, '/api/admin/stats');
    assert.equal(seen_header, '1');
    assert.equal(res.data.ok, true);

    globalThis.fetch = (async () =>
      Response.json({ error: { message: 'Hết phiên đăng nhập.' } }, { status: 401 })) as typeof fetch;
    await assert.rejects(() => api('/stats'), /Hết phiên đăng nhập\./);
    assert.equal(expired_events, 1);

    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as typeof fetch;
    await assert.rejects(() => api('/stats'), /Không kết nối được máy chủ/);
  } finally {
    globalThis.fetch = original_fetch;
    Object.defineProperty(globalThis, 'window', { value: original_window, configurable: true });
  }
});
