/**
 * @file index.ts
 * @description Tổng hợp và xuất các router nghiệp vụ của API Gateway
 */

export { activity_routes } from '../activity.js';
export { monitor_routes } from '../monitor.js';
export { user_routes } from '../users.js';
export { delivery_status_routes } from '../delivery-status.js';
export { create_health_router } from '../health/health.router.js';
