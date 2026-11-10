/**
 * @file qr.ts
 * @description Các hàm tiện ích xây dựng đường dẫn liên kết mã QR công khai cho điểm tham quan.
 */

/**
 * Tạo đường dẫn liên kết QR công khai từ địa chỉ gốc của web bản đồ và mã token 32 ký tự hex.
 * Từ chối các URL không phải http/https, có thông tin đăng nhập, query, hash hoặc đường dẫn con.
 */
export function qr_link(base_url: string, qr_token: string): string {
  const url = new URL(base_url);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    !/^[a-f0-9]{32}$/.test(qr_token)
  ) {
    throw new Error('Nhập địa chỉ gốc của web bản đồ, ví dụ https://vinlook.vn');
  }
  return new URL(`/qr/${qr_token}`, url).href;
}

/**
 * Xác định địa chỉ web bản đồ du khách mặc định dựa vào origin hiện tại hoặc biến cấu hình.
 * Khi chạy local admin ở cổng 5174, tự động chuyển sang cổng 5173 của user-web.
 */
export function default_public_url(origin: string, configured?: string): string {
  if (configured) return configured;
  const url = new URL(origin);
  if (url.port === '5174') url.port = '5173';
  return url.origin;
}
