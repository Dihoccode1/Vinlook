import express from 'express';
import { randomUUID } from 'node:crypto';
import { draftRouter } from './drafts/router.js';

export function createApp(runtime) {
  const app = express();
  app.disable('x-powered-by');
  if (runtime) app.use('/api/v1', draftRouter(runtime));
  app.get('/health/live', (_request, response) => {
    response.set('Cache-Control', 'no-store').json({ data: { status: 'up' }, requestId: randomUUID() });
  });
  app.get('/health/ready', (_request, response) => {
    response.set('Cache-Control', 'no-store').status(503).json({
      error: { code: 'DEPENDENCIES_UNVERIFIED', message: 'Service dependencies are not verified', requestId: randomUUID() },
    });
  });
  // Full product readiness remains gated independently of draft API availability.
  return app;
}
