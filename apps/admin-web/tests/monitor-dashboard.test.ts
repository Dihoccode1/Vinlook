import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { MonitorDashboard } from '../src/features/overview/MonitorDashboard';
import type { RenderMetrics } from '../src/features/overview/useMonitorDashboard';

async function mount_dashboard(
  t: TestContext,
  render_metrics: RenderMetrics | undefined,
): Promise<HTMLElement> {
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
    IS_REACT_ACT_ENVIRONMENT: true,
    fetch: async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/admin/monitor')) {
        return Response.json({
          data: {
            checked_at: '2026-11-15T10:00:00.000Z',
            uptime_seconds: 600,
            services: [
              {
                id: 'api-gateway',
                name: 'API Gateway',
                status: 'healthy',
                latency_ms: null,
                database: null,
              },
              {
                id: 'poi-service',
                name: 'POI Service',
                status: 'healthy',
                latency_ms: 12,
                database: 'PoiDb',
              },
            ],
            ...(render_metrics ? { render_metrics } : {}),
          },
        });
      }
      if (url.endsWith('/api/admin/monitor/delivery')) {
        return Response.json({
          data: {
            checked_at: '2026-11-15T10:00:00.000Z',
            ci: { state: 'completed', conclusion: 'success' },
            cd: { state: 'idle' },
          },
        });
      }
      if (url.endsWith('/api/admin/monitor/events')) {
        return Response.json({
          data: { system: [], usage: [] },
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    },
  });

  const container = document.getElementById('root')!;
  const root = createRoot(container);
  t.after(async () => {
    await act(() => root.unmount());
    Object.assign(globalThis, previous, { IS_REACT_ACT_ENVIRONMENT: false });
    dom.window.close();
  });

  await act(async () => {
    root.render(createElement(MonitorDashboard));
  });
  await act(async () => {
    await Promise.resolve();
  });

  return container;
}

test('MonitorDashboard renders real Render CPU, RAM, limit, timestamp and preserves latency', async (t) => {
  const container = await mount_dashboard(t, {
    status: 'ok',
    cpu_percent: 12.5,
    memory_used_mib: 256.4,
    memory_limit_mib: 512,
    updated_at: '2026-11-15T10:00:00.000Z',
    checked_at: '2026-11-15T10:00:05.000Z',
    message: null,
  });

  const labels = Array.from(
    container.querySelectorAll('[aria-label="Giám sát trực tiếp"] article > div:first-child'),
  ).map((el) => el.textContent);
  assert.deepEqual(labels, ['Dịch vụ sẵn sàng', 'CPU', 'RAM']);
  const text = container.textContent ?? '';
  assert.match(text, /12\.5%/);
  assert.match(text, /256\.4 MiB/);
  assert.match(text, /Giới hạn 512 MiB/);
  assert.match(text, /Cập nhật lúc/);
  assert.match(text, /12 ms/);
  assert.equal(container.querySelector('[role="status"], [role="alert"]'), null);
});

test('MonitorDashboard displays exact 0% and 0 MiB when Render returns numeric 0 and omits absent RAM limit', async (t) => {
  const container = await mount_dashboard(t, {
    status: 'ok',
    cpu_percent: 0,
    memory_used_mib: 0,
    memory_limit_mib: null,
    updated_at: '2026-11-15T10:00:00.000Z',
    checked_at: '2026-11-15T10:00:00.000Z',
    message: null,
  });

  const metric_values = Array.from(
    container.querySelectorAll('[aria-label="Giám sát trực tiếp"] article strong'),
  ).map((el) => el.textContent);
  assert.deepEqual(metric_values, ['2/2', '0%', '0 MiB']);
  assert.doesNotMatch(container.textContent ?? '', /Giới hạn/);
});

test('MonitorDashboard shows unconfigured notice without faking 0', async (t) => {
  const unconfigured = await mount_dashboard(t, {
    status: 'unconfigured',
    cpu_percent: null,
    memory_used_mib: null,
    memory_limit_mib: null,
    updated_at: null,
    checked_at: '2026-11-15T10:00:00.000Z',
    message:
      'Chưa cấu hình RENDER_API_KEY và RENDER_SERVICE_ID trên máy chủ để đọc số liệu Render.',
  });
  const unconf_values = Array.from(
    unconfigured.querySelectorAll('[aria-label="Giám sát trực tiếp"] article strong'),
  ).map((el) => el.textContent);
  assert.deepEqual(unconf_values, ['2/2', '—', '—']);
  assert.match(unconfigured.textContent ?? '', /Chưa cấu hình Render Metrics/);
  assert.match(unconfigured.textContent ?? '', /Chưa cấu hình RENDER_API_KEY/);
  assert.equal(
    unconfigured.querySelector('[role="status"]')?.textContent?.includes('RENDER_API_KEY'),
    true,
  );
  assert.match(unconfigured.textContent ?? '', /12 ms/);
});

test('MonitorDashboard shows empty notice when Render has no metrics yet', async (t) => {
  const empty = await mount_dashboard(t, {
    status: 'empty',
    cpu_percent: null,
    memory_used_mib: null,
    memory_limit_mib: null,
    updated_at: null,
    checked_at: '2026-11-15T10:00:00.000Z',
    message: 'Render chưa có số liệu CPU/RAM cho vinlook-api trong 15 phút gần đây.',
  });
  const empty_values = Array.from(
    empty.querySelectorAll('[aria-label="Giám sát trực tiếp"] article strong'),
  ).map((el) => el.textContent);
  assert.deepEqual(empty_values, ['2/2', '—', '—']);
  assert.match(empty.textContent ?? '', /Render chưa có số liệu/);
  assert.equal(
    empty.querySelector('[role="status"]')?.textContent?.includes('Render chưa có số liệu'),
    true,
  );
  assert.match(empty.textContent ?? '', /12 ms/);
});

test('MonitorDashboard shows error alert when Render Metrics API fails without faking 0', async (t) => {
  const api_error = await mount_dashboard(t, {
    status: 'error',
    cpu_percent: null,
    memory_used_mib: null,
    memory_limit_mib: null,
    updated_at: null,
    checked_at: '2026-11-15T10:00:00.000Z',
    message: 'Không lấy được số liệu CPU/RAM từ Render Metrics API.',
  });
  const err_values = Array.from(
    api_error.querySelectorAll('[aria-label="Giám sát trực tiếp"] article strong'),
  ).map((el) => el.textContent);
  assert.deepEqual(err_values, ['2/2', '—', '—']);
  assert.match(
    api_error.textContent ?? '',
    /Không lấy được số liệu CPU\/RAM từ Render Metrics API/,
  );
  assert.equal(
    api_error.querySelector('[role="alert"]')?.textContent?.includes('Render Metrics API'),
    true,
  );
  assert.match(api_error.textContent ?? '', /12 ms/);
});
