import { Router, json } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const activity_timeout_ms = 30_000;

export function create_activity_tracker(now = Date.now) {
  const sessions = new Map<
    string,
    { sequence: number; active: boolean; seen: number; quiet_since: number | null }
  >();
  function prune(time: number) {
    for (const [id, session] of sessions)
      if (time - session.seen >= activity_timeout_ms) sessions.delete(id);
  }
  return {
    heartbeat(input: { id: string; sequence: number; active: boolean; listening: boolean }) {
      const time = now();
      prune(time);
      const previous = sessions.get(input.id);
      if (previous && previous.sequence >= input.sequence) return;
      if (!previous && sessions.size >= 10000) throw new Error('ACTIVITY_CAPACITY');
      sessions.set(input.id, {
        sequence: input.sequence,
        active: input.active,
        seen: time,
        quiet_since: input.active && input.listening ? null : (previous?.quiet_since ?? time),
      });
    },
    snapshot() {
      const time = now();
      prune(time);
      let visitors = 0;
      let listeners = 0;
      for (const session of sessions.values()) {
        if (!session.active) continue;
        if (session.quiet_since === null) listeners++;
        if (session.quiet_since === null || time - session.quiet_since < activity_timeout_ms)
          visitors++;
      }
      return { visitors, listeners };
    },
  };
}
export function activity_routes(
  key = process.env.ADMIN_API_KEY,
  tracker = create_activity_tracker(),
) {
  const router = Router();
  router.post('/activity/heartbeat', json({ limit: '1kb' }), (req, res) => {
    const input = z
      .object({
        id: z.string().uuid(),
        sequence: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
        active: z.boolean(),
        listening: z.boolean(),
      })
      .strict()
      .safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: { code: 'INVALID_ACTIVITY' } });
      return;
    }
    try {
      tracker.heartbeat(input.data);
      res.status(204).end();
    } catch {
      res.status(503).json({ error: { code: 'ACTIVITY_CAPACITY' } });
    }
  });
  router.get('/admin/activity', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const received = req.get('x-admin-key') ?? '';
    if (
      !key ||
      Buffer.byteLength(key) !== Buffer.byteLength(received) ||
      !timingSafeEqual(Buffer.from(key), Buffer.from(received))
    ) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    res.json({ data: tracker.snapshot() });
  });
  return router;
}
