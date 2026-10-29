import type { Poi } from '../../types/poi';

export interface ExplorePosition { latitude: number; longitude: number }
export interface ExplorePoi { poi: Poi; distance_meters: number | null }
const earth_radius_meters = 6371000;
export const explore_radius_meters = 5000;

function valid_position(position: ExplorePosition | null): position is ExplorePosition {
  return position !== null && Number.isFinite(position.latitude) && Math.abs(position.latitude) <= 90
    && Number.isFinite(position.longitude) && Math.abs(position.longitude) <= 180;
}

/** Straight-line distance on Earth; invalid coordinates have no usable distance. */
export function distance_meters(from: ExplorePosition | null, to: ExplorePosition | null): number | null {
  if (!valid_position(from) || !valid_position(to)) return null;
  const radians = Math.PI / 180;
  const latitude = (to.latitude - from.latitude) * radians;
  const longitude = (to.longitude - from.longitude) * radians;
  const haversine = Math.sin(latitude / 2) ** 2
    + Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians) * Math.sin(longitude / 2) ** 2;
  return 2 * earth_radius_meters * Math.asin(Math.sqrt(Math.max(0, Math.min(1, haversine))));
}

function normalize(value: string) {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
}

/** List-only filtering: callers retain the complete catalog for map markers. */
export function filter_explore_pois(pois: Poi[], options: { search: string; category: string; position: ExplorePosition | null }): ExplorePoi[] {
  const query = normalize(options.search);
  if (!query && !valid_position(options.position)) return [];
  const matches: ExplorePoi[] = [];
  for (const poi of pois) {
    if (!valid_position(poi) || (options.category && poi.category !== options.category)) continue;
    if (query && !normalize(poi.name).includes(query) && !normalize(poi.address).includes(query)) continue;
    const distance = distance_meters(options.position, poi);
    // Tiny tolerance handles floating-point error exactly at the 5 km boundary.
    if (!query && (distance === null || distance > explore_radius_meters + 0.000001)) continue;
    matches.push({ poi, distance_meters: distance });
  }
  return query ? matches : matches.sort((left, right) => left.distance_meters! - right.distance_meters!);
}
