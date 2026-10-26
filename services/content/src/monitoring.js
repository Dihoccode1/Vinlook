import express from 'express';
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
export const jobStatuses = ['queued', 'running', 'succeeded', 'failed', 'waiting_quota'];
const digest = (value) => createHash('sha256').update(value).digest();
export function monitoringKey(environment = process.env) {
  const value = environment.CONTENT_USAGE_CALLER_KEY_B64URL;
  if (value === undefined) return null;
  if (
    !/^[A-Za-z0-9_-]{43}$/.test(value) ||
    Buffer.from(value, 'base64url').toString('base64url') !== value ||
    [
      'CONTENT_WORKER_KEY_B64URL',
      'CONTENT_WORKER_OLD_KEY_B64URL',
      'CONTENT_IDENTITY_SERVICE_KEY_B64URL',
      'CONTENT_PUBLIC_CURSOR_KEY_B64URL',
    ].some((key) => environment[key] === value)
  )
    throw Error('Invalid monitoring caller configuration');
  return digest(value);
}
export async function jobSummary(runtime) {
  if (!runtime.models.ProcessingJob) throw Error('Unavailable');
  const session = await runtime.connection.startSession();
  try {
    return await session.withTransaction(
      async () => {
        const counts = {};
        for (const status of jobStatuses) {
          const count = await runtime.models.ProcessingJob.countDocuments({ status })
            .session(session)
            .maxTimeMS(2500);
          if (!Number.isSafeInteger(count) || count < 0) throw Error('Unavailable');
          counts[status] = count;
        }
        const observed = await runtime.models.ProcessingJob.findOne({
          'inputSnapshot.execution': 'local_worker',
          workerObservedAt: { $type: 'date' },
        })
          .select({ workerObservedAt: 1, _id: 0 })
          .sort({ workerObservedAt: -1 })
          .session(session)
          .maxTimeMS(2500)
          .lean();
        return {
          asOf: new Date(runtime.now()).toISOString(),
          counts,
          worker: { lastObservedAt: observed?.workerObservedAt?.toISOString() ?? null },
        };
      },
      { readConcern: { level: 'snapshot' }, readPreference: 'primary', timeoutMS: 3000 },
    );
  } finally {
    await session.endSession();
  }
}
export function monitoringRouter(runtime) {
  const router = express.Router();
  let busy = false;
  router.all('/internal/monitoring/jobs-summary', async (req, res) => {
    const requestId = randomUUID();
    res.set('Cache-Control', 'no-store');
    const denied = () =>
      res
        .status(403)
        .json({ error: { code: 'ACCESS_DENIED', message: 'Access is denied', requestId } });
    if (
      req.get('Origin') !== undefined ||
      req.get('Authorization') !== undefined ||
      !runtime.monitoringCallerKey ||
      req.get('X-Vinlook-Service') !== 'usage'
    )
      return denied();
    const supplied = req.get('X-Vinlook-Service-Key');
    if (
      typeof supplied !== 'string' ||
      supplied.length !== 43 ||
      !timingSafeEqual(digest(supplied), runtime.monitoringCallerKey)
    )
      return denied();
    if (
      req.method !== 'GET' ||
      req.originalUrl.includes('?') ||
      req.get('Transfer-Encoding') ||
      (req.get('Content-Length') && req.get('Content-Length') !== '0')
    )
      return res
        .status(422)
        .json({ error: { code: 'INVALID_INPUT', message: 'Invalid input', requestId } });
    if (busy)
      return res.status(503).json({
        error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Dependency unavailable', requestId },
      });
    busy = true;
    try {
      res.json({ data: await jobSummary(runtime), requestId });
    } catch {
      res.status(503).json({
        error: { code: 'DEPENDENCY_UNAVAILABLE', message: 'Dependency unavailable', requestId },
      });
    } finally {
      busy = false;
    }
  });
  return router;
}
