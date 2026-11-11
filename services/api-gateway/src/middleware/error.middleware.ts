/**
 * @file error.middleware.ts
 * @description Middleware 404 và xử lý lỗi tập trung cho API Gateway.
 * Giữ nguyên mã lỗi công khai (NOT_FOUND, INVALID_BODY, INTERNAL_ERROR) mà client và test đang dựa vào.
 */

import type { ErrorRequestHandler, RequestHandler } from 'express';

/** Trả 404 cho mọi đường dẫn không khớp route nào. */
export const not_found_middleware: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
};

/**
 * Bắt lỗi toàn cục:
 * - Body quá lớn (entity.too.large)  -> 413 INVALID_BODY
 * - JSON sai cú pháp (entity.parse.failed) -> 400 INVALID_BODY
 * - Lỗi còn lại -> 500 INTERNAL_ERROR (không lộ chi tiết nội bộ ra ngoài)
 */
export const error_middleware: ErrorRequestHandler = (error, _req, res, _next) => {
  res.setHeader('Cache-Control', 'no-store');
  const status =
    error?.type === 'entity.too.large' ? 413 : error?.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({
    error: {
      code: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_BODY',
      message: 'Unable to process request',
    },
  });
};
