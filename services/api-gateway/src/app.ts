import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';

export function createApp(poiServiceUrl = process.env.POI_SERVICE_URL ?? 'http://localhost:4001', navigationServiceUrl = process.env.NAVIGATION_SERVICE_URL ?? 'http://localhost:4002') {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.post('/api/routes', express.json({ limit: '16kb' }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const url = new URL('/routes', navigationServiceUrl);
      const upstream = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body ?? null),
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
      const response = await fetch(`${poiServiceUrl}/health/ready`, { signal: AbortSignal.timeout(6000) });
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
      const target = new URL(poiServiceUrl);
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
