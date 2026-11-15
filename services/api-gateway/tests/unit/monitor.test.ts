import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { monitor_routes } from '../../src/modules/monitor/monitor.js';
import { create_render_metrics_reader } from '../../src/modules/monitor/render-metrics.js';

test('monitor requires admin access and distinguishes failed readiness from unreachable services', async () => {
  let calls = 0;
  const app = express();
  app.use(
    '/api',
    monitor_routes(
      [
        { id: 'poi-service', name: 'POI', url: 'http://poi.local', database: 'PoiDb' },
        {
          id: 'translation-service',
          name: 'Translation',
          url: 'http://translation.local',
          database: 'TranslationDb',
        },
        { id: 'navigation-service', name: 'Navigation', url: 'http://navigation.local' },
      ],
      'test-key',
      async (url) => {
        calls++;
        const target = new URL(String(url));
        assert.equal(target.pathname, '/health/ready');
        if (target.hostname === 'poi.local')
          return Response.json({ status: 'ok', service: 'poi-service' });
        if (target.hostname === 'translation.local')
          return Response.json(
            { status: 'unavailable', service: 'translation-service' },
            { status: 503 },
          );
        throw new Error('network failure with secret details');
      },
    ),
  );
  await request(app).get('/api/admin/monitor').expect(401);
  assert.equal(calls, 0);
  const response = await request(app)
    .get('/api/admin/monitor')
    .set('x-admin-key', 'test-key')
    .expect(200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.deepEqual(
    response.body.data.services.map((service: { status: string }) => service.status),
    ['healthy', 'healthy', 'unavailable', 'unreachable'],
  );
  assert.equal(response.body.data.services[1].database, 'PoiDb');
  assert.ok(!JSON.stringify(response.body).includes('secret details'));
});

test('monitor rejects misleading or invalid upstream health responses', async () => {
  const app = express();
  app.use(
    '/api',
    monitor_routes(
      [{ id: 'poi-service', name: 'POI', url: 'http://poi.local' }],
      'test-key',
      async () => Response.json({ status: 'ok', service: 'wrong-service' }),
    ),
  );
  const response = await request(app)
    .get('/api/admin/monitor')
    .set('x-admin-key', 'test-key')
    .expect(200);
  assert.equal(response.body.data.services[1].status, 'unavailable');
});

test('monitor returns cached render_metrics alongside live latency and isolates Render errors', async () => {
  let render_calls = 0;
  let now_ms = 5_000_000;
  let fail_render = false;

  const reader = create_render_metrics_reader({
    env: {
      RENDER_API_KEY: 'rnd_test_key',
      RENDER_SERVICE_ID: 'srv-dbqrsgk9v7es73dfj1n0',
    },
    now: () => now_ms,
    cache_ttl_ms: 30_000,
    error_cache_ttl_ms: 15_000,
    fetcher: async (url) => {
      render_calls++;
      if (fail_render) return Response.json({}, { status: 502 });
      const pathname = new URL(String(url)).pathname;
      if (pathname.endsWith('/metrics/cpu')) {
        return Response.json([
          { unit: '%', values: [{ timestamp: '2026-11-15T10:00:00Z', value: 18.5 }] },
        ]);
      }
      if (pathname.endsWith('/metrics/memory')) {
        return Response.json([
          { unit: 'MiB', values: [{ timestamp: '2026-11-15T10:00:00Z', value: 210.5 }] },
        ]);
      }
      if (pathname.endsWith('/metrics/memory-limit')) {
        return Response.json([
          { unit: 'MiB', values: [{ timestamp: '2026-11-15T10:00:00Z', value: 512 }] },
        ]);
      }
      return Response.json([]);
    },
  });

  const app = express();
  app.use(
    '/api',
    monitor_routes(
      [{ id: 'poi-service', name: 'POI', url: 'http://poi.local' }],
      'test-key',
      async () => Response.json({ status: 'ok', service: 'poi-service' }),
      reader,
    ),
  );

  const first = await request(app)
    .get('/api/admin/monitor')
    .set('x-admin-key', 'test-key')
    .expect(200);
  assert.equal(first.body.data.render_metrics.status, 'ok');
  assert.equal(first.body.data.render_metrics.cpu_percent, 18.5);
  assert.equal(first.body.data.render_metrics.memory_used_mib, 210.5);
  assert.equal(first.body.data.render_metrics.memory_limit_mib, 512);
  assert.equal(typeof first.body.data.services[1].latency_ms, 'number');
  assert.equal(render_calls, 4);

  now_ms += 5_000;
  const second = await request(app)
    .get('/api/admin/monitor')
    .set('x-admin-key', 'test-key')
    .expect(200);
  assert.equal(second.body.data.render_metrics.cpu_percent, 18.5);
  assert.equal(render_calls, 4);

  now_ms += 30_000;
  fail_render = true;
  const third = await request(app)
    .get('/api/admin/monitor')
    .set('x-admin-key', 'test-key')
    .expect(200);
  assert.equal(third.body.data.render_metrics.status, 'error');
  assert.equal(third.body.data.render_metrics.cpu_percent, null);
  assert.equal(third.body.data.render_metrics.memory_used_mib, null);
  assert.equal(third.body.data.services[1].status, 'healthy');
  assert.ok(!JSON.stringify(third.body).includes('rnd_test_key'));
});
