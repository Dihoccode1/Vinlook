import express from 'express';
import { randomUUID } from 'node:crypto';
import { createUsageRouter } from './http.js';

export function createApp({ runtime = null } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health/live', (_request, response) => {
    response.set('Cache-Control', 'no-store').json({ data: { status: 'up' }, requestId: randomUUID() });
  });
  app.get('/health/ready', async (_request, response) => {
    if (runtime && await runtime.ready().catch(() => false)) {
      response.set('Cache-Control', 'no-store').json({ data: { status: 'ready' }, requestId: randomUUID() }); return;
    }
    response.set('Cache-Control', 'no-store').status(503).json({
      error: { code: 'DEPENDENCIES_UNVERIFIED', message: 'Service dependencies are not verified', requestId: randomUUID() },
    });
  });
  if (runtime) app.use('/api/v1', createUsageRouter(runtime));
  return app;
}
