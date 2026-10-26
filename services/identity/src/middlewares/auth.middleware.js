import { randomUUID } from 'node:crypto';
import { consumeBudget, rateBucket } from '../auth/rate.js';
import { sendAuthError } from './error.middleware.js';

export function createAuthOriginMiddleware(config) {
  return (request, response, next) => {
    response.locals.requestId = randomUUID();
    response.set('Cache-Control', 'no-store').vary('Origin');
    const origin = request.get('Origin');
    if (origin && !config.origins.includes(origin))
      return sendAuthError(response, 403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed');
    if (origin) response.set('Access-Control-Allow-Origin', origin);
    if (request.method === 'OPTIONS') {
      const headers = (request.get('Access-Control-Request-Headers') ?? '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      if (
        request.get('Access-Control-Request-Method') !== 'POST' ||
        headers.some((value) => !['content-type', 'authorization'].includes(value))
      )
        return sendAuthError(response, 403, 'ORIGIN_NOT_ALLOWED', 'Preflight is not allowed');
      return response
        .set('Access-Control-Allow-Methods', 'POST, OPTIONS')
        .set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        .status(204)
        .end();
    }
    next();
  };
}

export function createAuthRateLimit(runtime, operation) {
  return async (request, _response, next) => {
    await consumeBudget(
      runtime.models.AuthRateLimit,
      rateBucket(runtime.config.rateKey, operation, 'ip', request.ip, runtime.now()),
      operation === 'register' ? 5 : 30,
    );
    next();
  };
}
