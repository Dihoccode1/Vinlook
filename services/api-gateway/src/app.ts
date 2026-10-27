import express from 'express';
import helmet from 'helmet';

export function createApp(poiServiceUrl = process.env.POI_SERVICE_URL ?? 'http://localhost:4001') {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
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
      const upstream = await fetch(target, { signal: AbortSignal.timeout(15000), redirect: 'error' });
      const body = await upstream.text();
      res.status(upstream.status).type('application/json').send(body);
    } catch {
      res.status(502).json({ error: { code: 'UPSTREAM_UNAVAILABLE', message: 'POI service is unavailable' } });
    }
  });
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  return app;
}
