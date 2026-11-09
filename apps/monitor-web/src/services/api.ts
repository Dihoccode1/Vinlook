/**
 * @file api.ts
 * @description Dịch vụ gọi API đo lường và giám sát từ API Gateway
 */

export async function fetchMonitor<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    signal,
    headers: {
      'x-vinlook-admin': '1'
    }
  });

  if (!response.ok) {
    throw new Error(`Lỗi kết nối API Gateway: HTTP ${response.status}`);
  }

  const result = await response.json();
  return result.data as T;
}
