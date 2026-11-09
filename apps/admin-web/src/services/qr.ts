/**
 * @file qr.ts
 * @description Các hàm tiện ích liên quan đến mã QR điểm tham quan
 */

/**
 * Tạo đường dẫn liên kết QR công khai từ domain gốc và token
 * @param baseUrl URL trang web bản đồ công khai (ví dụ https://vinlook.vn)
 * @param qrToken Mã token QR ngẫu nhiên gồm 32 ký tự hex
 * @returns URL hoàn chỉnh để du khách quét mã
 */
export function qr_link(baseUrl: string, qrToken: string): string {
  const url = new URL(baseUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    !/^[a-f0-9]{32}$/.test(qrToken)
  ) {
    throw new Error('Vui lòng nhập địa chỉ gốc hợp lệ của web bản đồ (ví dụ: https://vinlook.vn)');
  }
  return new URL(`/qr/${qrToken}`, url).href;
}

/**
 * Xác định URL web bản đồ mặc định dựa vào origin hiện tại
 * @param origin Window location origin hiện tại
 * @param configured URL cấu hình trong file biến môi trường (nếu có)
 * @returns URL trang web du khách
 */
export function default_public_url(origin: string, configured?: string): string {
  if (configured) return configured;
  const url = new URL(origin);
  // Nếu đang dev admin ở port 5174, mặc định map sang port 5173 của user-web
  if (url.port === '5174') url.port = '5173';
  return url.origin;
}
