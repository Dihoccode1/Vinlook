import { z } from 'zod';

export const coordinate_schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).strict();

export const route_request_schema = z.object({
  profile: z.enum(['driving', 'motorcycle', 'walking']).default('driving'),
  optimization: z.literal('shortest').default('shortest'),
  waypoints: z.array(coordinate_schema).min(2).max(10),
}).strict();

export type RouteRequest = z.infer<typeof route_request_schema>;
export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  location: [number, number];
  travel_mode?: string;
}
export interface RouteResult {
  profile: 'driving' | 'motorcycle' | 'walking';
  provider: 'Valhalla';
  optimization: 'shortest';
  distance: number;
  duration: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  legs: { distance: number; duration: number; geometry: { type: 'LineString'; coordinates: [number, number][] }; steps: RouteStep[] }[];
}
export interface RouteProvider { calculate(input: RouteRequest): Promise<RouteResult> }

export class RoutingError extends Error {
  constructor(public code: 'NO_ROUTE' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_TIMEOUT' | 'INVALID_PROVIDER_RESPONSE') {
    super(code);
  }
}
