/**
 * @file proxy.util.ts
 * @description Tiện ích chuyển tiếp yêu cầu (reverse proxy) từ API Gateway tới các microservice.
 * Gom toàn bộ logic fetch + timeout + xử lý lỗi 502 vào một chỗ để các route proxy trong app.ts
 * chỉ cần khai báo đích đến, kiểu phản hồi và thông báo lỗi.
 */

import type { Response } from 'express';

/** Cách gateway trả phản hồi upstream về cho client. */
export type ProxyResponseMode =
  /** Trả nguyên văn bản với Content-Type application/json. */
  | 'json'
  /** Trả âm thanh WAV khi thành công, JSON khi upstream báo lỗi. */
  | 'audio'
  /** Trả nguyên nhị phân và giữ lại các header cache (content-type, cache-control, etag). */
  | 'passthrough';

export interface ProxyOptions {
  /** URL đầy đủ của dịch vụ đích. */
  target: URL;
  /** Thời gian chờ tối đa (ms) trước khi hủy yêu cầu. */
  timeout_ms: number;
  /** Phương thức HTTP, mặc định GET. */
  method?: string;
  /** Header gửi kèm tới upstream. */
  headers?: Record<string, string>;
  /** Thân yêu cầu đã được tuần tự hóa (JSON string); bỏ trống với GET/HEAD. */
  body?: string;
  /** Kiểu phản hồi trả về client. */
  mode: ProxyResponseMode;
  /** Có gắn Cache-Control: no-store hay không (mặc định có). */
  no_store?: boolean;
  /** Nội dung lỗi trả về khi không kết nối được upstream (HTTP 502). */
  error: { code?: string; message: string };
}

/** Các header được giữ lại khi proxy ở chế độ passthrough (phục vụ cache ảnh/ETag). */
const PASSTHROUGH_HEADERS = ['content-type', 'cache-control', 'etag'] as const;

/** Header JSON chuẩn khi gửi thân yêu cầu tới upstream. */
export const JSON_HEADERS = { 'content-Type': 'application/json' } as const;

/**
 * Ghép đường dẫn gốc của request (bỏ tiền tố /api) vào URL của service đích, giữ nguyên query string.
 * Ví dụ: /api/pois/abc?lang=en  ->  http://poi:4001/pois/abc?lang=en
 */
export function rewrite_target(service_url: string, original_url: string): URL {
  const incoming = new URL(original_url, 'http://gateway.local');
  const target = new URL(service_url);
  target.pathname = incoming.pathname.replace(/^\/api/, '');
  target.search = incoming.search;
  return target;
}

/**
 * Tuần tự hóa thân yêu cầu JSON cho upstream.
 * GET/HEAD không được phép có body nên trả về undefined; body undefined cũng cho kết quả undefined.
 */
export function json_body(method: string, body: unknown): string | undefined {
  return ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(body);
}

/**
 * Chuyển tiếp một yêu cầu tới microservice và ghi phản hồi về client.
 * Không bao giờ ném lỗi ra ngoài: mọi lỗi mạng/timeout được chuyển thành HTTP 502.
 */
export async function forward(res: Response, options: ProxyOptions): Promise<void> {
  if (options.no_store !== false) res.setHeader('Cache-Control', 'no-store');
  try {
    const upstream = await fetch(options.target, {
      method: options.method ?? 'GET',
      headers: options.headers,
      body: options.body,
      signal: AbortSignal.timeout(options.timeout_ms),
      redirect: 'error'
    });

    res.status(upstream.status);
    if (options.mode === 'json') {
      res.type('application/json').send(await upstream.text());
      return;
    }
    if (options.mode === 'audio') {
      res.type(upstream.ok ? 'audio/wav' : 'application/json').send(Buffer.from(await upstream.arrayBuffer()));
      return;
    }
    // passthrough: đọc body trước rồi mới gắn header để tránh gửi header khi upstream đứt giữa chừng
    const body = Buffer.from(await upstream.arrayBuffer());
    for (const name of PASSTHROUGH_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.send(body);
  } catch {
    res.status(502).json({ error: options.error });
  }
}
