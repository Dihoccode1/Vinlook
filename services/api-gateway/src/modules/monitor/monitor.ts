import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { create_render_metrics_reader, type RenderMetricsSnapshot } from './render-metrics.js';

export function monitor_routes(
  targets: { id: string; name: string; url: string; database?: string }[],
  key = process.env.ADMIN_API_KEY,
  fetcher: typeof fetch = fetch,
  get_render_metrics: () => Promise<RenderMetricsSnapshot> = create_render_metrics_reader({
    fetcher,
  }),
) {
  const router = Router();
  async function read_render_metrics_safely(): Promise<RenderMetricsSnapshot> {
    try {
      return await get_render_metrics();
    } catch {
      return {
        status: 'error',
        cpu_percent: null,
        memory_used_mib: null,
        memory_limit_mib: null,
        updated_at: null,
        checked_at: new Date().toISOString(),
        message: 'Không lấy được số liệu CPU/RAM từ Render Metrics API.',
      };
    }
  }
  router.get('/admin/monitor', async (req, res) => {
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
    const [services, render_metrics] = await Promise.all([
      Promise.all(
        targets.map(async (target) => {
          const start = performance.now();
          try {
            const response = await fetcher(new URL('/health/ready', target.url), {
              signal: AbortSignal.timeout(4000),
              redirect: 'error',
            });
            const body = await response.json();
            const healthy = response.ok && body?.status === 'ok' && body?.service === target.id;
            const providers =
              target.id === 'translation-service' &&
              body?.service === target.id &&
              Array.isArray(body.providers)
                ? body.providers
                    .filter(
                      (p: any) =>
                        p &&
                        typeof p.name === 'string' &&
                        ['translation', 'tts'].includes(p.kind) &&
                        ['unknown', 'available', 'limited', 'unconfigured', 'error'].includes(
                          p.status,
                        ),
                    )
                    .map((p: any) => ({
                      id: String(p.id),
                      name: p.name,
                      kind: p.kind,
                      status: p.status,
                      checked_at: typeof p.checked_at === 'string' ? p.checked_at : null,
                    }))
                : [];
            return {
              id: target.id,
              name: target.name,
              status: healthy ? 'healthy' : 'unavailable',
              latency_ms: Math.round(performance.now() - start),
              database: target.database ?? null,
              providers,
            };
          } catch {
            return {
              id: target.id,
              name: target.name,
              status: 'unreachable',
              latency_ms: null,
              database: target.database ?? null,
            };
          }
        }),
      ),
      read_render_metrics_safely(),
    ]);
    res.json({
      data: {
        checked_at: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        services: [
          {
            id: 'api-gateway',
            name: 'API Gateway',
            status: 'healthy',
            latency_ms: null,
            database: null,
          },
          ...services,
        ],
        render_metrics,
      },
    });
  });
  return router;
}
