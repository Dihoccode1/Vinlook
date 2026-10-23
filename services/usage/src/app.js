import express from 'express';

/** Unimplemented routes deliberately return 404; health/config belongs to TASK-003. */
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  return app;
}
