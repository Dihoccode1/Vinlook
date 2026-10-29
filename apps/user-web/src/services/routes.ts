import type { Coordinate, RouteResult, VehicleProfile } from '../features/navigation/types';

const messages: Record<string, string> = {
  NO_ROUTE: 'Không tìm thấy đường phù hợp với phương tiện đã chọn. Hãy thử điểm khác gần đường giao thông.',
  PROVIDER_TIMEOUT: 'Dịch vụ chỉ đường phản hồi chậm. Vui lòng thử lại.',
  PROVIDER_UNAVAILABLE: 'Dịch vụ chỉ đường tạm thời không khả dụng. Vui lòng thử lại.',
  INVALID_ROUTE: 'Lộ trình cần điểm xuất phát và từ 1 đến 9 điểm dừng hợp lệ.',
};

export class RouteClientError extends Error { constructor(public code: string, message: string) { super(message); } }

export async function calculate_route(waypoints: Coordinate[], signal: AbortSignal, profile: VehicleProfile = 'driving'): Promise<RouteResult> {
  const response = await fetch('/api/routes', {
    method: 'POST', headers: { 'content-Type': 'application/json' },
    body: JSON.stringify({ profile, optimization: 'shortest', waypoints }), signal,
  });
  const body = await response.json();
  if (!response.ok) throw new RouteClientError(body.error?.code ?? 'UNKNOWN', messages[body.error?.code] ?? 'Không thể tính tuyến đường. Kiểm tra dịch vụ chỉ đường rồi thử lại.');
  return body.data as RouteResult;
}
