import express from 'express';
import { z } from 'zod';
import { protectedRequest } from '../authorization.js';
import { parse, DraftFailure } from '../drafts/validation.js';
import { uuid } from '../durability/validation.js';
export function adapterRouter(runtime) {
  const router = express.Router();
  router.post(
    '/admin/adapters/translation/preflight',
    protectedRequest(runtime.authorization, { roles: ['Manager'], requireSession: true }),
    (req, res, next) =>
      req.is('application/json') ? next() : next(new DraftFailure('UNSUPPORTED_MEDIA_TYPE', 415)),
    express.json({ limit: 16384, strict: true }),
    async (req, res, next) => {
      try {
        parse(z.strictObject({}), req.body);
        if (!runtime.translationPreflight) throw new DraftFailure('JOB_CONFIGURATION_UNAVAILABLE');
        const data = await runtime.translationPreflight();
        res.json({ data, requestId: res.locals.requestId });
      } catch (error) {
        if (error?.code === 'ADAPTER_PREFLIGHT_COOLDOWN') res.set('Retry-After', '60');
        next(error);
      }
    },
  );
  router.post(
    '/admin/jobs/run-next',
    protectedRequest(runtime.authorization, { roles: ['Staff', 'Manager'], requireSession: true }),
    (req, res, next) =>
      req.is('application/json') ? next() : next(new DraftFailure('UNSUPPORTED_MEDIA_TYPE', 415)),
    express.json({ limit: 131072, strict: true }),
    async (req, res, next) => {
      try {
        parse(z.strictObject({}), req.body);
        const key = parse(uuid, req.get('Idempotency-Key'));
        if (!runtime.adapters) throw new DraftFailure('JOB_CONFIGURATION_UNAVAILABLE');
        const r = await runtime.adapters.runNext(res.locals.principal, key);
        res.status(r.status).json({ ...r.body, requestId: res.locals.requestId });
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
