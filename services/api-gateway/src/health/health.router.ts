/**
 * @file health.router.ts
 * @description Endpoint kiểm tra sức khỏe và độ sẵn sàng của API Gateway (/health)
 */

import { Router } from 'express';

export function create_health_router() {
  const router = Router();

  /**
   * GET /health
   * Trả về thông tin uptime, thời gian hiện tại và phiên bản dịch vụ
   */
  router.get('/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      status: 'healthy',
      service: 'api-gateway',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  return router;
}
