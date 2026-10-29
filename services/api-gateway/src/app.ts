import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { activity_routes } from './activity.js';
import { monitor_routes } from './monitor.js';
import { admin_auth } from './admin-auth.js';
import { user_routes } from './users.js';

export function create_app(poi_service_url = process.env.POI_SERVICE_URL ?? 'http://localhost:4001', navigation_service_url = process.env.NAVIGATION_SERVICE_URL ?? 'http://localhost:4002', translation_service_url = process.env.TRANSLATION_SERVICE_URL ?? 'http://localhost:4003') {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use('/api/admin', admin_auth());
  app.use('/api/admin/users', user_routes());
  app.use('/api', activity_routes());
  app.use('/api', monitor_routes([
    { id: 'poi-service', name: 'Quản lý POI', url: poi_service_url, database: 'PoiDb' },
    { id: 'navigation-service', name: 'Tìm đường', url: navigation_service_url },
    { id: 'translation-service', name: 'Dịch thuật & thuyết minh', url: translation_service_url, database: 'TranslationDb' },
  ]));
  app.use('/api/admin', express.json({ limit: '8mb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const incoming = new URL(req.originalUrl, 'http://gateway.local');
      const target = new URL(poi_service_url); target.pathname = incoming.pathname.replace(/^\/api/, ''); target.search = incoming.search;
      const upstream = await fetch(target, { method: req.method, headers: { 'content-Type': 'application/json', 'x-admin-key': req.get('x-admin-key') ?? '', 'x-admin-user-id': req.get('x-admin-user-id') ?? '' },
        body: ['GET','HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body), signal: AbortSignal.timeout(15000), redirect: 'error' });
      res.status(upstream.status).type('application/json').send(await upstream.text());
    } catch { res.status(502).json({ error: { code: 'ADMIN_UNAVAILABLE', message: 'Không kết nối được dịch vụ quản trị.' } }); }
  });
  app.post('/api/pois/:id/narration', express.json({ limit: '1kb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const upstream = await fetch(new URL(`/pois/${encodeURIComponent(String(req.params.id))}/narration`, translation_service_url), {
        method: 'POST', headers: { 'content-Type': 'application/json' }, body: JSON.stringify(req.body ?? null),
        signal: AbortSignal.timeout(175000), redirect: 'error',
      });
      res.status(upstream.status).type(upstream.ok ? 'audio/wav' : 'application/json').send(Buffer.from(await upstream.arrayBuffer()));
    } catch { res.status(502).json({ error: { message: 'Không thể tải thuyết minh. Hãy thử lại.' } }); }
  });
  app.get('/api/languages', async (_req, res) => {
    try {
      const upstream = await fetch(new URL('/languages', translation_service_url), { signal: AbortSignal.timeout(6000), redirect: 'error' });
      res.status(upstream.status).type('application/json').send(await upstream.text());
    } catch { res.status(502).json({ error: { message: 'Không thể tải danh sách ngôn ngữ' } }); }
  });
  app.post('/api/pois/:id/translation', express.json({ limit: '1kb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const upstream = await fetch(new URL(`/pois/${encodeURIComponent(String(req.params.id))}/translation`, translation_service_url), {
        method: 'POST', headers: { 'content-Type': 'application/json' }, body: JSON.stringify(req.body ?? null),
        signal: AbortSignal.timeout(60000), redirect: 'error',
      });
      res.status(upstream.status).type('application/json').send(await upstream.text());
    } catch { res.status(502).json({ error: { message: 'Dịch vụ dịch tạm thời không khả dụng' } }); }
  });
  app.post('/api/routes', express.json({ limit: '16kb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const url = new URL('/routes', navigation_service_url);
      const upstream = await fetch(url, {
        method: 'POST', headers: { 'content-Type': 'application/json' }, body: JSON.stringify(req.body ?? null),
        signal: AbortSignal.timeout(15000), redirect: 'error',
      });
      res.status(upstream.status).type('application/json').send(await upstream.text());
    } catch {
      res.status(502).json({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Navigation service is unavailable' } });
    }
  });
  app.get('/health/live', (_req, res) => res.json({ status: 'ok', service: 'api-gateway' }));
  app.get('/health/ready', async (_req, res) => {
    try {
      const response = await fetch(`${poi_service_url}/health/ready`, { signal: AbortSignal.timeout(6000) });
      res.status(response.ok ? 200 : 503).json({ status: response.ok ? 'ok' : 'unavailable', service: 'api-gateway' });
    } catch {
      res.status(503).json({ status: 'unavailable', service: 'api-gateway' });
    }
  });
  app.use('/api/pois', async (req, res) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported' } });
      return;
    }
    try {
      // Build only the pathname; a client cannot override the upstream host.
      const target = new URL(poi_service_url);
      const incoming = new URL(req.originalUrl, 'http://gateway.local');
      target.pathname = incoming.pathname.replace(/^\/api/, '');
      target.search = incoming.search;
      const headers: Record<string, string> = {};
      if (req.headers['if-none-match']) headers['If-None-Match'] = req.headers['if-none-match'];
      const upstream = await fetch(target, { headers, signal: AbortSignal.timeout(15000), redirect: 'error' });
      const body = Buffer.from(await upstream.arrayBuffer());
      for (const name of ['content-type', 'cache-control', 'etag']) {
        const value = upstream.headers.get(name);
        if (value) res.setHeader(name, value);
      }
      res.status(upstream.status).send(body);
    } catch {
      res.status(502).json({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'POI service is unavailable' } });
    }
  });
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    res.setHeader('Cache-Control', 'no-store');
    const status = error?.type === 'entity.too.large' ? 413 : error?.type === 'entity.parse.failed' ? 400 : 500;
    res.status(status).json({ error: { code: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_BODY', message: 'Unable to process request' } });
  };
  app.use(errors);
  return app;
}
