import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import type { Poi } from '../src/types/poi.js';

function setup_dom(t: TestContext) {
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

function find_button_by_text(doc: Document, label: string): HTMLButtonElement {
  const button = Array.from(doc.querySelectorAll('button')).find(
    (item) => item.textContent?.trim() === label,
  );
  assert.ok(button, `Expected button "${label}" to render`);
  return button;
}

const sample_stops: Poi[] = [
  {
    id: 'POI001',
    name: 'Chợ Bến Thành',
    description: 'Chợ trung tâm.',
    address: 'Quận 1, TP. Hồ Chí Minh',
    latitude: 10.7725,
    longitude: 106.698,
    category: 'market',
    source_language: 'vi',
    image_url: null,
    image_credit: null,
    image_source_url: null,
    image_license_url: null,
  },
  {
    id: 'POI002',
    name: 'Nhà hát Thành phố',
    description: 'Kiến trúc cổ điển.',
    address: 'Quận 1, TP. Hồ Chí Minh',
    latitude: 10.7769,
    longitude: 106.7032,
    category: 'architecture',
    source_language: 'vi',
    image_url: null,
    image_credit: null,
    image_source_url: null,
    image_license_url: null,
  },
];

test('LocationPermissionDialog triggers allow, later, and Escape actions cleanly', async (t) => {
  const { dom, root } = setup_dom(t);
  const { LocationPermissionDialog } =
    await import('../src/features/tracking/LocationPermissionDialog.js');
  let allow_count = 0;
  let later_count = 0;

  await act(async () => {
    root.render(
      createElement(LocationPermissionDialog, {
        on_allow: () => {
          allow_count += 1;
        },
        on_later: () => {
          later_count += 1;
        },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  const doc = dom.window.document;
  assert.match(doc.body.textContent ?? '', /Khám phá địa điểm gần bạn/);

  await act(async () => {
    find_button_by_text(doc, 'Cho phép định vị').click();
    find_button_by_text(doc, 'Để sau').click();
  });
  assert.equal(allow_count, 1);
  assert.equal(later_count, 1);

  await act(async () => {
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  assert.equal(later_count, 2);
});

test('RouteStopOrderDialog reorders stops, surfaces stale-list error, and handles Escape', async (t) => {
  const { dom, root } = setup_dom(t);
  const { RouteStopOrderDialog } =
    await import('../src/features/navigation/RouteStopOrderDialog.js');
  let applied_orders: string[][] = [];
  let accept_apply = false;
  let close_count = 0;

  await act(async () => {
    root.render(
      createElement(RouteStopOrderDialog, {
        stops: sample_stops,
        origin_label: 'Vị trí của bạn',
        on_apply: (ids) => {
          applied_orders.push(ids);
          return accept_apply;
        },
        on_close: () => {
          close_count += 1;
        },
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  const doc = dom.window.document;
  assert.match(doc.body.textContent ?? '', /Sắp xếp lộ trình/);
  assert.match(doc.body.textContent ?? '', /2 điểm dừng/);

  await act(async () => {
    find_button_by_text(doc, 'Đảo thứ tự').click();
  });

  const names_after_reverse = Array.from(doc.querySelectorAll('ol strong')).map(
    (node) => node.textContent,
  );
  assert.deepEqual(names_after_reverse, ['Nhà hát Thành phố', 'Chợ Bến Thành']);

  await act(async () => {
    find_button_by_text(doc, 'Áp dụng & vẽ đường').click();
  });
  assert.deepEqual(applied_orders, [['POI002', 'POI001']]);
  assert.equal(close_count, 0);
  assert.match(
    doc.querySelector('[role="alert"]')?.textContent ?? '',
    /Danh sách điểm dừng đã thay đổi/,
  );

  accept_apply = true;
  await act(async () => {
    find_button_by_text(doc, 'Khôi phục').click();
  });
  assert.equal(doc.querySelector('[role="alert"]'), null);

  await act(async () => {
    find_button_by_text(doc, 'Áp dụng & vẽ đường').click();
  });
  assert.deepEqual(applied_orders[1], ['POI001', 'POI002']);
  assert.equal(close_count, 1);

  await act(async () => {
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
  assert.equal(close_count, 2);
});
