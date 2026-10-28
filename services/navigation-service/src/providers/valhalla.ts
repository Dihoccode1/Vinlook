import { z } from 'zod';
import { RoutingError, type RouteProvider, type RouteRequest, type RouteStep } from '../modules/routes/route.schema.js';

const point = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const geometrySchema = z.object({ type: z.literal('LineString'), coordinates: z.array(point).min(2) });
const stepSchema = z.object({
  name: z.string(),
  distance: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  mode: z.string().optional(),
  geometry: z.object({ type: z.literal('LineString'), coordinates: z.array(point).min(1) }).optional(),
  maneuver: z.object({ type: z.string(), instruction: z.string().optional(), modifier: z.string().optional(), exit: z.number().int().positive().optional(), location: point }),
});
const responseSchema = z.object({
  code: z.literal('Ok'),
  routes: z.array(z.object({
    distance: z.number().nonnegative(), duration: z.number().nonnegative(),
    geometry: geometrySchema,
    legs: z.array(z.object({ distance: z.number().nonnegative(), duration: z.number().nonnegative(), steps: z.array(stepSchema) })).min(1),
  })).min(1),
});

function instruction(step: z.infer<typeof stepSchema>): string {
  if (step.maneuver.instruction) return step.maneuver.instruction;
  const { type, modifier, exit } = step.maneuver;
  const street = step.name ? ` vào ${step.name}` : '';
  const direction: Record<string, string> = {
    left: 'Rẽ trái', right: 'Rẽ phải', 'slight left': 'Chếch trái', 'slight right': 'Chếch phải',
    'sharp left': 'Rẽ ngoặt trái', 'sharp right': 'Rẽ ngoặt phải', straight: 'Đi thẳng', uturn: 'Quay đầu',
  };
  if (type === 'depart') return step.name ? `Bắt đầu trên ${step.name}` : 'Bắt đầu hành trình';
  if (type === 'arrive') return 'Đến điểm dừng';
  if (['roundabout', 'rotary', 'roundabout turn'].includes(type)) return `Vào vòng xuyến${exit ? `, đi lối ra số ${exit}` : ''}${street}`;
  if (type === 'exit roundabout' || type === 'exit rotary') return `Ra khỏi vòng xuyến${street}`;
  if (type === 'merge') return `Nhập làn${street}`;
  if (type === 'fork') return `Tại chỗ rẽ nhánh, ${modifier ? (direction[modifier] ?? 'tiếp tục').toLowerCase() : 'tiếp tục'}${street}`;
  if (type === 'on ramp') return `Đi lên đường dẫn${street}`;
  if (type === 'off ramp') return `Đi ra đường nhánh${street}`;
  return `${direction[modifier ?? 'straight'] ?? 'Tiếp tục'}${street}`;
}

export function createValhallaProvider(
  baseUrl = process.env.VALHALLA_BASE_URL ?? 'https://valhalla1.openstreetmap.de',
  fetcher: typeof fetch = fetch,
): RouteProvider {
  const base = new URL(baseUrl);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password) throw new Error('Invalid VALHALLA_BASE_URL');
  return {
    async calculate(input: RouteRequest) {
      const url = new URL(base);
      url.pathname = '/route';
      url.search = '';
      const costing = input.profile === 'walking' ? 'pedestrian' : input.profile === 'motorcycle' ? 'motor_scooter' : 'auto';
      const body = {
        locations: input.waypoints.map(p => ({ lat: p.latitude, lon: p.longitude, type: 'break', search_cutoff: 1000 })),
        costing, costing_options: { [costing]: { shortest: true, ...(costing === 'pedestrian' ? {} : { disable_hierarchy_pruning: true }) } },
        format: 'osrm', shape_format: 'geojson', language: 'vi-VN', units: 'kilometers',
      };
      let response: Response;
      try {
        response = await fetcher(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000), redirect: 'error' });
      } catch (error) {
        throw new RoutingError(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE');
      }
      let json: unknown;
      try { json = await response.json(); } catch (error) {
        throw new RoutingError(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'PROVIDER_TIMEOUT' : 'INVALID_PROVIDER_RESPONSE');
      }
      const code = typeof json === 'object' && json !== null && 'code' in json ? json.code : undefined;
      const errorCode = typeof json === 'object' && json !== null && 'error_code' in json ? json.error_code : undefined;
      if (code === 'NoRoute' || code === 'NoSegment' || [171, 172, 442, 443, 444].includes(Number(errorCode))) throw new RoutingError('NO_ROUTE');
      if (!response.ok) throw new RoutingError('PROVIDER_UNAVAILABLE');
      const parsed = responseSchema.safeParse(json);
      if (!parsed.success) throw new RoutingError('INVALID_PROVIDER_RESPONSE');
      const route = parsed.data.routes[0];
      if (route.legs.length !== input.waypoints.length - 1) throw new RoutingError('INVALID_PROVIDER_RESPONSE');
      return {
        profile: input.profile, provider: 'Valhalla', optimization: 'shortest', distance: route.distance, duration: route.duration, geometry: route.geometry,
        legs: route.legs.map(leg => {
          const coordinates: [number, number][] = [];
          const complete = leg.steps.length > 0 && leg.steps.every(step => step.geometry);
          if (complete) {
            for (const step of leg.steps) for (const coordinate of step.geometry!.coordinates) {
              const last = coordinates.at(-1);
              if (!last || last[0] !== coordinate[0] || last[1] !== coordinate[1]) coordinates.push(coordinate);
            }
            if (coordinates.length === 1) coordinates.push([...coordinates[0]]);
          }
          // Only a single-leg route may use the complete route geometry as fallback.
          // Multi-leg routes require the road geometry of every individual leg.
          if (!complete && route.legs.length !== 1) throw new RoutingError('INVALID_PROVIDER_RESPONSE');
          const geometry = complete ? { type: 'LineString' as const, coordinates } : route.geometry;
          return {
            distance: leg.distance, duration: leg.duration, geometry,
            steps: leg.steps.map((step): RouteStep => ({ instruction: instruction(step), distance: step.distance, duration: step.duration, location: step.maneuver.location, ...(step.mode ? { travelMode: step.mode } : {}) })),
          };
        }),
      };
    },
  };
}
