/**
 * @file app.ts
 * @description Điểm khởi tạo ứng dụng API Gateway chính
 * Đồ án môn học Công nghệ Phần mềm - Nền tảng Du lịch Đa ngôn ngữ Vinlook
 * Đóng vai trò cổng giao tiếp trung tâm (API Gateway Pattern):
 * - Xác thực và phân quyền tài khoản quản trị (Admin / Staff)
 * - Chuyển tiếp yêu cầu (Reverse Proxy) tới các microservice POI, Navigation, Translation
 * - Ghi nhận nhật ký sự kiện, kiểm tra sức khỏe và đo lường hoạt động thời gian thực
 */

import express from 'express';
import type { ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { activity_routes } from './activity.js';
import { monitor_routes } from './monitor.js';
import { admin_auth } from './admin-auth.js';
import { user_routes } from './users.js';
import { create_event_journal } from './event-journal.js';
import { delivery_status_routes } from './delivery-status.js';
import { config } from './config/index.js';
import { create_health_router } from './health/health.router.js';

/**
 * Khởi tạo ứng dụng Express cho API Gateway
 * @param poi_service_url Địa chỉ POI Service (mặc định lấy từ biến môi trường hoặc cổng 4001)
 * @param navigation_service_url Địa chỉ Navigation Service (mặc định cổng 4002)
 * @param translation_service_url Địa chỉ Translation Service (mặc định cổng 4003)
 */
export function create_app(
  poi_service_url = process.env.POI_SERVICE_URL ?? config.poiServiceUrl,
  navigation_service_url = process.env.NAVIGATION_SERVICE_URL ?? config.navigationServiceUrl,
  translation_service_url = process.env.TRANSLATION_SERVICE_URL ?? config.translationServiceUrl
) {
  const app = express();

  // 1. Bảo mật: Ẩn thông tin công nghệ máy chủ và áp dụng HTTP Security Headers qua Helmet
  app.disable('x-powered-by');
  app.use(helmet());

  // 2. Ghi nhật ký sự kiện kiểm toán (Event Journal)
  const journal = create_event_journal();
  app.use(journal.middleware);

  // 3. Router kiểm tra sức khỏe độc lập
  app.use(create_health_router());

  // 4. Các route quản trị hệ thống (yêu cầu xác thực Admin/Staff qua cookie/header)
  app.use('/api/admin', admin_auth());
  app.use('/api/admin', journal.router);
  app.use('/api/admin', delivery_status_routes());
  app.use('/api/admin/users', user_routes());

  // 5. Các route công khai: Hoạt động du khách & Giám sát dịch vụ
  app.use('/api', activity_routes());
  app.use(
    '/api',
    monitor_routes([
      { id: 'poi-service', name: 'Quản lý POI', url: poi_service_url, database: 'PoiDb' },
      { id: 'navigation-service', name: 'Tìm đường', url: navigation_service_url },
      { id: 'translation-service', name: 'Dịch thuật & Thuyết minh', url: translation_service_url, database: 'TranslationDb' }
    ])
  );

  // 6. Reverse Proxy cho các tác vụ quản trị POI (Admin POI Proxy)
  app.use('/api/admin', express.json({ limit: config.limits.adminBody }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const incoming = new URL(req.originalUrl, 'http://gateway.local');
      const target = new URL(poi_service_url);
      target.pathname = incoming.pathname.replace(/^\/api/, '');
      target.search = incoming.search;

      const upstream = await fetch(target, {
        method: req.method,
        headers: {
          'content-Type': 'application/json',
          'x-admin-key': req.get('x-admin-key') ?? '',
          'x-admin-user-id': req.get('x-admin-user-id') ?? ''
        },
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
        signal: AbortSignal.timeout(config.timeouts.poiRequestMs),
        redirect: 'error'
      });

      res.status(upstream.status).type('application/json').send(await upstream.text());
    } catch {
      res.status(502).json({
        error: {
          code: 'ADMIN_UNAVAILABLE',
          message: 'Không kết nối được dịch vụ quản trị.'
        }
      });
    }
  });

  // 7. Proxy thuyết minh âm thanh đa ngôn ngữ (Audio Narration Proxy)
  app.post('/api/pois/:id/narration', express.json({ limit: config.limits.narrationBody }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const upstream = await fetch(
        new URL(`/pois/${encodeURIComponent(String(req.params.id))}/narration`, translation_service_url),
        {
          method: 'POST',
          headers: { 'content-Type': 'application/json' },
          body: JSON.stringify(req.body ?? null),
          signal: AbortSignal.timeout(config.timeouts.translationAudioMs),
          redirect: 'error'
        }
      );
      res
        .status(upstream.status)
        .type(upstream.ok ? 'audio/wav' : 'application/json')
        .send(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      res.status(502).json({
        error: { message: 'Không thể tải thuyết minh. Hãy thử lại.' }
      });
    }
  });

  // 8. Proxy danh sách ngôn ngữ hỗ trợ (Languages Proxy)
  app.get('/api/languages', async (_req, res) => {
    try {
      const upstream = await fetch(new URL('/languages', translation_service_url), {
        signal: AbortSignal.timeout(config.timeouts.healthCheckMs),
        redirect: 'error'
      });
      res.status(upstream.status).type('application/json').send(await upstream.text());
    } catch {
      res.status(502).json({
        error: { message: 'Không thể tải danh sách ngôn ngữ' }
      });
    }
  });

  // 9. Proxy dịch thuật kịch bản (Translation Proxy)
  app.post('/api/pois/:id/translation', express.json({ limit: config.limits.translationBody }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const upstream = await fetch(
        new URL(`/pois/${encodeURIComponent(String(req.params.id))}/translation`, translation_service_url),
        {
          method: 'POST',
          headers: { 'content-Type': 'application/json' },
          body: JSON.stringify(req.body ?? null),
          signal: AbortSignal.timeout(config.timeouts.translationTextMs),
          redirect: 'error'
        }
      );
      res.status(upstream.status).type('application/json').send(await upstream.text());
    } catch {
      res.status(502).json({
        error: { message: 'Dịch vụ dịch tạm thời không khả dụng' }
      });
    }
  });

  // 10. Proxy tìm đường đi bộ / xe máy (Navigation Routes Proxy)
  app.post('/api/routes', express.json({ limit: config.limits.routesBody }), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const url = new URL('/routes', navigation_service_url);
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'content-Type': 'application/json' },
        body: JSON.stringify(req.body ?? null),
        signal: AbortSignal.timeout(config.timeouts.navigationMs),
        redirect: 'error'
      });
      res.status(upstream.status).type('application/json').send(await upstream.text());
    } catch {
      res.status(502).json({
        error: {
          code: 'UPSTREAM_UNAVAILABLE',
          message: 'Navigation service is unavailable'
        }
      });
    }
  });

  // 11. Kubernetes liveness & readiness probes
  app.get('/health/live', (_req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

  app.get('/health/ready', async (_req, res) => {
    try {
      const response = await fetch(`${poi_service_url}/health/ready`, {
        signal: AbortSignal.timeout(config.timeouts.healthCheckMs)
      });
      res.status(response.ok ? 200 : 503).json({
        status: response.ok ? 'ok' : 'unavailable',
        service: 'api-gateway'
      });
    } catch {
      res.status(503).json({ status: 'unavailable', service: 'api-gateway' });
    }
  });

  // 12. Proxy công khai danh sách và chi tiết POI cho du khách (Public POI Proxy)
  app.use('/api/pois', async (req, res) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported' }
      });
      return;
    }
    try {
      const target = new URL(poi_service_url);
      const incoming = new URL(req.originalUrl, 'http://gateway.local');
      target.pathname = incoming.pathname.replace(/^\/api/, '');
      target.search = incoming.search;

      const headers: Record<string, string> = {};
      if (req.headers['if-none-match']) headers['If-None-Match'] = req.headers['if-none-match'];

      const upstream = await fetch(target, {
        headers,
        signal: AbortSignal.timeout(config.timeouts.poiRequestMs),
        redirect: 'error'
      });

      const body = Buffer.from(await upstream.arrayBuffer());
      for (const name of ['content-type', 'cache-control', 'etag']) {
        const value = upstream.headers.get(name);
        if (value) res.setHeader(name, value);
      }
      res.status(upstream.status).send(body);
    } catch {
      res.status(502).json({
        error: { code: 'UPSTREAM_UNAVAILABLE', message: 'POI service is unavailable' }
      });
    }
  });

  // 13. Xử lý đường dẫn không tồn tại (404 Not Found)
  app.use((_req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
  );

  // 14. Bắt lỗi tập trung (Error Handler)
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    res.setHeader('Cache-Control', 'no-store');
    const status =
      error?.type === 'entity.too.large'
        ? 413
        : error?.type === 'entity.parse.failed'
        ? 400
        : 500;
    res.status(status).json({
      error: {
        code: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_BODY',
        message: 'Unable to process request'
      }
    });
  };
  app.use(errors);

  return app;
}
