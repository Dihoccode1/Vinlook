/**
 * @file proxy.util.ts
 * @description Hàm tiện ích chuyển tiếp yêu cầu HTTP (Reverse Proxy Forwarding) tới các Microservice
 */

import type { Request, Response } from 'express';

interface ForwardOptions {
  targetUrl: string;
  timeoutMs?: number;
  adminKey?: string;
  adminUserId?: string;
}

/**
 * Chuyển tiếp yêu cầu HTTP sang dịch vụ upstream với bảo vệ timeout và header
 */
export async function forward_request(
  req: Request,
  res: Response,
  options: ForwardOptions
) {
  res.setHeader('Cache-Control', 'no-store');
  const timeoutMs = options.timeoutMs ?? 15000;

  try {
    const headers: Record<string, string> = {
      'content-Type': 'application/json'
    };

    if (options.adminKey) headers['x-admin-key'] = options.adminKey;
    if (options.adminUserId) headers['x-admin-user-id'] = options.adminUserId;

    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body ?? null);

    const upstream = await fetch(options.targetUrl, {
      method: req.method,
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error'
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    res.status(upstream.status).type(contentType);

    if (contentType.includes('audio/')) {
      res.send(Buffer.from(await upstream.arrayBuffer()));
    } else {
      res.send(await upstream.text());
    }
  } catch (error) {
    res.status(502).json({
      error: {
        code: 'UPSTREAM_SERVICE_UNAVAILABLE',
        message: 'Không thể kết nối đến dịch vụ nội bộ tương ứng.'
      }
    });
  }
}
