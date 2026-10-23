import express from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuthorizationError, bearerToken, currentPrincipal } from './authorization.js';
import { SessionError, openSession, closeSession } from './session-state.js';

const reasonBody = z.strictObject({ reason: z.string().trim().min(1).max(500).refine(value => [...value].length <= 500) });
export function sessionRouter(runtime) {
  const router = express.Router();
  router.use((request, response, next) => {
    response.locals.requestId = randomUUID();
    response.set('Cache-Control', 'no-store').vary('Origin');
    const origin = request.get('Origin');
    if (origin && !runtime.config.origins.includes(origin)) throw new AuthorizationError(403, 'ACCESS_DENIED', 'Access is denied');
    if (origin) response.set('Access-Control-Allow-Origin', origin);
    if (request.method === 'OPTIONS') {
      const headers = (request.get('Access-Control-Request-Headers') ?? '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
      if (request.get('Access-Control-Request-Method') !== 'POST' || headers.some(x => !['authorization', 'content-type'].includes(x))) {
        throw new AuthorizationError(403, 'ACCESS_DENIED', 'Access is denied');
      }
      return response.set('Access-Control-Allow-Methods', 'POST, OPTIONS').set('Access-Control-Allow-Headers', 'Authorization, Content-Type').status(204).end();
    }
    next();
  });
  router.use(async (request, response, next) => {
    response.locals.principal = await currentPrincipal(bearerToken(request.get('Authorization')), runtime);
    next();
  });
  router.use(express.json({ limit: '16kb' }));
  router.post('/open', async (request, response) => {
    if (Object.keys(request.query).length || request.body !== undefined && !z.strictObject({}).safeParse(request.body).success
      || request.body === undefined && (Number(request.get('content-length') ?? 0) > 0 || request.get('transfer-encoding'))) {
      throw new SessionError(422, 'INVALID_INPUT', 'Invalid work session input');
    }
    const result = await openSession(runtime, response.locals.principal.account.id);
    response.status(result.status).json({ data: { session: result.session }, requestId: response.locals.requestId });
  });
  router.post('/:id/close', async (request, response) => {
    const input = reasonBody.safeParse(request.body);
    if (!/^[a-fA-F0-9]{24}$/.test(request.params.id) || Object.keys(request.query).length || !input.success) {
      throw new SessionError(422, 'INVALID_INPUT', 'Invalid work session input');
    }
    const result = await closeSession(runtime, response.locals.principal.account.id, request.params.id, input.data.reason);
    response.status(result.status).json({ data: { session: result.session }, requestId: response.locals.requestId });
  });
  router.use((error, _request, response, _next) => {
    let safe = error instanceof SessionError || error instanceof AuthorizationError ? error
      : new SessionError(503, 'DEPENDENCY_UNAVAILABLE', 'Work sessions are temporarily unavailable');
    if (error?.type === 'entity.parse.failed') safe = new SessionError(400, 'MALFORMED_JSON', 'Malformed JSON');
    if (error?.type === 'entity.too.large') safe = new SessionError(413, 'BODY_TOO_LARGE', 'Work session body is too large');
    response.status(safe.status).json({ error: { code: safe.code, message: safe.message, requestId: response.locals.requestId } });
  });
  return router;
}
