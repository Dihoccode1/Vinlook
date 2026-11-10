/**
 * @file api.ts
 * @description Dịch vụ gọi API cho trang Quản trị (Admin Web).
 * Tự động đính kèm header CSRF `x-vinlook-admin`, phát sự kiện hết phiên khi nhận HTTP 401
 * và chuẩn hóa thông báo lỗi tiếng Việt.
 */

import type { Poi, Stats } from '../types';

export type { Poi, Stats };

/** Bản đồ mã danh mục sang tên hiển thị tiếng Việt. */
export const categories: Record<string, string> = {
  market: 'Chợ & mua sắm',
  history: 'Lịch sử & bảo tàng',
  architecture: 'Kiến trúc & văn hóa'
};

/**
 * Gửi yêu cầu HTTP tới `/api/admin/*` qua API Gateway.
 * @param path Đường dẫn con tính từ `/api/admin` (ví dụ: `/stats`, `/pois`)
 * @param init Tùy chọn RequestInit chuẩn của Fetch API
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const headers = new Headers(init?.headers);
  headers.set('x-vinlook-admin', '1');

  try {
    response = await fetch(`/api/admin${path}`, { ...init, headers });
  } catch {
    throw new Error('Không kết nối được máy chủ. Hãy kiểm tra các service local.');
  }

  const body = await response.json();

  if (response.status === 401) {
    window.dispatchEvent(new Event('admin-session-expired'));
  }

  if (!response.ok) {
    const default_message =
      response.status === 401 ? 'Không có quyền truy cập quản trị.' : 'Không thể tải dữ liệu.';
    throw new Error(body.error?.message ?? default_message);
  }

  return body as T;
}
