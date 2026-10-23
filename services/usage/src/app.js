import express from 'express';
import { randomUUID } from 'node:crypto';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health/live', (_request, response) => {
    response.set('Cache-Control', 'no-store').json({ data: { status: 'up' }, requestId: randomUUID() });
  });
  app.get('/health/ready', (_request, response) => {
    response.set('Cache-Control', 'no-store').status(503).json({
      error: { code: 'DEPENDENCIES_UNVERIFIED', message: 'Service dependencies are not verified', requestId: randomUUID() },
    });
  });
  // Protected monitoring and business APIs are intentionally not implemented.
  return app;
}
