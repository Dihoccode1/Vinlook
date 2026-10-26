// Exact hybrid-v1 locale vocabulary, shared by validation, models and domain service.
export const languageCodes = Object.freeze([
  'ar',
  'ar-EG',
  'bn',
  'de',
  'en',
  'es',
  'fr',
  'hi',
  'id',
  'ja',
  'pcm',
  'pt-PT',
  'ru',
  'ur',
  'vi',
  'zh-Hant',
]);
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const objectId = /^[0-9a-f]{24}$/;
export const endReasons = Object.freeze(['completed', 'page_closed', 'closed', 'replaced']);
export const limits = Object.freeze({
  bodyBytes: 1024,
  responseBytes: 256 * 1024,
  browsers: 1000,
  playbacks: 4000,
  pois: 1000,
  inflight: 10,
  buckets: 4096,
  globalPerMinute: 600,
  browserPerMinute: 60,
  monitorPerMinute: 12,
});
export const errors = Object.freeze({
  MALFORMED_JSON: [400, 'Malformed JSON'],
  AUTHENTICATION_REQUIRED: [401, 'Authentication is required'],
  ACCESS_DENIED: [403, 'Access is denied'],
  POI_NOT_AVAILABLE: [404, 'The public POI was not found'],
  ROUTE_NOT_FOUND: [404, 'The route was not found'],
  METHOD_NOT_ALLOWED: [405, 'The method is not allowed'],
  PLAYBACK_CONFLICT: [409, 'The playback identity conflicts with the request'],
  PLAYBACK_NOT_OPEN: [409, 'The playback is not open'],
  PAYLOAD_TOO_LARGE: [413, 'The request is too large'],
  UNSUPPORTED_MEDIA_TYPE: [415, 'JSON content is required'],
  INVALID_INPUT: [422, 'Invalid usage input'],
  RATE_LIMITED: [429, 'Too many usage requests'],
  AUTHORIZATION_UNAVAILABLE: [503, 'Authorization is temporarily unavailable'],
  PUBLIC_CONTENT_UNAVAILABLE: [503, 'Public content is temporarily unavailable'],
  USAGE_UNAVAILABLE: [503, 'Usage data is temporarily unavailable'],
});
