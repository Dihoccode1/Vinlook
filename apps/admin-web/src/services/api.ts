/**
 * @file api.ts
 * @description Dịch vụ gọi API cho trang Quản trị (Admin Web)
 * Xử lý xác thực, tự động gắn header bảo vệ và chuẩn hóa phản hồi/lỗi bằng tiếng Việt
 */

import type { Poi, Stats } from '../types';

// Tái xuất (re-export) kiểu dữ liệu để tương thích ngược
export type { Poi, Stats };

/**
 * Bản đồ danh mục điểm tham quan sang tiếng Việt có dấu chuẩn
 */
export const categories: Record<string, string> = {
  market: 'Chợ & mua sắm',
  history: 'Lịch sử & bảo tàng',
  architecture: 'Kiến trúc & văn hóa',
};

/**
 * Hàm gửi yêu cầu HTTP đến máy chủ quản trị
 * @template T Kiểu dữ liệu mong đợi của dữ liệu trả về
 * @param path Đường dẫn endpoint (bắt đầu bằng /)
 * @param init Cấu hình fetch bổ sung (method, body, headers, signal)
 * @returns Promise chứa dữ liệu phản hồi từ máy chủ
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const headers = new Headers(init?.headers);
  // Gắn header đánh dấu yêu cầu từ giao diện quản trị viên
  headers.set('x-vinlook-admin', '1');

  try {
    response = await fetch(`/api/admin${path}`, { ...init, headers });
  } catch {
    throw new Error('Không thể kết nối máy chủ. Hãy kiểm tra các dịch vụ backend nội bộ.');
  }

  const body = await response.json();

  // Khi phiên đăng nhập hết hạn (401), phát sự kiện toàn cục để chuyển về màn hình đăng nhập
  if (response.status === 401) {
    window.dispatchEvent(new Event('admin-session-expired'));
  }

  if (!response.ok) {
    const defaultMsg =
      response.status === 401
        ? 'Không có quyền truy cập quản trị hoặc phiên làm việc đã hết hạn.'
        : 'Không thể tải dữ liệu từ máy chủ.';
    throw new Error(body.error?.message ?? defaultMsg);
  }

  return body as T;
}
