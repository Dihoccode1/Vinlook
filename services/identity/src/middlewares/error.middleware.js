import { AppError } from '../utils/AppError.js';
import { RateExceeded } from '../auth/rate.js';

export function sendAuthError(response, status, code, message) {
  return response
    .status(status)
    .json({ error: { code, message, requestId: response.locals.requestId } });
}

export function authErrorMiddleware(error, _request, response, _next) {
  if (error instanceof AppError)
    return sendAuthError(response, error.status, error.code, error.message);
  if (error instanceof RateExceeded) {
    response.set('Retry-After', String(error.retryAfter));
    return sendAuthError(response, 429, 'RATE_LIMITED', 'Too many authentication attempts');
  }
  if (error?.type === 'entity.too.large')
    return sendAuthError(response, 413, 'BODY_TOO_LARGE', 'Authentication body is too large');
  if (error?.type === 'entity.parse.failed')
    return sendAuthError(response, 400, 'MALFORMED_JSON', 'Malformed JSON');
  return sendAuthError(
    response,
    503,
    'DEPENDENCY_UNAVAILABLE',
    'Authentication is temporarily unavailable',
  );
}
