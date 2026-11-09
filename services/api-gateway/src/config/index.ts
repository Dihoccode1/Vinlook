/**
 * @file index.ts
 * @description Quản lý cấu hình tập trung cho API Gateway
 * Đồ án Công nghệ Phần mềm - Nền tảng Du lịch Đa ngôn ngữ Vinlook
 */

/**
 * Cấu hình các cổng và URL của các dịch vụ microservice nội bộ
 */
export const config = {
  // Cổng lắng nghe của API Gateway
  port: Number(process.env.PORT) || 4000,

  // Địa chỉ kết nối đến POI Service (Quản lý điểm tham quan, ảnh, QR)
  poiServiceUrl: process.env.POI_SERVICE_URL ?? 'http://localhost:4001',

  // Địa chỉ kết nối đến Navigation Service (Tìm đường đi bộ, xe máy qua Valhalla)
  navigationServiceUrl: process.env.NAVIGATION_SERVICE_URL ?? 'http://localhost:4002',

  // Địa chỉ kết nối đến Translation Service (Dịch thuật AI, giọng đọc đa ngôn ngữ TTS)
  translationServiceUrl: process.env.TRANSLATION_SERVICE_URL ?? 'http://localhost:4003',

  // Khóa bí mật giao tiếp nội bộ giữa các microservice (giữ an toàn ở tầng backend)
  adminSharedKey: process.env.ADMIN_SHARED_KEY ?? 'vinlook-local-dev-key',

  // Thời gian chờ tối đa (timeout) cho các tác vụ
  timeouts: {
    poiRequestMs: 15000,
    navigationMs: 15000,
    translationTextMs: 60000,
    translationAudioMs: 175000,
    healthCheckMs: 6000
  },

  // Giới hạn dung lượng tải trọng (payload size limit)
  limits: {
    adminBody: '8mb',
    narrationBody: '1kb',
    translationBody: '1kb',
    routesBody: '16kb'
  }
};
