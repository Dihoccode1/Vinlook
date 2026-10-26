import express from 'express';
import { createAuthController } from './auth.controller.js';
import {
  createAuthOriginMiddleware,
  createAuthRateLimit,
} from '../../middlewares/auth.middleware.js';
import { authErrorMiddleware } from '../../middlewares/error.middleware.js';

// Only the existing /register and /login subrouter. Staff, sessions, audit and
// authorization remain mounted independently by src/app.js, unchanged.
export function authRouter(runtime) {
  const router = express.Router();
  const controller = createAuthController(runtime);
  router.use(createAuthOriginMiddleware(runtime.config));
  for (const operation of ['register', 'login']) {
    router.post(
      `/${operation}`,
      createAuthRateLimit(runtime, operation),
      express.json({ limit: '16kb', strict: true }),
      controller[operation],
    );
  }
  router.use(authErrorMiddleware);
  return router;
}
