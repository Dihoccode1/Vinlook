/**
 * @file logger.middleware.ts
 * @description Middleware ghi log các yêu cầu HTTP gửi đến API Gateway
 */

import type { Request, Response, NextFunction } from 'express';

export function request_logger_middleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    // Ghi log nhẹ nhàng theo dõi luồng request
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[Gateway] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });

  next();
}
