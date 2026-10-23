import express from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { rateBucket, consumeBudget, assertBudget, RateExceeded } from './rate.js';
import { issueToken } from './token.js';

const email = z.string().trim().toLowerCase().max(254).regex(/^[^@\s]+@[^@\s]+$/u);
const password = z.string().min(1).refine(value => Buffer.byteLength(value, 'utf8') <= 72);
const login = z.strictObject({ email, password });
const registration = z.strictObject({ email, password: password.refine(value => [...value].length >= 15),
  fullName: z.string().trim().refine(value => [...value].length >= 1 && [...value].length <= 100),
  confirmPassword: z.string(),
}).refine(value => value.password === value.confirmPassword);

function fail(response, status, code, message) {
  return response.status(status).json({ error: { code, message, requestId: response.locals.requestId } });
}

export function authRouter(runtime) {
  const router = express.Router();
  const { config, models, now, dummyHash } = runtime;
  router.use((request, response, next) => {
    response.locals.requestId = randomUUID();
    response.set('Cache-Control', 'no-store').vary('Origin');
    const origin = request.get('Origin');
    if (origin && !config.origins.includes(origin)) return fail(response, 403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed');
    if (origin) response.set('Access-Control-Allow-Origin', origin);
    if (request.method === 'OPTIONS') {
      const headers = (request.get('Access-Control-Request-Headers') ?? '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
      if (request.get('Access-Control-Request-Method') !== 'POST' || headers.some(x => !['content-type', 'authorization'].includes(x))) {
        return fail(response, 403, 'ORIGIN_NOT_ALLOWED', 'Preflight is not allowed');
      }
      return response.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
        .set('Access-Control-Allow-Headers', 'Content-Type, Authorization').status(204).end();
    }
    next();
  });
  for (const operation of ['register', 'login']) {
    router.post(`/${operation}`, async (request, _response, next) => {
      await consumeBudget(models.AuthRateLimit, rateBucket(config.rateKey, operation, 'ip', request.ip, now()), operation === 'register' ? 5 : 30);
      next();
    }, express.json({ limit: '16kb', strict: true }), async (request, response) => {
      const parsed = (operation === 'register' ? registration : login).safeParse(request.body);
      if (!parsed.success) return fail(response, 422, 'INVALID_INPUT', 'Invalid authentication input');
      const input = parsed.data;
      if (operation === 'register') {
        try {
          const account = await models.StaffAccount.create({ fullName: input.fullName, email: input.email,
            passwordHash: await bcrypt.hash(input.password, 12), role: 'Staff', status: 'pending', authVersion: 0 });
          return response.status(201).json({ data: { accountId: String(account._id), status: 'pending' }, requestId: response.locals.requestId });
        } catch (error) {
          if (error?.code === 11000) return fail(response, 409, 'REGISTRATION_FAILED', 'Registration could not be completed');
          throw error;
        }
      }
      const bucket = rateBucket(config.rateKey, 'login', 'account', input.email, now());
      await assertBudget(models.AuthRateLimit, bucket, 5);
      const account = await models.StaffAccount.findOne({ email: input.email }).select('+passwordHash');
      const matches = await bcrypt.compare(input.password, account?.passwordHash ?? dummyHash);
      if (!matches || !account || account.status !== 'active') {
        await consumeBudget(models.AuthRateLimit, bucket, 5);
        return fail(response, 401, 'AUTHENTICATION_FAILED', 'Login could not be completed');
      }
      return response.json({ data: { accessToken: await issueToken(account, config, now()), expiresIn: 7200,
        account: { id: String(account._id), fullName: account.fullName, email: account.email, role: account.role, status: account.status } },
      requestId: response.locals.requestId });
    });
  }
  router.use((error, _request, response, _next) => {
    if (error instanceof RateExceeded) {
      response.set('Retry-After', String(error.retryAfter));
      return fail(response, 429, 'RATE_LIMITED', 'Too many authentication attempts');
    }
    if (error?.type === 'entity.too.large') return fail(response, 413, 'BODY_TOO_LARGE', 'Authentication body is too large');
    if (error?.type === 'entity.parse.failed') return fail(response, 400, 'MALFORMED_JSON', 'Malformed JSON');
    return fail(response, 503, 'DEPENDENCY_UNAVAILABLE', 'Authentication is temporarily unavailable');
  });
  return router;
}
