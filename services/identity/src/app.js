import express from 'express';
import { randomUUID } from 'node:crypto';
import { authRouter } from './auth/router.js';
import { authorizationRouter } from './authorization.js';
import { sessionRouter } from './session-router.js';
import { auditHistoryRouter } from './audit-history.js';
import { staffRecoveryRouter } from './staff-recovery.js';

export function createApp(authRuntime) {
  const app = express();
  app.disable('x-powered-by');
  if (authRuntime) {
    app.set('trust proxy', authRuntime.config.proxyCidrs.length ? [...authRuntime.config.proxyCidrs] : false);
    app.use('/api/v1', staffRecoveryRouter(authRuntime));
    app.use('/api/v1/auth', authRouter(authRuntime));
    app.use('/api/v1', auditHistoryRouter(authRuntime));
    app.use('/api/v1/work-sessions', sessionRouter(authRuntime));
    if (authRuntime.callers) app.use('/api/v1', authorizationRouter(authRuntime, authRuntime.callers));
  }
  app.get('/health/live', (_request, response) => {
    response.set('Cache-Control', 'no-store').json({ data: { status: 'up' }, requestId: randomUUID() });
  });
  app.get('/health/ready', async (_request, response) => {
    let ready=false;try{ready=await authRuntime?.ready?.()===true;}catch{/* No dependency details in health output. */}
    if(ready)return response.set('Cache-Control','no-store').json({data:{status:'ready'},requestId:randomUUID()});
    response.set('Cache-Control', 'no-store').status(503).json({
      error: { code: 'DEPENDENCIES_UNVERIFIED', message: 'Service dependencies are not verified', requestId: randomUUID() },
    });
  });
  // Unconfigured/unverified runtimes remain unavailable.
  return app;
}
