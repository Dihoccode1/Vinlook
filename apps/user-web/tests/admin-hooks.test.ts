import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { useUserManagement } from '../../admin-web/src/features/users/useUserManagement';
import { usePoiForm } from '../../admin-web/src/features/pois/usePoiForm';

async function mount<T>(t: TestContext, hook: () => T, fetcher: typeof fetch) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    fetch: globalThis.fetch,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    fetch: fetcher,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  let state: T;
  function Harness() {
    state = hook();
    return null;
  }
  const root = createRoot(document.getElementById('root')!);
  t.after(async () => {
    await act(() => root.unmount());
    Object.assign(globalThis, previous, { IS_REACT_ACT_ENVIRONMENT: false });
    dom.window.close();
  });
  await act(() => root.render(createElement(Harness)));
  return () => state!;
}

test('extracted account controller loads, edits and locks accounts with the same API payloads', async (t) => {
  const user = {
    id: 'USR003',
    username: 'staff',
    full_name: 'Staff',
    role: 'staff' as const,
    status: 'active' as const,
    login_locked: false,
    created_at: '',
  };
  const writes: { url: string; body: unknown }[] = [];
  const state = await mount(
    t,
    () =>
      useUserManagement({
        current_user: { id: 'USR001', username: 'admin' },
        on_password_changed: () => {},
      }),
    async (url, init) => {
      if (init?.method) {
        writes.push({ url: String(url), body: JSON.parse(String(init.body)) });
        return Response.json({ data: { id: user.id, status: 'disabled' } });
      }
      return Response.json({ data: [user] });
    },
  );
  assert.equal(state().filtered.length, 1);
  await act(() => state().edit(user));
  await act(() => state().set_form({ ...state().form, full_name: 'Updated Staff' }));
  await act(() => state().save({ preventDefault() {} } as never));
  assert.deepEqual(writes[0], {
    url: '/api/admin/users/USR003',
    body: { username: 'staff', full_name: 'Updated Staff', role: 'staff', status: 'active' },
  });
  assert.equal(state().modal_open, false);
  await act(() => state().change_status(user));
  assert.deepEqual(writes[1], {
    url: '/api/admin/users/USR003/status',
    body: { status: 'disabled' },
  });
});

test('extracted POI form validates coordinates and preserves the creation payload', async (t) => {
  const writes: unknown[] = [];
  let saved = 0;
  const state = await mount(
    t,
    () =>
      usePoiForm({
        poi: null,
        on_close: () => {},
        on_saved: () => {
          saved++;
        },
      }),
    async (_url, init) => {
      writes.push(JSON.parse(String(init?.body)));
      return Response.json({ data: { id: 'POI999' } });
    },
  );
  await act(() => state().save({ preventDefault() {} } as never));
  // Match the original form behavior: explicit out-of-range coordinates are rejected.
  writes.length = 0;
  saved = 0;
  await act(() => state().set('latitude', '100'));
  await act(() => state().save({ preventDefault() {} } as never));
  assert.equal(writes.length, 0);
  assert.match(state().error, /Tọa độ không hợp lệ/);
  await act(() =>
    state().set_form({
      ...state().form,
      name: 'Test POI',
      address: 'Test address',
      latitude: '10.77',
      longitude: '106.69',
      description: 'Narration',
      visitor_description: 'Introduction',
    }),
  );
  await act(() => state().save({ preventDefault() {} } as never));
  assert.deepEqual(writes[0], {
    name: 'Test POI',
    description: 'Narration',
    visitor_description: 'Introduction',
    address: 'Test address',
    category: 'architecture',
    source_language: 'vi',
    is_published: false,
    latitude: 10.77,
    longitude: 106.69,
    image_credit: null,
    image_source_url: null,
    image_license_url: null,
  });
  assert.equal(saved, 1);
});
