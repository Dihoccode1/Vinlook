export interface Coordinate { latitude: number; longitude: number }
export type VehicleProfile = 'driving' | 'motorcycle' | 'walking';
export const vehicle_labels: Record<VehicleProfile, string> = { driving: 'Ô tô', motorcycle: 'Xe máy', walking: 'Đi bộ' };
export interface RouteStep { instruction: string; distance: number; duration: number; location: [number, number]; travel_mode?: string }
export interface RouteResult {
  profile: VehicleProfile; provider: 'Valhalla'; optimization: 'shortest'; distance: number; duration: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  legs: { distance: number; duration: number; geometry: { type: 'LineString'; coordinates: [number, number][] }; steps: RouteStep[] }[];
}
export interface PlannedRoute extends RouteResult { origin_label: string; calculated_at: number; stop_ids: string[] }

export function format_distance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`;
}
export function format_duration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} phút` : `${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}`;
}
