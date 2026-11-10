/**
 * @file health.router.ts
 * @description Các endpoint kiểm tra sức khỏe của API Gateway:
 * - GET /health        : thông tin uptime (dùng cho giám sát thủ công)
 * - GET /health/live   : liveness probe, gateway còn chạy
 * - GET /health/ready  : readiness probe, gateway kết nối được POI Service
 */

import { Router } from 'express';
import { config } from '../config/index.js';

export function create_health_router(poi_service_url: string) {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      status: 'healthy',
      service: 'api-gateway',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  router.get('/health/live', (_req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

  router.get('/health/ready', async (_req, res) => {
    try {
      const response = await fetch(`${poi_service_url}/health/ready`, {
        signal: AbortSignal.timeout(config.timeouts.health_check_ms)
      });
      res.status(response.ok ? 200 : 503).json({
        status: response.ok ? 'ok' : 'unavailable',
        service: 'api-gateway'
      });
    } catch {
      res.status(503).json({ status: 'unavailable', service: 'api-gateway' });
    }
  });

  return router;
}
