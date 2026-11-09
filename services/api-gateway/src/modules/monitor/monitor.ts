import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';

export function monitor_routes(targets: { id: string; name: string; url: string; database?: string }[], key = process.env.ADMIN_API_KEY, fetcher: typeof fetch = fetch) {
  const router = Router();
  router.get('/admin/monitor', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const received = req.get('x-admin-key') ?? '';
    if (!key || Buffer.byteLength(key) !== Buffer.byteLength(received) || !timingSafeEqual(Buffer.from(key), Buffer.from(received))) { res.status(401).json({ error: { code: 'UNAUTHORIZED' } }); return; }
    const services = await Promise.all(targets.map(async target => {
      const start = performance.now();
      try {
        const response = await fetcher(new URL('/health/ready', target.url), { signal: AbortSignal.timeout(4000), redirect: 'error' });
        const body = await response.json();
        const healthy = response.ok && body?.status === 'ok' && body?.service === target.id;
        return { id: target.id, name: target.name, status: healthy ? 'healthy' : 'unavailable', latency_ms: Math.round(performance.now() - start), database: target.database ?? null };
      } catch { return { id: target.id, name: target.name, status: 'unreachable', latency_ms: null, database: target.database ?? null }; }
    }));
    res.json({ data: { checked_at: new Date().toISOString(), uptime_seconds: Math.floor(process.uptime()), services: [{ id: 'api-gateway', name: 'API Gateway', status: 'healthy', latency_ms: null, database: null }, ...services] } });
  });
  return router;
}
