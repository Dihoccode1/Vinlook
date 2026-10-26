import express from 'express';
import { z } from 'zod';
import { parse, objectId, DraftFailure } from '../drafts/validation.js';
import { query, listQuery, detailQuery, nearbyQuery } from './validation.js';
import { createPublicService } from './service.js';
export function publicRouter(runtime) {
  const router = express.Router(),
    service = createPublicService(runtime);
  const run = (fn) => async (req, res, next) => {
    try {
      const data = await fn(req);
      if (
        Buffer.byteLength(JSON.stringify({ data, requestId: res.locals.requestId })) >
        8 * 1024 * 1024
      )
        throw new DraftFailure('PUBLIC_CONTENT_UNAVAILABLE');
      res.json({ data, requestId: res.locals.requestId });
    } catch (error) {
      next(error);
    }
  };
  router.get(
    '/pois/deletions',
    run((req) => {
      query(z.strictObject({}), req);
      return service.deletions();
    }),
  );
  router.get(
    '/pois/nearby',
    run((req) => service.nearby(query(nearbyQuery, req))),
  );
  router.get(
    '/pois',
    run((req) => service.list(query(listQuery, req))),
  );
  router.get(
    '/pois/:id',
    run((req) => service.detail(parse(objectId, req.params.id), query(detailQuery, req).language)),
  );
  return router;
}
