import express from 'express';
import { randomUUID } from 'node:crypto';
import { authRouter } from './auth/router.js';

export function createApp(authRuntime) {
  const app = express();
  app.disable('x-powered-by');
  if (authRuntime) {
    app.set('trust proxy', authRuntime.config.proxyCidrs.length ? [...authRuntime.config.proxyCidrs] : false);
    app.use('/api/v1/auth', authRouter(authRuntime));
  }
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
