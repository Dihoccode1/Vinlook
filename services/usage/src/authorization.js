import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { z } from 'zod';

const caller = 'usage';
export function loadAuthorizationConfig(mode, environment = process.env) {
  const field = 'USAGE_IDENTITY_SERVICE_KEY_B64URL';
  const key = environment[field];
  const invalid = name => { throw new Error(`Invalid authorization configuration: ${name}`); };
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(key)
    || Buffer.from(key, 'base64url').toString('base64url') !== key) invalid(field);
  let url;
  try { url = new URL(environment.IDENTITY_BASE_URL); } catch { invalid('IDENTITY_BASE_URL'); }
  const loopback = url.hostname === 'localhost' || url.hostname === '[::1]'
    || isIP(url.hostname) === 4 && url.hostname.startsWith('127.');
  if (url.origin !== environment.IDENTITY_BASE_URL || !(url.protocol === 'https:'
    || mode !== 'production' && url.protocol === 'http:' && loopback)) invalid('IDENTITY_BASE_URL');
  return Object.freeze({ baseUrl: url.origin, key }); // Private: never log/serialize.
}

const id = z.string().regex(/^[a-f0-9]{24}$/);
const session = z.strictObject({ id, workDateVN: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.literal('open'), openedAt: z.iso.datetime(), closedAt: z.null() });
const envelope = z.strictObject({ data: z.strictObject({ account: z.strictObject({ id,
  role: z.enum(['Staff', 'Manager']), status: z.literal('active'), authVersion: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) }),
  currentWorkSession: session.nullable() }), requestId: z.uuid() });
const denials = new Map([
  ['AUTHENTICATION_REQUIRED', [401, 'Authentication is required']],
  ['ACCESS_DENIED', [403, 'Access is denied']],
]);
export class AuthorizationFailure extends Error {
  constructor(status = 503, code = 'AUTHORIZATION_UNAVAILABLE', message = 'Authorization is temporarily unavailable') {
    super(message); Object.assign(this, { status, code });
  }
}

async function readLimited(response) {
  if (!response.body || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) throw new AuthorizationFailure();
  const reader = response.body.getReader();
  let length = 0;
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 16384) throw new AuthorizationFailure();
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

/** Every call fetches fresh authority. No retry, redirect, positive cache or DB access. */
export async function authorize(authorization, config) {
  if (typeof authorization !== 'string' || !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(authorization)) {
    throw new AuthorizationFailure(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
  }
  try {
    const response = await fetch(`${config.baseUrl}/api/v1/internal/authorize`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(3000),
      headers: { 'Content-Type': 'application/json', 'X-Vinlook-Service': caller, 'X-Vinlook-Service-Key': config.key },
      body: JSON.stringify({ accessToken: authorization.slice(7) }),
    });
    const value = await readLimited(response);
    if (response.status === 200) {
      const parsed = envelope.safeParse(value);
      if (!parsed.success) throw new AuthorizationFailure();
      return parsed.data.data;
    }
    const error = z.strictObject({ error: z.strictObject({ code: z.string(), message: z.string(), requestId: z.uuid() }) }).safeParse(value);
    const allowed = error.success && denials.get(error.data.error.code);
    if (allowed && allowed[0] === response.status && allowed[1] === error.data.error.message) {
      throw new AuthorizationFailure(allowed[0], error.data.error.code, allowed[1]);
    }
    throw new AuthorizationFailure();
  } catch (error) { throw error instanceof AuthorizationFailure ? error : new AuthorizationFailure(); }
}

export function protectedRequest(config, { roles = ['Staff', 'Manager'], requireSession = false } = {}) {
  if (!roles.length || roles.some(role => !['Staff', 'Manager'].includes(role))) throw new Error('Invalid server role policy');
  return async (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    const requestId = randomUUID();
    try {
      const principal = await authorize(request.get('Authorization'), config);
      if (!roles.includes(principal.account.role)) throw new AuthorizationFailure(403, 'ACCESS_DENIED', 'Access is denied');
      if (requireSession && !principal.currentWorkSession) throw new AuthorizationFailure(403, 'WORK_SESSION_REQUIRED', 'An open work session is required');
      response.locals.principal = principal;
      next();
    } catch (error) {
      const safe = error instanceof AuthorizationFailure ? error : new AuthorizationFailure();
      response.status(safe.status).json({ error: { code: safe.code, message: safe.message, requestId } });
    }
  };
}
