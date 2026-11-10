/**
 * @file index.ts
 * @description Cấu hình tập trung cho API Gateway: địa chỉ các microservice, thời gian chờ và giới hạn payload.
 * Cổng lắng nghe được đọc trong server.ts (biến GATEWAY_PORT).
 */

export const config = {
  /** POI Service: quản lý điểm tham quan và ảnh. */
  poiServiceUrl: process.env.POI_SERVICE_URL ?? 'http://localhost:4001',

  /** Navigation Service: tìm đường đi bộ/xe máy qua Valhalla. */
  navigationServiceUrl: process.env.NAVIGATION_SERVICE_URL ?? 'http://localhost:4002',

  /** Translation Service: dịch thuật và tổng hợp giọng đọc đa ngôn ngữ. */
  translationServiceUrl: process.env.TRANSLATION_SERVICE_URL ?? 'http://localhost:4003',

  /** Thời gian chờ tối đa (ms) cho từng loại tác vụ proxy. */
  timeouts: {
    poiRequestMs: 15000,
    navigationMs: 15000,
    translationTextMs: 60000,
    translationAudioMs: 175000,
    healthCheckMs: 6000
  },

  /** Giới hạn dung lượng thân yêu cầu cho từng nhóm route. */
  limits: {
    adminBody: '8mb',
    narrationBody: '1kb',
    translationBody: '1kb',
    routesBody: '16kb'
  }
};
