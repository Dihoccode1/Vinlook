import express from 'express';
import { protectedRequest } from '../authorization.js';
import { MediaFailure, intentInput, empty, parseId, limits } from './validation.js';
import { readMultipart } from './multipart.js';
export async function discardBody(req) {
  if (req.readableEnded || req.destroyed) return;
  await new Promise((resolve) => {
    let drained = 0;
    const done = () => {
      clearTimeout(timer);
      req.off('data', count);
      req.off('end', done);
      req.off('close', done);
      resolve();
    };
    const count = (chunk) => {
      drained += chunk.length;
      if (drained > limits.audio + limits.overhead) {
        req.destroy();
        done();
      }
    };
    const timer = setTimeout(() => {
      req.destroy();
      done();
    }, 30000);
    req.on('error', done);
    req.on('data', count);
    req.once('end', done);
    req.once('close', done);
    req.resume();
  });
}
export function mediaRouter(runtime) {
  const router = express.Router(),
    auth = (write) =>
      protectedRequest(runtime.authorization, {
        roles: ['Staff', 'Manager'],
        requireSession: write,
      });
  const json = [
    (req, res, next) =>
      req.is('application/json') ? next() : next(new MediaFailure('UNSUPPORTED_MEDIA_TYPE', 415)),
    express.json({ limit: 16384, strict: true }),
  ];
  const parse = (schema, value) => {
    const r = schema.safeParse(value);
    if (!r.success) throw new MediaFailure('INVALID_MEDIA', 422);
    return r.data;
  };
  const run = (fn) => async (req, res, next) => {
    try {
      if (!runtime.media) throw new MediaFailure('MEDIA_VERIFICATION_UNAVAILABLE');
      const result = await fn(req, res.locals.principal);
      res.status(result.status ?? 200).json({ data: result.data, requestId: res.locals.requestId });
    } catch (error) {
      if (error.code === 'UPLOAD_BUSY') res.set('Retry-After', '5');
      if (req.method === 'PUT') {
        await discardBody(req);
        res.set('Connection', 'close');
      }
      next(error);
    }
  };
  const staffIntent = async (id, p) => {
    const row = await runtime.media.status(id, p);
    if (row.kind !== 'thumbnail') throw new MediaFailure('ACCESS_DENIED', 403);
  };
  router.post(
    '/admin/revisions/:id/media-intents',
    auth(true),
    ...json,
    run(async (req, p) => ({
      status: 201,
      data: await runtime.media.issueThumbnail(
        parseId(req.params.id),
        parse(intentInput, req.body),
        p,
      ),
    })),
  );
  router.put(
    '/admin/media-intents/:id/file',
    auth(true),
    run(async (req, p) => {
      const id = parseId(req.params.id);
      const deadline = Date.now() + 90000;
      const controller = new AbortController();
      const overall = setTimeout(() => controller.abort(), 90000);
      const abort = () => controller.abort();
      req.once('aborted', abort);
      const gone = () => {
        if (!resFinished()) abort();
      };
      const resFinished = () => req.res.writableEnded;
      req.res.once('close', gone);
      try {
        await staffIntent(id, p);
        return await runtime.media.upload(
          id,
          p,
          (kind, signal) => readMultipart(req, kind, signal),
          { signal: controller.signal, deadline },
        );
      } finally {
        clearTimeout(overall);
        req.off('aborted', abort);
        req.res.off('close', gone);
      }
    }),
  );
  router.get(
    '/admin/media-intents/:id',
    auth(false),
    run(async (req, p) => ({ data: await runtime.media.status(parseId(req.params.id), p) })),
  );
  router.post(
    '/admin/media-intents/:id/reconcile',
    auth(true),
    ...json,
    run(async (req, p) => {
      parse(empty, req.body);
      const id = parseId(req.params.id);
      await staffIntent(id, p);
      return { data: await runtime.media.reconcile(id, p) };
    }),
  );
  return router;
}
