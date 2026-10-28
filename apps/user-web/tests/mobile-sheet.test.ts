import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { act, createElement, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { MobileSheet, type MobileSheetHandle } from '../src/features/layout/MobileSheet.js';

async function mount(t: TestContext, width = 390) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  const previous = { window: globalThis.window, document: globalThis.document,
    reactAct: (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT };
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(dom.window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(dom.window, 'innerHeight', { value: 800, configurable: true });
  const root = createRoot(document.getElementById('root')!);
  const ref = createRef<MobileSheetHandle>();
  await act(() => root.render(createElement('div', { className: 'app' },
    createElement(MobileSheet, { ref, children: createElement('input', { 'aria-label': 'Tìm địa điểm', defaultValue: 'Bến Thành' }) }))));
  const app = document.querySelector<HTMLElement>('.app')!;
  const sheet = document.querySelector<HTMLElement>('.mobile-sheet')!;
  const handle = document.querySelector<HTMLButtonElement>('.sheet-handle')!;
  const input = document.querySelector<HTMLInputElement>('input')!;
  // JSDOM does not implement pointer capture or the legacy input-event shim.
  const captures = new Set<number>();
  handle.setPointerCapture = id => { captures.add(id); };
  handle.hasPointerCapture = id => captures.has(id);
  handle.releasePointerCapture = id => { captures.delete(id); };
  Object.assign(input, { attachEvent() {}, detachEvent() {} });
  t.after(async () => {
    await act(() => root.unmount());
    assert.equal(app.style.getPropertyValue('--mobile-sheet-height'), '');
    Object.assign(globalThis, { window: previous.window, document: previous.document, IS_REACT_ACT_ENVIRONMENT: previous.reactAct });
    dom.window.close();
  });
  async function pointer(type: string, y: number, time: number, id = 1, target: HTMLElement = handle) {
    const event = new dom.window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientY: y });
    Object.defineProperties(event, { pointerId: { value: id }, isPrimary: { value: true }, timeStamp: { value: time } });
    await act(() => { target.dispatchEvent(event); });
  }
  async function click(detail = 1) { await act(() => { handle.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, detail })); }); }
  async function key(value: string) { await act(() => { handle.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: value, bubbles: true })); }); }
  function state(value: 'expanded' | 'collapsed') {
    assert.equal(sheet.dataset.sheetState, value);
    assert.equal(handle.getAttribute('aria-expanded'), String(value === 'expanded'));
    assert.equal(app.style.getPropertyValue('--mobile-sheet-height'), value === 'expanded' ? '100dvh' : '25dvh');
  }
  return { dom, app, sheet, handle, input, ref, captures, pointer, click, key, state };
}

test('sheet starts at one quarter and supports accessible button, keyboard and imperative controls', async t => {
  const f = await mount(t);
  f.state('collapsed');
  assert.equal(f.handle.getAttribute('aria-controls'), 'sidebar-content');
  await f.click(); f.state('expanded');
  await f.key('ArrowDown'); f.state('collapsed');
  await f.key('ArrowUp'); f.state('expanded');
  await f.key('Home'); f.state('collapsed');
  await f.key('End'); f.state('expanded');
  await act(() => f.ref.current!.collapse()); f.state('collapsed');
  await act(() => f.ref.current!.expand()); f.state('expanded');
});

test('focusing the search field expands the sheet without losing entered content', async t => {
  const f = await mount(t);
  await act(() => { f.input.focus(); }); f.state('expanded');
  await act(() => f.ref.current!.collapse());
  await f.click(0); f.state('expanded');
  assert.equal(f.input.value, 'Bến Thành');
});

test('drag snaps up and down, and the following pointer click does not toggle it back', async t => {
  const f = await mount(t);
  await f.pointer('pointerdown', 700, 1000);
  assert.equal(f.app.dataset.sheetDragging, 'true');
  assert.ok(f.captures.has(1));
  await f.pointer('pointermove', 100, 1500);
  await f.pointer('pointerup', 100, 1700); f.state('expanded');
  assert.equal(f.app.dataset.sheetDragging, 'false');
  assert.equal(f.captures.size, 0);
  await f.click(); f.state('expanded');
  await f.pointer('pointerdown', 100, 2000);
  await f.pointer('pointermove', 700, 2500);
  await f.pointer('pointerup', 700, 2700); f.state('collapsed');
  await f.click(); f.state('collapsed');
  await f.click(); f.state('expanded');
});

test('cancelled gestures settle to a snap point and unrelated pointers do not move the sheet', async t => {
  const f = await mount(t);
  await f.pointer('pointerdown', 700, 1000);
  await f.pointer('pointermove', 50, 1200, 2);
  assert.equal(f.app.style.getPropertyValue('--mobile-sheet-height'), '25dvh');
  await f.pointer('pointermove', 500, 1400);
  assert.equal(f.app.style.getPropertyValue('--mobile-sheet-height'), '50dvh');
  await f.pointer('pointercancel', 500, 1500); f.state('collapsed');
  assert.equal(f.captures.size, 0);
  assert.equal(f.app.dataset.sheetDragging, 'false');
  await act(() => f.ref.current!.expand());
  await f.pointer('pointerdown', 100, 2000);
  await f.pointer('pointermove', 300, 2400);
  await f.pointer('lostpointercapture', 300, 2500); f.state('expanded');
});

test('scrolling or touching content does not drag the sheet and desktop ignores handle drags', async t => {
  const f = await mount(t, 1024);
  await f.pointer('pointerdown', 700, 1000);
  await f.pointer('pointermove', 50, 1400);
  await f.pointer('pointerup', 50, 1500); f.state('collapsed');
  assert.equal(f.captures.size, 0);
  Object.defineProperty(f.dom.window, 'innerWidth', { value: 390, configurable: true });
  await f.pointer('pointerdown', 700, 2000, 1, f.input);
  await f.pointer('pointermove', 50, 2400, 1, f.input);
  await f.pointer('pointerup', 50, 2500, 1, f.input); f.state('collapsed');
});
