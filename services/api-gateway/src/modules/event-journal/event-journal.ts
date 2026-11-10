/**
 * @file event-journal.ts
 * @description Nhật ký sự kiện hệ thống và hành vi sử dụng của du khách trong bộ nhớ đệm phục vụ màn hình giám sát.
 */

import { Router, type RequestHandler } from 'express';

export function create_event_journal() {
  let sequence = 0;
  type Entry = { id: number; time: string; level: 'info' | 'error'; message: string; status: number | null };
  const system: Entry[] = [];
  const usage: Entry[] = [];

  function record(list: Entry[], message: string, status: number | null = null) {
    list.unshift({
      id: ++sequence,
      time: new Date().toISOString(),
      level: status !== null && status >= 400 ? 'error' : 'info',
      message,
      status
    });
    list.splice(200);
  }

  record(system, 'Gateway khởi động');

  const middleware: RequestHandler = (req, res, next) => {
    const path = req.path;
    res.on('finish', () => {
      // Không lưu nội dung yêu cầu, chuỗi truy vấn, thông tin xác thực hay định danh thiết bị
      if (path.startsWith('/api/admin/monitor') || path === '/api/activity/heartbeat') return;
      const operation = path.startsWith('/api/admin/users')
        ? 'Quản lý tài khoản'
        : path.startsWith('/api/admin/pois')
          ? 'Quản lý địa điểm'
          : path.startsWith('/api/admin/auth')
            ? 'Xác thực quản trị'
            : 'Yêu cầu API';
      if (res.statusCode >= 400 || (path.startsWith('/api/admin/') && !['GET', 'HEAD'].includes(req.method))) {
        record(system, `${operation} · ${req.method}`, res.statusCode);
      }
      const event =
        req.method === 'GET' && /^\/api\/pois(?:\/[^/]+)?\/?$/.test(path)
          ? 'Xem địa điểm'
          : req.method === 'POST' && /^\/api\/pois\/[^/]+\/translation\/?$/.test(path)
            ? 'Yêu cầu dịch nội dung'
            : req.method === 'POST' && /^\/api\/pois\/[^/]+\/narration\/?$/.test(path)
              ? 'Yêu cầu thuyết minh'
              : req.method === 'POST' && path === '/api/routes'
                ? 'Tìm đường'
                : null;
      if (event) record(usage, event, res.statusCode);
    });
    next();
  };

  const router = Router();
  // Được gắn sau admin_auth: chỉ tài khoản Admin đã xác thực mới có quyền đọc route này
  router.get('/monitor/events', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: { system, usage } });
  });

  return { middleware, router };
}
