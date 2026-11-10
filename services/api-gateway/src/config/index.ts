/**
 * @file index.ts
 * @description Cấu hình tập trung cho API Gateway: địa chỉ các microservice, thời gian chờ và giới hạn payload.
 * Cổng lắng nghe được đọc trong server.ts (biến GATEWAY_PORT).
 */

export const config = {
  /** POI Service: quản lý điểm tham quan, ảnh, mã QR. */
  poi_service_url: process.env.POI_SERVICE_URL ?? 'http://localhost:4001',

  /** Navigation Service: tìm đường đi bộ/xe máy qua Valhalla. */
  navigation_service_url: process.env.NAVIGATION_SERVICE_URL ?? 'http://localhost:4002',

  /** Translation Service: dịch thuật và tổng hợp giọng đọc đa ngôn ngữ. */
  translation_service_url: process.env.TRANSLATION_SERVICE_URL ?? 'http://localhost:4003',

  /** Thời gian chờ tối đa (ms) cho từng loại tác vụ proxy. */
  timeouts: {
    poi_request_ms: 15000,
    navigation_ms: 15000,
    translation_text_ms: 60000,
    translation_audio_ms: 175000,
    health_check_ms: 6000
  },

  /** Giới hạn dung lượng thân yêu cầu cho từng nhóm route. */
  limits: {
    admin_body: '8mb',
    narration_body: '1kb',
    translation_body: '1kb',
    routes_body: '16kb'
  }
};
