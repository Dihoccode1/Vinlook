import express from 'express';
import { limits } from './usage.policy.js';
import { createUsageController } from './usage.controller.js';

export function createUsageRouter(runtime) {
  const router = express.Router();
  const parseJson = express.json({ limit: limits.bodyBytes, strict: true, inflate: false });
  router.use(createUsageController(runtime, parseJson));
  return router;
}
