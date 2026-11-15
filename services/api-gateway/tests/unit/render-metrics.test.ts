import test from 'node:test';
import assert from 'node:assert/strict';
import {
  create_render_metrics_reader,
  fetch_render_metrics,
  read_render_metrics_config,
} from '../../src/modules/monitor/render-metrics.js';

const test_env = {
  RENDER_API_KEY: 'rnd_secret_token_do_not_leak',
  RENDER_SERVICE_ID: 'srv-dbqrsgk9v7es73dfj1n0',
};

test('read_render_metrics_config validates missing and malformed env vars', () => {
  const missing_all = read_render_metrics_config({});
  assert.equal(missing_all.ok, false);
  if (!missing_all.ok) {
    assert.match(missing_all.message, /RENDER_API_KEY/);
    assert.match(missing_all.message, /RENDER_SERVICE_ID/);
  }

  const bad_id = read_render_metrics_config({
    RENDER_API_KEY: 'rnd_key',
    RENDER_SERVICE_ID: 'srv/../../bad',
  });
  assert.equal(bad_id.ok, false);
});

test('fetch_render_metrics returns unconfigured without calling Render when env vars are absent', async () => {
  let called = false;
  const result = await fetch_render_metrics({
    env: {},
    fetcher: async () => {
      called = true;
      return Response.json([]);
    },
  });
  assert.equal(called, false);
  assert.equal(result.status, 'unconfigured');
  assert.equal(result.cpu_percent, null);
  assert.equal(result.memory_used_mib, null);
  assert.equal(result.memory_limit_mib, null);
  assert.match(result.message ?? '', /RENDER_API_KEY/);
});

test('fetch_render_metrics parses Render CPU cores/limit, RAM bytes/MiB, RAM limit and latest timestamp', async () => {
  const seen_urls: string[] = [];
  const snapshot = await fetch_render_metrics({
    env: test_env,
    now: () => Date.parse('2026-11-15T10:00:00.000Z'),
    fetcher: async (url, init) => {
      const target = new URL(String(url));
      seen_urls.push(target.pathname);
      assert.equal(target.searchParams.get('resource'), test_env.RENDER_SERVICE_ID);
      assert.equal(target.searchParams.get('resolutionSeconds'), '60');
      assert.ok(target.searchParams.get('startTime'));
      assert.ok(target.searchParams.get('endTime'));
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Authorization'), `Bearer ${test_env.RENDER_API_KEY}`);

      if (target.pathname.endsWith('/metrics/cpu')) {
        return Response.json([
          {
            labels: [{ field: 'resource', value: test_env.RENDER_SERVICE_ID }],
            unit: 'cores',
            values: [
              { timestamp: '2026-11-15T09:58:00Z', value: 0.05 },
              { timestamp: '2026-11-15T09:59:00Z', value: 0.125 },
            ],
          },
        ]);
      }
      if (target.pathname.endsWith('/metrics/cpu-limit')) {
        return Response.json([
          {
            unit: 'cores',
            values: [{ timestamp: '2026-11-15T09:59:00Z', value: 0.5 }],
          },
        ]);
      }
      if (target.pathname.endsWith('/metrics/memory')) {
        return Response.json([
          {
            unit: 'bytes',
            values: [{ timestamp: '2026-11-15T09:59:30Z', value: 256.4 * 1024 * 1024 }],
          },
        ]);
      }
      if (target.pathname.endsWith('/metrics/memory-limit')) {
        return Response.json([
          {
            unit: 'MiB',
            values: [{ timestamp: '2026-11-15T09:59:00Z', value: 512 }],
          },
        ]);
      }
      throw new Error(`Unexpected endpoint: ${target.pathname}`);
    },
  });

  assert.equal(seen_urls.length, 4);
  assert.equal(snapshot.status, 'ok');
  assert.equal(snapshot.cpu_percent, 25);
  assert.equal(snapshot.memory_used_mib, 256.4);
  assert.equal(snapshot.memory_limit_mib, 512);
  assert.equal(snapshot.updated_at, '2026-11-15T09:59:30.000Z');
  assert.equal(snapshot.message, null);
});

test('fetch_render_metrics preserves explicit numeric 0 values and handles optional memory limit', async () => {
  const snapshot = await fetch_render_metrics({
    env: test_env,
    fetcher: async (url) => {
      const pathname = new URL(String(url)).pathname;
      if (pathname.endsWith('/metrics/cpu')) {
        return Response.json([
          { unit: '%', values: [{ timestamp: '2026-11-15T10:00:00Z', value: 0 }] },
        ]);
      }
      if (pathname.endsWith('/metrics/memory')) {
        return Response.json([
          { unit: 'bytes', values: [{ timestamp: '2026-11-15T10:00:00Z', value: 0 }] },
        ]);
      }
      if (pathname.endsWith('/metrics/memory-limit')) {
        return Response.json({ error: 'unsupported' }, { status: 400 });
      }
      return Response.json([]);
    },
  });

  assert.equal(snapshot.status, 'ok');
  assert.equal(snapshot.cpu_percent, 0);
  assert.equal(snapshot.memory_used_mib, 0);
  assert.equal(snapshot.memory_limit_mib, null);
});

test('fetch_render_metrics returns empty when Render has no datapoints yet', async () => {
  const snapshot = await fetch_render_metrics({
    env: test_env,
    fetcher: async () => Response.json([{ labels: [], values: [] }]),
  });

  assert.equal(snapshot.status, 'empty');
  assert.equal(snapshot.cpu_percent, null);
  assert.equal(snapshot.memory_used_mib, null);
  assert.equal(snapshot.memory_limit_mib, null);
  assert.match(snapshot.message ?? '', /chưa có số liệu/i);
});

test('fetch_render_metrics maps HTTP and network errors safely without leaking RENDER_API_KEY', async () => {
  for (const status of [401, 404, 429, 500]) {
    const result = await fetch_render_metrics({
      env: test_env,
      fetcher: async () => Response.json({ token: test_env.RENDER_API_KEY }, { status }),
    });
    assert.equal(result.status, 'error');
    assert.equal(result.cpu_percent, null);
    assert.equal(result.memory_used_mib, null);
    assert.ok(!(result.message ?? '').includes(test_env.RENDER_API_KEY));
  }

  const network_error = await fetch_render_metrics({
    env: test_env,
    fetcher: async () => {
      throw new Error(`request failed with ${test_env.RENDER_API_KEY}`);
    },
  });
  assert.equal(network_error.status, 'error');
  assert.ok(!(network_error.message ?? '').includes(test_env.RENDER_API_KEY));
});

test('create_render_metrics_reader caches within TTL, deduplicates concurrent calls, and uses shorter TTL for errors', async () => {
  let now_ms = 1_000_000;
  let fetch_calls = 0;
  let should_fail = false;

  const read = create_render_metrics_reader({
    env: test_env,
    now: () => now_ms,
    cache_ttl_ms: 30_000,
    error_cache_ttl_ms: 15_000,
    fetcher: async (url) => {
      fetch_calls++;
      if (should_fail) return Response.json({}, { status: 503 });
      const pathname = new URL(String(url)).pathname;
      if (pathname.endsWith('/metrics/cpu')) {
        return Response.json([
          { unit: '%', values: [{ timestamp: '2026-11-15T10:00:00Z', value: 14.2 }] },
        ]);
      }
      if (pathname.endsWith('/metrics/memory')) {
        return Response.json([
          { unit: 'MiB', values: [{ timestamp: '2026-11-15T10:00:00Z', value: 128 }] },
        ]);
      }
      return Response.json([]);
    },
  });

  const [first, second] = await Promise.all([read(), read()]);
  assert.equal(fetch_calls, 4);
  assert.equal(first.status, 'ok');
  assert.equal(second.cpu_percent, 14.2);

  now_ms += 10_000;
  await read();
  assert.equal(fetch_calls, 4);

  now_ms += 25_000;
  should_fail = true;
  const err_snapshot = await read();
  assert.equal(err_snapshot.status, 'error');
  assert.equal(fetch_calls, 8);

  now_ms += 10_000;
  await read();
  assert.equal(fetch_calls, 8);

  now_ms += 6_000;
  should_fail = false;
  const recovered = await read();
  assert.equal(recovered.status, 'ok');
  assert.equal(fetch_calls, 12);
});
