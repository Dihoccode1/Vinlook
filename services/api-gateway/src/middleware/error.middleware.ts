/**
 * @file error.middleware.ts
 * @description Xử lý lỗi tập trung (Centralized Error Handler Middleware) cho API Gateway
 */

import type { ErrorRequestHandler } from 'express';

/**
 * Middleware bắt lỗi toàn cục, trả về định dạng JSON thống nhất
 */
export const error_middleware: ErrorRequestHandler = (err, _req, res, _next) => {
  res.setHeader('Cache-Control', 'no-store');

  const status = typeof err.status === 'number' ? err.status : 500;
  const message = err.message || 'Lỗi xử lý nội bộ tại API Gateway.';
  const code = err.code || 'INTERNAL_GATEWAY_ERROR';

  res.status(status).json({
    error: {
      code,
      message
    }
  });
};
