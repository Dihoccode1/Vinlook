import express from 'express';
import { protectedRequest } from '../../authorization.js';
import { createDraftService } from './poi.service.js';
import { createPoiController } from './poi.controller.js';
import { DraftFailure } from './poi.validation.js';

export function createPoiRouter(runtime) {
  const router = express.Router(),
    controller = createPoiController(createDraftService(runtime));
  const authorize = (write) =>
    protectedRequest(runtime.authorization, { roles: ['Staff', 'Manager'], requireSession: write });
  const json = [
    (request, _response, next) =>
      request.is('application/json')
        ? next()
        : next(new DraftFailure('UNSUPPORTED_MEDIA_TYPE', 415)),
    express.json({ limit: 131072, strict: true }),
  ];
  const handle = (action) => async (request, response, next) => {
    try {
      const result = await action(request, response.locals.principal);
      response.status(result.status).json({ ...result.body, requestId: response.locals.requestId });
    } catch (error) {
      next(error);
    }
  };
  router.post('/admin/pois', authorize(true), ...json, handle(controller.create));
  router.post('/admin/pois/:id/draft', authorize(true), ...json, handle(controller.clone));
  router.patch('/admin/revisions/:id', authorize(true), ...json, handle(controller.patch));
  router.patch(
    '/admin/revisions/:id/languages/:code',
    authorize(true),
    ...json,
    handle(controller.patchLocale),
  );
  router.get('/admin/pois/:id', authorize(false), handle(controller.read));
  return router;
}
