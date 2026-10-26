import { adapterRouter } from '../adapters/router.js';
import { monitoringRouter } from '../monitoring.js';
import express from 'express';
import { mediaRouter } from '../media/router.js';
import { jobRouter } from '../jobs/router.js';
import { publicRouter } from '../public/router.js';
import { lifecycleRouter } from '../lifecycle/router.js';
import { publicationRouter } from '../publication/router.js';
import { randomUUID } from 'node:crypto';
import { MutationFailure } from '../durability/validation.js';
import { DraftFailure } from './validation.js';
import { createPoiRouter } from '../modules/pois/poi.route.js';
const messages = {
  ADAPTER_BUSY: 'An adapter job is already running',
  PROVIDER_RETRY_CONFIRMATION_REQUIRED:
    'The previous provider outcome is unknown; explicitly confirm a new provider request',
  ADAPTER_FREE_TIER_REVIEW_REQUIRED: 'Review the project free tier before running adapters',
  POI_NOT_FOUND: 'The POI was not found',
  PUBLIC_CONTENT_UNAVAILABLE: 'Public content is temporarily unavailable',
  PUBLIC_SNAPSHOT_CHANGED: 'Public content changed; restart the list',
  INVALID_CURSOR: 'The cursor is invalid',
  CURSOR_EXPIRED: 'The cursor expired; restart the list',
  POI_ALREADY_DELETED: 'The POI is already deleted',
  POI_NOT_DELETED: 'The POI is not deleted',
  INVALID_INPUT: 'Invalid content input',
  CONTENT_NOT_FOUND: 'Content was not found',
  POI_DELETED: 'The POI is deleted',
  REVISION_NOT_EDITABLE: 'The revision is not editable',
  EDIT_VERSION_CONFLICT: 'The content has changed; reload before editing',
  WORKING_REVISION_EXISTS: 'A working revision already exists',
  NO_PUBLISHED_REVISION: 'No published revision exists',
  VERSION_EXHAUSTED: 'The version limit was reached',
  IDEMPOTENCY_CONFLICT: 'The idempotency key conflicts with the request',
  INVALID_MEDIA_REFERENCE: 'The media reference is invalid',
  MEDIA_VERIFICATION_UNAVAILABLE: 'Media verification is unavailable',
  IDEMPOTENCY_RECONCILIATION_REQUIRED: 'The mutation requires reconciliation',
};
export function draftRouter(runtime) {
  const router = express.Router();
  router.use(monitoringRouter(runtime));
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.locals.requestId = randomUUID();
    const origin = req.get('Origin');
    if (origin && !runtime.origins.includes(origin))
      return next(new DraftFailure('ACCESS_DENIED', 403));
    if (origin) {
      res.set('Access-Control-Allow-Origin', origin);
      res.vary('Origin');
    }
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Authorization,Content-Type,Idempotency-Key');
      return res.status(204).end();
    }
    if (
      !/^\/pois(?:\/|$)/.test(req.path) &&
      !(req.method === 'GET' && req.path === '/admin/jobs') &&
      req.originalUrl.includes('?')
    )
      return next(new DraftFailure('INVALID_INPUT', 422));
    next();
  });
  router.use(adapterRouter(runtime));
  router.use(jobRouter(runtime));
  router.use(publicRouter(runtime));
  router.use(lifecycleRouter(runtime));
  router.use(mediaRouter(runtime));
  router.use(publicationRouter(runtime));
  // Preserve all sibling routers above; this module owns only the existing five POI routes.
  router.use(createPoiRouter(runtime));
  router.use((error, req, res, _next) => {
    if (res.headersSent) return;
    let status = 503,
      code = 'CONTENT_UNAVAILABLE';
    if (error instanceof MutationFailure) {
      status = error.status;
      code = error.code;
    } else if (error.type === 'entity.too.large') {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
    } else if (error.type === 'entity.parse.failed') {
      status = 400;
      code = 'MALFORMED_JSON';
    }
    const message =
      messages[code] ??
      {
        ACCESS_DENIED: 'Access is denied',
        UNSUPPORTED_MEDIA_TYPE: 'JSON content is required',
        PAYLOAD_TOO_LARGE: 'The request is too large',
        MALFORMED_JSON: 'Malformed JSON',
      }[code] ??
      'Content is temporarily unavailable';
    res
      .status(status)
      .json({ error: { code, message, requestId: res.locals.requestId ?? randomUUID() } });
  });
  return router;
}
