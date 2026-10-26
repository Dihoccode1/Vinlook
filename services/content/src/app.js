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
  app.get('/health/ready', async (_request, response) => {
    let ready=false;try{ready=await runtime?.ready?.()===true;}catch{/* No dependency details in health output. */}
    if(ready)return response.set('Cache-Control','no-store').json({data:{status:'ready'},requestId:randomUUID()});
    response.set('Cache-Control', 'no-store').status(503).json({
      error: { code: 'DEPENDENCIES_UNVERIFIED', message: 'Service dependencies are not verified', requestId: randomUUID() },
    });
  });
  // Service readiness does not certify full product/content acceptance.
  return app;
}
