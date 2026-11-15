import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement, useState } from 'react';
import type { Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import type { Poi, User } from '../src/types';

async function setup_dom(t: TestContext) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const win = dom.window;
  const keys = [
    'window',
    'document',
    'HTMLElement',
    'Element',
    'Node',
    'NodeFilter',
    'KeyboardEvent',
    'MouseEvent',
    'FocusEvent',
    'Event',
    'CustomEvent',
    'PointerEvent',
    'MutationObserver',
    'ResizeObserver',
    'getComputedStyle',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'IS_REACT_ACT_ENVIRONMENT',
    'fetch',
  ] as const;
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const key of keys) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  }

  class NoopResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.assign(globalThis, {
    window: win,
    document: win.document,
    HTMLElement: win.HTMLElement,
    Element: win.Element,
    Node: win.Node,
    NodeFilter: win.NodeFilter,
    KeyboardEvent: win.KeyboardEvent,
    MouseEvent: win.MouseEvent,
    FocusEvent: win.FocusEvent,
    Event: win.Event,
    CustomEvent: win.CustomEvent,
    PointerEvent: (win as unknown as { PointerEvent?: typeof Event }).PointerEvent ?? win.Event,
    MutationObserver: win.MutationObserver,
    ResizeObserver: NoopResizeObserver,
    getComputedStyle: win.getComputedStyle.bind(win),
    requestAnimationFrame: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 0) as unknown as number,
    cancelAnimationFrame: (id: number) => clearTimeout(id),
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  const { createRoot } = await import('react-dom/client');
  const container = win.document.getElementById('root')!;
  const root: Root = createRoot(container);

  t.after(async () => {
    await act(async () => {
      root.unmount();
    });
    for (const [key, descriptor] of previous.entries()) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        Reflect.deleteProperty(globalThis, key);
      }
    }
    win.close();
  });

  return { dom, root };
}

function set_input_value(dom: JSDOM, input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
}

function find_button_by_text(doc: Document, label: string): HTMLButtonElement {
  const button = Array.from(doc.querySelectorAll('button')).find(
    (item) => item.textContent?.trim() === label,
  );
  assert.ok(button, `Expected button "${label}" to render`);
  return button;
}

const sample_user: User = {
  id: 'USR001',
  username: 'admin2',
  full_name: 'Quản trị viên 2',
  role: 'admin',
  status: 'active',
  login_locked: false,
  created_at: '2026-11-15T10:00:00.000Z',
};

const sample_poi: Poi = {
  id: 'POI001',
  name: 'Chợ Bến Thành',
  description: 'Khu chợ lịch sử tại trung tâm TP. Hồ Chí Minh.',
  visitor_description: 'Điểm tham quan nổi bật.',
  address: 'Đường Lê Lợi, Bến Thành, Quận 1, TP. Hồ Chí Minh',
  category: 'market',
  latitude: 10.7725,
  longitude: 106.698,
  source_language: 'vi',
  is_published: true,
  updated_at: '2026-11-15T10:00:00.000Z',
  image_url: null,
  image_credit: null,
  image_source_url: null,
  image_license_url: null,
};

test('AccountStatusDialog focuses Hủy initially, allows Escape when idle, and blocks Escape when busy', async (t) => {
  const { dom, root } = await setup_dom(t);
  const { AccountStatusDialog } = await import('../src/features/users/AccountStatusDialog');
  let cancel_count = 0;
  let confirm_count = 0;

  await act(async () => {
    root.render(
      createElement(AccountStatusDialog, {
        user: sample_user,
        is_self: true,
        busy: false,
        error: '',
        on_cancel: () => {
          cancel_count += 1;
        },
        on_confirm: () => {
          confirm_count += 1;
        },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  const doc = dom.window.document;
  assert.match(doc.body.textContent ?? '', /Khóa tài khoản đang đăng nhập\?/);
  assert.equal(doc.activeElement?.textContent?.trim(), 'Hủy');

  await act(async () => {
    find_button_by_text(doc, 'Xác nhận khóa').click();
  });
  assert.equal(confirm_count, 1);

  await act(async () => {
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  assert.equal(cancel_count, 1);

  await act(async () => {
    root.render(
      createElement(AccountStatusDialog, {
        user: { ...sample_user, status: 'disabled' },
        is_self: false,
        busy: true,
        error: '',
        on_cancel: () => {
          cancel_count += 1;
        },
        on_confirm: () => {
          confirm_count += 1;
        },
      }),
    );
  });

  assert.match(doc.body.textContent ?? '', /Mở khóa tài khoản này\?/);
  const busy_cancel = find_button_by_text(doc, 'Hủy');
  const busy_confirm = find_button_by_text(doc, 'Đang xử lý…');
  assert.equal(busy_cancel.disabled, true);
  assert.equal(busy_confirm.disabled, true);

  await act(async () => {
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  assert.equal(cancel_count, 1);
});

test('PasswordChangeDialog shows alert and focuses confirm input when passwords do not match', async (t) => {
  const { dom, root } = await setup_dom(t);
  const { PasswordChangeDialog } = await import('../src/features/users/PasswordChangeDialog');
  let fetch_calls = 0;
  Object.assign(globalThis, {
    fetch: async () => {
      fetch_calls += 1;
      throw new Error('fetch should not be called');
    },
  });

  await act(async () => {
    root.render(
      createElement(PasswordChangeDialog, {
        username: 'admin',
        on_close: () => {},
        on_saved: () => {},
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  const doc = dom.window.document;
  const inputs = Array.from(doc.querySelectorAll<HTMLInputElement>('input[type="password"]'));
  assert.equal(inputs.length, 3);

  await act(async () => {
    set_input_value(dom, inputs[0]!, 'OldPass123!');
    set_input_value(dom, inputs[1]!, 'NewPass123!');
    set_input_value(dom, inputs[2]!, 'Mismatch123!');
  });

  const form = doc.querySelector('form')!;
  await act(async () => {
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });

  const alert = doc.querySelector('[role="alert"]');
  assert.equal(alert?.textContent?.trim(), 'Xác nhận mật khẩu chưa khớp.');
  assert.equal(doc.activeElement, inputs[2]);
  assert.equal(fetch_calls, 0);
});

test('PoiEditor validates out-of-range coordinates before calling /api/pois', async (t) => {
  const { dom, root } = await setup_dom(t);
  const { PoiEditor } = await import('../src/features/pois/PoiEditor');
  let fetch_calls = 0;
  Object.assign(globalThis, {
    fetch: async () => {
      fetch_calls += 1;
      throw new Error('fetch should not be called for invalid coordinates');
    },
  });

  await act(async () => {
    root.render(
      createElement(PoiEditor, {
        poi: sample_poi,
        on_close: () => {},
        on_saved: () => {},
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  const doc = dom.window.document;
  const lat_input = Array.from(doc.querySelectorAll('label'))
    .find((label) => label.textContent?.includes('Vĩ độ (Latitude)'))
    ?.querySelector<HTMLInputElement>('input');
  assert.ok(lat_input, 'Expected latitude input inside PoiEditor');

  await act(async () => {
    set_input_value(dom, lat_input, '95');
  });

  const form = doc.querySelector('form')!;
  await act(async () => {
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  });

  const alert = doc.querySelector('[role="alert"]');
  assert.equal(
    alert?.textContent?.trim(),
    'Tọa độ không hợp lệ. Vĩ độ phải từ -90 đến 90, kinh độ từ -180 đến 180.',
  );
  assert.equal(fetch_calls, 0);
});

test('AccountStatusDialog restores focus to opener button when dismissed via Escape', async (t) => {
  const { dom, root } = await setup_dom(t);
  const { AccountStatusDialog } = await import('../src/features/users/AccountStatusDialog');

  function Harness() {
    const [open, set_open] = useState(false);
    return createElement(
      'div',
      null,
      createElement('button', { type: 'button', onClick: () => set_open(true) }, 'Khóa'),
      open
        ? createElement(AccountStatusDialog, {
            user: sample_user,
            is_self: false,
            busy: false,
            error: '',
            on_cancel: () => set_open(false),
            on_confirm: () => {},
          })
        : null,
    );
  }

  await act(async () => {
    root.render(createElement(Harness));
  });

  const doc = dom.window.document;
  const opener = find_button_by_text(doc, 'Khóa');
  await act(async () => {
    opener.focus();
    opener.click();
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  assert.equal(doc.activeElement?.textContent?.trim(), 'Hủy');

  await act(async () => {
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  assert.equal(doc.querySelector('[role="alertdialog"]'), null);
  assert.equal(doc.activeElement, opener);
});
