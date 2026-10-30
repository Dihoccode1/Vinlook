import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { monitor_routes } from '../../src/monitor.js';

test('monitor requires admin access and distinguishes failed readiness from unreachable services', async () => {
  let calls = 0;
  const app = express();
  app.use('/api', monitor_routes([
    { id: 'poi-service', name: 'POI', url: 'http://poi.local', database: 'PoiDb' },
    { id: 'translation-service', name: 'Translation', url: 'http://translation.local', database: 'TranslationDb' },
    { id: 'navigation-service', name: 'Navigation', url: 'http://navigation.local' },
  ], 'test-key', async url => {
    calls++;
    const target = new URL(String(url)); assert.equal(target.pathname, '/health/ready');
    if (target.hostname === 'poi.local') return Response.json({ status: 'ok', service: 'poi-service' });
    if (target.hostname === 'translation.local') return Response.json({ status: 'unavailable', service: 'translation-service' }, { status: 503 });
    throw new Error('network failure with secret details');
  }));
  await request(app).get('/api/admin/monitor').expect(401); assert.equal(calls, 0);
  const response = await request(app).get('/api/admin/monitor').set('x-admin-key', 'test-key').expect(200);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.deepEqual(response.body.data.services.map((service: { status: string }) => service.status), ['healthy', 'healthy', 'unavailable', 'unreachable']);
  assert.equal(response.body.data.services[1].database, 'PoiDb');
  assert.ok(!JSON.stringify(response.body).includes('secret details'));
});

test('monitor rejects misleading or invalid upstream health responses', async () => {
  const app = express();
  app.use('/api', monitor_routes([{ id: 'poi-service', name: 'POI', url: 'http://poi.local' }], 'test-key', async () => Response.json({ status: 'ok', service: 'wrong-service' })));
  const response = await request(app).get('/api/admin/monitor').set('x-admin-key', 'test-key').expect(200);
  assert.equal(response.body.data.services[1].status, 'unavailable');
});
