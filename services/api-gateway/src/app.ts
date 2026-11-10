/**
 * @file app.ts
 * @description Khởi tạo ứng dụng Express cho API Gateway (API Gateway Pattern) - Vinlook.
 * - Xác thực và phân quyền tài khoản quản trị (Admin / Staff)
 * - Chuyển tiếp yêu cầu (reverse proxy) tới POI, Navigation, Translation Service
 * - Ghi nhật ký sự kiện, kiểm tra sức khỏe và đo lường hoạt động thời gian thực
 */

import express from 'express';
import helmet from 'helmet';
import { config } from './config/index.js';
import { create_health_router } from './health/health.router.js';
import { admin_auth } from './middleware/admin-auth.js';
import { error_middleware, not_found_middleware } from './middleware/error.middleware.js';
import { activity_routes } from './modules/activity/activity.js';
import { delivery_status_routes } from './modules/delivery-status/delivery-status.js';
import { create_event_journal } from './modules/event-journal/event-journal.js';
import { monitor_routes } from './modules/monitor/monitor.js';
import { user_routes } from './modules/users/users.js';
import { forward, json_body, JSON_HEADERS, rewrite_target } from './proxies/proxy.util.js';

/**
 * Tạo ứng dụng API Gateway.
 * Tham số URL cho phép test truyền địa chỉ service giả lập; mặc định lấy từ biến môi trường.
 */
export function create_app(
  poi_service_url = process.env.POI_SERVICE_URL ?? config.poi_service_url,
  navigation_service_url = process.env.NAVIGATION_SERVICE_URL ?? config.navigation_service_url,
  translation_service_url = process.env.TRANSLATION_SERVICE_URL ?? config.translation_service_url
) {
  const app = express();
  const { timeouts, limits } = config;

  // 1. Bảo mật: ẩn công nghệ máy chủ và áp dụng HTTP security headers
  app.disable('x-powered-by');
  app.use(helmet());

  // 2. Nhật ký sự kiện (event journal) cho trang giám sát
  const journal = create_event_journal();
  app.use(journal.middleware);

  // 3. Kiểm tra sức khỏe: /health, /health/live, /health/ready
  app.use(create_health_router(poi_service_url));

  // 4. Nhóm route quản trị (yêu cầu đăng nhập Admin/Staff)
  app.use('/api/admin', admin_auth());
  app.use('/api/admin', journal.router);
  app.use('/api/admin', delivery_status_routes());
  app.use('/api/admin/users', user_routes());

  // 5. Route công khai: hoạt động du khách và giám sát dịch vụ
  app.use('/api', activity_routes());
  app.use(
    '/api',
    monitor_routes([
      { id: 'poi-service', name: 'Quản lý POI', url: poi_service_url, database: 'PoiDb' },
      { id: 'navigation-service', name: 'Tìm đường', url: navigation_service_url },
      { id: 'translation-service', name: 'Dịch thuật & Thuyết minh', url: translation_service_url, database: 'TranslationDb' }
    ])
  );

  // 6. Proxy quản trị POI: chuyển nguyên phương thức, body và danh tính admin sang POI Service
  app.use('/api/admin', express.json({ limit: limits.admin_body }), (req, res) =>
    forward(res, {
      target: rewrite_target(poi_service_url, req.originalUrl),
      method: req.method,
      headers: {
        ...JSON_HEADERS,
        'x-admin-key': req.get('x-admin-key') ?? '',
        'x-admin-user-id': req.get('x-admin-user-id') ?? ''
      },
      body: json_body(req.method, req.body),
      timeout_ms: timeouts.poi_request_ms,
      mode: 'json',
      error: { code: 'ADMIN_UNAVAILABLE', message: 'Không kết nối được dịch vụ quản trị.' }
    })
  );

  // 7. Thuyết minh âm thanh đa ngôn ngữ (trả file WAV)
  app.post('/api/pois/:id/narration', express.json({ limit: limits.narration_body }), (req, res) =>
    forward(res, {
      target: new URL(`/pois/${encodeURIComponent(String(req.params.id))}/narration`, translation_service_url),
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(req.body ?? null),
      timeout_ms: timeouts.translation_audio_ms,
      mode: 'audio',
      error: { message: 'Không thể tải thuyết minh. Hãy thử lại.' }
    })
  );

  // 8. Danh sách ngôn ngữ hỗ trợ (cho phép trình duyệt cache theo header của upstream)
  app.get('/api/languages', (_req, res) =>
    forward(res, {
      target: new URL('/languages', translation_service_url),
      timeout_ms: timeouts.health_check_ms,
      mode: 'json',
      no_store: false,
      error: { message: 'Không thể tải danh sách ngôn ngữ' }
    })
  );

  // 9. Dịch nội dung POI
  app.post('/api/pois/:id/translation', express.json({ limit: limits.translation_body }), (req, res) =>
    forward(res, {
      target: new URL(`/pois/${encodeURIComponent(String(req.params.id))}/translation`, translation_service_url),
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(req.body ?? null),
      timeout_ms: timeouts.translation_text_ms,
      mode: 'json',
      error: { message: 'Dịch vụ dịch tạm thời không khả dụng' }
    })
  );

  // 10. Tìm đường đi bộ / xe máy / ô tô
  app.post('/api/routes', express.json({ limit: limits.routes_body }), (req, res) =>
    forward(res, {
      target: new URL('/routes', navigation_service_url),
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(req.body ?? null),
      timeout_ms: timeouts.navigation_ms,
      mode: 'json',
      error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Navigation service is unavailable' }
    })
  );

  // 11. Danh sách / chi tiết / ảnh POI công khai (chỉ GET, giữ ETag để cache ảnh)
  app.use('/api/pois', (req, res) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported' } });
      return;
    }
    const etag = req.headers['if-none-match'];
    return forward(res, {
      target: rewrite_target(poi_service_url, req.originalUrl),
      headers: etag ? { 'If-None-Match': etag } : {},
      timeout_ms: timeouts.poi_request_ms,
      mode: 'passthrough',
      no_store: false,
      error: { code: 'UPSTREAM_UNAVAILABLE', message: 'POI service is unavailable' }
    });
  });

  // 12. 404 và xử lý lỗi tập trung
  app.use(not_found_middleware);
  app.use(error_middleware);

  return app;
}
