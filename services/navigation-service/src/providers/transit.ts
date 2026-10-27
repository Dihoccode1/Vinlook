import { z } from 'zod';
import { RoutingError, type RouteProvider, type RouteStep } from '../modules/routes/route.schema.js';

/** Valhalla's native JSON format preserves bus line and boarding/alighting data. */
const summary = z.object({ length: z.number().nonnegative(), time: z.number().nonnegative() });
const stop = z.object({ name: z.string(), arrival_date_time: z.string().optional(), departure_date_time: z.string().optional() });
const maneuver = z.object({
  instruction: z.string(), length: z.number().nonnegative(), time: z.number().nonnegative(),
  begin_shape_index: z.number().int().nonnegative(), travel_mode: z.string(), travel_type: z.string().optional(),
  transit_info: z.object({ short_name: z.string().optional(), long_name: z.string().optional(), headsign: z.string().optional(), transit_stops: z.array(stop).default([]) }).optional(),
});
const schema = z.object({ trip: z.object({ status: z.literal(0), units: z.literal('kilometers'), summary,
  legs: z.array(z.object({ summary, shape: z.string().min(2), maneuvers: z.array(maneuver) })).min(1),
}) });

export function decodePolyline6(encoded: string): [number, number][] {
  let index = 0, lat = 0, lon = 0;
  const points: [number, number][] = [];
  function next() {
    let value = 0, shift = 0, byte: number;
    do {
      if (index >= encoded.length || shift > 30) throw new RoutingError('INVALID_PROVIDER_RESPONSE');
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) throw new RoutingError('INVALID_PROVIDER_RESPONSE');
      value |= (byte & 31) << shift; shift += 5;
    } while (byte >= 32);
    return value & 1 ? ~(value >>> 1) : value >>> 1;
  }
  while (index < encoded.length) {
    lat += next(); lon += next();
    if (Math.abs(lat / 1e6) > 90 || Math.abs(lon / 1e6) > 180) throw new RoutingError('INVALID_PROVIDER_RESPONSE');
    points.push([lon / 1e6, lat / 1e6]);
  }
  if (points.length < 2) throw new RoutingError('INVALID_PROVIDER_RESPONSE');
  return points;
}

export function createTransitProvider(baseUrl: string, fetcher: typeof fetch = fetch): RouteProvider {
  return { async calculate(input) {
    if (input.waypoints.length !== 2) throw new RoutingError('BUS_SINGLE_DESTINATION');
    const url = new URL('/route', baseUrl);
    let response: Response;
    try {
      response = await fetcher(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          locations: input.waypoints.map(p => ({ lat: p.latitude, lon: p.longitude, type: 'break' })),
          costing: 'multimodal', costing_options: { transit: { use_bus: 1, use_rail: 0 } },
          date_time: { type: 0 }, format: 'json', language: 'vi-VN', units: 'kilometers',
        }),
      });
    } catch (error) {
      throw new RoutingError(error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name) ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE');
    }
    let body: unknown;
    try { body = await response.json(); } catch { throw new RoutingError('INVALID_PROVIDER_RESPONSE'); }
    const failure = z.object({ error_code: z.number().optional(), code: z.string().optional() }).safeParse(body);
    if (failure.success && (['NoRoute', 'NoSegment'].includes(failure.data.code ?? '') || [170, 171, 172, 442, 443, 444].includes(failure.data.error_code ?? 0))) throw new RoutingError('NO_TRANSIT_ROUTE');
    if (!response.ok) throw new RoutingError('PROVIDER_UNAVAILABLE');
    const parsed = schema.safeParse(body);
    if (!parsed.success || parsed.data.trip.legs.length !== 1) throw new RoutingError('INVALID_PROVIDER_RESPONSE');
    const trip = parsed.data.trip;
    const maneuvers = trip.legs.flatMap(leg => leg.maneuvers);
    // A walking-only fallback is not a bus itinerary; rail-only routes are also excluded.
    if (!maneuvers.some(step => step.travel_mode === 'transit' && step.travel_type === 'bus')
      || maneuvers.some(step => step.travel_mode === 'transit' && step.travel_type !== 'bus')) throw new RoutingError('NO_TRANSIT_ROUTE');
    const coordinates = decodePolyline6(trip.legs[0].shape);
    const steps = maneuvers.map((step): RouteStep => {
      const location = coordinates[step.begin_shape_index];
      if (!location) throw new RoutingError('INVALID_PROVIDER_RESPONSE');
      const info = step.transit_info;
      const first = info?.transit_stops[0], last = info?.transit_stops.at(-1);
      return {
        instruction: step.instruction, distance: step.length * 1000, duration: step.time, location, travelMode: step.travel_mode,
        ...(info ? { transit: { line: info.short_name ?? info.long_name ?? 'Xe buýt', headsign: info.headsign,
          departureStop: first?.name, arrivalStop: last?.name, departureTime: first?.departure_date_time, arrivalTime: last?.arrival_date_time } } : {}),
      };
    });
    return { profile: 'bus', provider: 'Valhalla', optimization: 'transit', distance: trip.summary.length * 1000, duration: trip.summary.time,
      geometry: { type: 'LineString', coordinates }, legs: [{ distance: trip.legs[0].summary.length * 1000, duration: trip.legs[0].summary.time, steps }] };
  } };
}
