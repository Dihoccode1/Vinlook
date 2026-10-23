import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import express from 'express';
import { z } from 'zod';
import { verifyToken } from './auth/token.js';
import { AuthConfigurationError } from './auth/config.js';
import { reconcileSessions, vietnamDay, sessionView } from './session-state.js';

const digest = value => createHash('sha256').update(value).digest();
function decode(value, field) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new AuthConfigurationError(field);
  const key = Buffer.from(value, 'base64url');
  if (key.length !== 32 || key.toString('base64url') !== value) throw new AuthConfigurationError(field);
  return key;
}

export function loadServiceCredentials(authConfig, environment = process.env, now = Date.now()) {
  const seen = [authConfig.jwtKey, authConfig.rateKey];
  const unique = (value, field) => {
    const key = decode(value, field);
    if (seen.some(other => other.equals(key))) throw new AuthConfigurationError(field);
    seen.push(key);
    return digest(key);
  };
  const callers = {};
  for (const caller of ['content', 'usage']) {
    const prefix = `IDENTITY_${caller.toUpperCase()}`;
    const current = unique(environment[`${prefix}_SERVICE_KEY_B64URL`], `${prefix}_SERVICE_KEY_B64URL`);
    const oldValue = environment[`${prefix}_PREVIOUS_SERVICE_KEY_B64URL`];
    const expiryValue = environment[`${prefix}_PREVIOUS_KEY_EXPIRES_AT`];
    let previous = null;
    if (oldValue !== undefined || expiryValue !== undefined) {
      const expiresAt = Date.parse(expiryValue);
      if (!Number.isFinite(expiresAt) || new Date(expiresAt).toISOString() !== expiryValue || expiresAt > now + 86400000) {
        throw new AuthConfigurationError(`${prefix}_PREVIOUS_KEY_EXPIRES_AT`);
      }
      previous = { hash: unique(oldValue, `${prefix}_PREVIOUS_SERVICE_KEY_B64URL`), expiresAt };
    }
    callers[caller] = Object.freeze({ current, previous });
  }
  return Object.freeze(callers);
}

export class AuthorizationError extends Error {
  constructor(status, code, message) { super(message); Object.assign(this, { status, code }); }
}
const unauthenticated = () => new AuthorizationError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
const denied = () => new AuthorizationError(403, 'ACCESS_DENIED', 'Access is denied');
export function bearerToken(value) {
  if (typeof value !== 'string' || !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(value)) throw unauthenticated();
  return value.slice(7);
}

export async function currentPrincipal(token, runtime) {
  let claims;
  try { claims = await verifyToken(token, runtime.config, runtime.now()); } catch { throw unauthenticated(); }
  const account = await runtime.models.StaffAccount.findById(claims.sub);
  if (!account || account.authVersion !== claims.authVersion) throw unauthenticated();
  if (account.status !== 'active') throw denied();
  await reconcileSessions(runtime.models, runtime.now(), account._id);
  const session = await runtime.models.WorkSession.findOne({ staffId: account._id,
    workDateVN: vietnamDay(runtime.now()), status: 'open' });
  return { account: { id: String(account._id), fullName: account.fullName, email: account.email,
    role: account.role, status: account.status, authVersion: account.authVersion },
  currentWorkSession: session ? sessionView(session) : null };
}

export function requireAuthority(principal, { roles = ['Staff', 'Manager'], requireSession = false } = {}) {
  if (!roles.length || roles.some(role => !['Staff', 'Manager'].includes(role))) throw new Error('Invalid server role policy');
  if (!roles.includes(principal.account.role)) throw denied();
  if (requireSession && !principal.currentWorkSession) throw new AuthorizationError(403, 'WORK_SESSION_REQUIRED', 'An open work session is required');
  return principal;
}

function validCaller(request, callers, now) {
  const caller = request.get('X-Vinlook-Service');
  const record = Object.hasOwn(callers, caller ?? '') ? callers[caller] : null;
  let supplied;
  try { supplied = digest(decode(request.get('X-Vinlook-Service-Key'), 'service key')); } catch { return false; }
  // Compare fixed-length hashes; never compare raw secrets with ordinary string equality.
  return record && (timingSafeEqual(record.current, supplied)
    || record.previous && now < record.previous.expiresAt && timingSafeEqual(record.previous.hash, supplied));
}

export function authorizationRouter(runtime, callers) {
  const router = express.Router();
  router.use((request, response, next) => {
    response.locals.requestId = randomUUID();
    response.set('Cache-Control', 'no-store');
    if (request.path === '/me') {
      response.vary('Origin');
      const origin = request.get('Origin');
      if (origin && !runtime.config.origins.includes(origin)) throw denied();
      if (origin) response.set('Access-Control-Allow-Origin', origin);
      if (request.method === 'OPTIONS') {
        const headers = (request.get('Access-Control-Request-Headers') ?? '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
        if (request.get('Access-Control-Request-Method') !== 'GET' || headers.some(x => !['authorization', 'content-type'].includes(x))) throw denied();
        return response.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
          .set('Access-Control-Allow-Headers', 'Authorization, Content-Type').status(204).end();
      }
    }
    next();
  });
  router.get('/me', async (request, response) => {
    if (Object.keys(request.query).length || request.get('transfer-encoding') || Number(request.get('content-length') ?? 0) > 0) {
      throw new AuthorizationError(422, 'INVALID_INPUT', 'Invalid authorization input');
    }
    const principal = await currentPrincipal(bearerToken(request.get('Authorization')), runtime);
    const { authVersion: _version, ...account } = principal.account;
    response.json({ data: { account, currentWorkSession: principal.currentWorkSession }, requestId: response.locals.requestId });
  });
  router.post('/internal/authorize', (request, _response, next) => {
    if (request.get('Origin') !== undefined || !validCaller(request, callers, runtime.now())) {
      throw new AuthorizationError(401, 'SERVICE_AUTHENTICATION_FAILED', 'Service authentication failed');
    }
    next();
  }, express.json({ limit: '16kb' }), async (request, response) => {
    const input = z.strictObject({ accessToken: z.string().min(1).max(16000) }).safeParse(request.body);
    if (!input.success || Object.keys(request.query).length) throw new AuthorizationError(422, 'INVALID_INPUT', 'Invalid authorization input');
    const principal = await currentPrincipal(input.data.accessToken, runtime);
    const { id, role, status, authVersion } = principal.account;
    response.json({ data: { account: { id, role, status, authVersion }, currentWorkSession: principal.currentWorkSession }, requestId: response.locals.requestId });
  });
  router.use((error, _request, response, _next) => {
    let safe = error instanceof AuthorizationError ? error : new AuthorizationError(503, 'DEPENDENCY_UNAVAILABLE', 'Authorization is temporarily unavailable');
    if (error?.type === 'entity.parse.failed') safe = new AuthorizationError(400, 'MALFORMED_JSON', 'Malformed JSON');
    if (error?.type === 'entity.too.large') safe = new AuthorizationError(413, 'BODY_TOO_LARGE', 'Authorization body is too large');
    response.status(safe.status).json({ error: { code: safe.code, message: safe.message, requestId: response.locals.requestId } });
  });
  return router;
}
