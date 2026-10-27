import { z } from 'zod';

export const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).strict();

export const routeRequestSchema = z.object({
  profile: z.enum(['driving', 'motorcycle', 'bus']).default('driving'),
  optimization: z.enum(['shortest', 'transit']).optional(),
  waypoints: z.array(coordinateSchema).min(2).max(10),
}).strict().superRefine((input, context) => {
  const expected = input.profile === 'bus' ? 'transit' : 'shortest';
  if (input.optimization && input.optimization !== expected) context.addIssue({ code: 'custom', message: 'Invalid optimization for vehicle', path: ['optimization'] });
}).transform(input => ({ ...input, optimization: input.profile === 'bus' ? 'transit' as const : 'shortest' as const }));

export type RouteRequest = z.infer<typeof routeRequestSchema>;
export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  location: [number, number];
  travelMode?: string;
  transit?: { line: string; headsign?: string; departureStop?: string; arrivalStop?: string; departureTime?: string; arrivalTime?: string };
}
export interface RouteResult {
  profile: 'driving' | 'motorcycle' | 'bus';
  provider: 'Valhalla';
  optimization: 'shortest' | 'transit';
  distance: number;
  duration: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  legs: { distance: number; duration: number; steps: RouteStep[] }[];
}
export interface RouteProvider { calculate(input: RouteRequest): Promise<RouteResult> }

export class RoutingError extends Error {
  constructor(public code: 'NO_ROUTE' | 'NO_TRANSIT_ROUTE' | 'BUS_SINGLE_DESTINATION' | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_TIMEOUT' | 'INVALID_PROVIDER_RESPONSE') {
    super(code);
  }
}
