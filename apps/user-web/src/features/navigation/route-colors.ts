import type { VehicleProfile } from './types';

const colors: Record<VehicleProfile, string[]> = {
  driving: ['#2677ce', '#df7b25', '#15957f', '#9e58b4', '#b45372', '#607d35'],
  motorcycle: ['#20855b', '#377db5', '#cf7a26', '#9760b2', '#b45372', '#607d35'],
  walking: ['#7950b5', '#d17b25', '#1d8e80', '#377db5', '#b45372', '#607d35'],
};
export function route_leg_color(profile: VehicleProfile, index: number) { return colors[profile][index % colors[profile].length]; }
