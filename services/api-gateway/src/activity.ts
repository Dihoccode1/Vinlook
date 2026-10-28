import { Router, json } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export function createActivityTracker(now = Date.now) {
  const sessions = new Map<string, { sequence: number; active: boolean; listening: boolean; seen: number }>();
  function prune() { for (const [id, session] of sessions) if (now() - session.seen > 45000) sessions.delete(id); }
  return {
    heartbeat(input: { id: string; sequence: number; active: boolean; listening: boolean }) {
      prune(); const previous = sessions.get(input.id);
      if (previous && previous.sequence >= input.sequence) return;
      if (!previous && sessions.size >= 10000) throw new Error('ACTIVITY_CAPACITY');
      sessions.set(input.id, { ...input, listening: input.active && input.listening, seen: now() });
    },
    snapshot() { prune(); const active = [...sessions.values()].filter(session => session.active); return { visitors: active.length, listeners: active.filter(session => session.listening).length }; },
  };
}
export function activityRoutes(key = process.env.ADMIN_API_KEY, tracker = createActivityTracker()) {
  const router = Router();
  router.post('/activity/heartbeat', json({ limit: '1kb' }), (req, res) => {
    const input = z.object({ id:z.string().uuid(), sequence:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), active:z.boolean(), listening:z.boolean() }).strict().safeParse(req.body);
    if (!input.success) { res.status(400).json({ error:{code:'INVALID_ACTIVITY'} }); return; }
    try { tracker.heartbeat(input.data); res.status(204).end(); }
    catch { res.status(503).json({ error:{code:'ACTIVITY_CAPACITY'} }); }
  });
  router.get('/admin/activity', (req, res) => {
    res.setHeader('Cache-Control','no-store'); const received=req.get('x-admin-key')??'';
    if (!key || Buffer.byteLength(key)!==Buffer.byteLength(received) || !timingSafeEqual(Buffer.from(key),Buffer.from(received))) { res.status(401).json({error:{code:'UNAUTHORIZED'}});return; }
    res.json({data:tracker.snapshot()});
  });
  return router;
}
