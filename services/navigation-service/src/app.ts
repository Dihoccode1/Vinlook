import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { createValhallaProvider } from './providers/valhalla.js';
import { routeRequestSchema, RoutingError, type RouteProvider } from './modules/routes/route.schema.js';

export function createApp(provider: RouteProvider = createValhallaProvider()) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '16kb' }));
  for (const path of ['/health/live', '/health/ready']) {
    app.get(path, (_req, res) => res.json({ status: 'ok', service: 'navigation-service' }));
  }
  app.post('/routes', async (req, res) => {
    const input = routeRequestSchema.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: { code: 'INVALID_ROUTE', message: 'Provide 2–10 valid waypoints and a supported vehicle' } });
      return;
    }
    res.json({ data: await provider.calculate(input.data) });
  });
  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }));
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof RoutingError) {
      const status = error.code === 'NO_ROUTE' ? 422 : error.code === 'PROVIDER_TIMEOUT' ? 504 : 502;
      res.status(status).json({ error: { code: error.code, message: 'Unable to calculate route' } });
      return;
    }
    if (error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large') {
      res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: { code: 'INVALID_BODY', message: 'Invalid JSON request body' } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Navigation service error' } });
  };
  app.use(errors);
  return app;
}
