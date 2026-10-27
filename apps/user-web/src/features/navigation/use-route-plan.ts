import { useEffect, useRef, useState } from 'react';
import type { Poi } from '../../types/poi';
import type { LocationFix } from '../tracking/location-tracker';
import type { Coordinate, PlannedRoute, VehicleProfile } from './types';
import { calculateRoute, RouteClientError } from '../../services/routes';

export function useRoutePlan(pois: Poi[], gps: { active: boolean; position: LocationFix | null; stale: boolean; error?: string | null; start: () => void }) {
  const [stops, setStops] = useState<Poi[]>([]);
  const [originId, setOrigin] = useState('gps');
  const [route, setRoute] = useState<PlannedRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [waitingForGps, setWaitingForGps] = useState(false);
  const [profile, setVehicle] = useState<VehicleProfile>('driving');
  const [pending, setPending] = useState<{ id: number; stops: Poi[]; originId: string; profile: VehicleProfile } | null>(null);
  const [lastWaypoints, setLastWaypoints] = useState<Coordinate[]>([]);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const executed = useRef(-1);

  function invalidate() {
    request.current?.abort();
    request.current = null;
    setPending(null); setRoute(null); setError(''); setErrorCode(''); setLoading(false); setWaitingForGps(false);
  }
  useEffect(() => () => request.current?.abort(), []);
  function queue(nextStops: Poi[], nextProfile = profile, nextOrigin = originId) {
    invalidate();
    if (!nextStops.length) return;
    setPending({ id: ++sequence.current, stops: nextStops, profile: nextProfile, originId: nextOrigin });
    if (nextOrigin === 'gps' && !gps.active) gps.start();
  }

  useEffect(() => {
    if (!pending) return;
    if (pending.originId === 'gps' && !gps.active && gps.error) {
      request.current?.abort(); request.current = null; executed.current = -1;
      setRoute(null); setLoading(false); setWaitingForGps(false); setError(gps.error);
      return;
    }
    if (executed.current === pending.id) return;
    const origin = pending.originId === 'gps' ? gps.position : pois.find(poi => poi.id === pending.originId);
    if (pending.originId === 'gps' && (!gps.active || !origin || gps.stale || Date.now() - (gps.position?.timestamp ?? 0) > 30000)) {
      setWaitingForGps(!gps.error || gps.active);
      if (gps.error && !gps.active) setError(gps.error);
      return;
    }
    if (!origin) { setError('Hãy chọn một điểm xuất phát hợp lệ.'); return; }
    executed.current = pending.id;
    setWaitingForGps(false); setError(''); setLoading(true);
    const controller = new AbortController(); request.current = controller;
    const waypoints = [origin, ...pending.stops].map(p => ({ latitude: p.latitude, longitude: p.longitude }));
    setLastWaypoints(waypoints);
    const originLabel = pending.originId === 'gps' ? 'Vị trí GPS của bạn' : (origin as Poi).name;
    const calculatedAt = Date.now();
    void calculateRoute(waypoints, controller.signal, pending.profile).then(data => {
      if (!controller.signal.aborted) setRoute({ ...data, originLabel, calculatedAt });
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : 'Không thể tính đường.');
        setErrorCode(failure instanceof RouteClientError ? failure.code : 'UNKNOWN');
      }
    }).finally(() => {
      if (!controller.signal.aborted) { setLoading(false); request.current = null; }
    });
  }, [pending, gps.active, gps.position, gps.stale, gps.error, pois]);

  function addStop(poi: Poi, replace = false) {
    if (!replace && stops.some(stop => stop.id === poi.id)) return;
    if (!replace && stops.length >= 9) { setError('Lộ trình hỗ trợ tối đa 9 điểm dừng.'); return; }
    const next = replace ? [poi] : [...stops, poi];
    setStops(next);
    if (replace) setVehicle('driving');
    queue(next, replace ? 'driving' : profile);
  }
  function removeStop(id: string) { const next = stops.filter(stop => stop.id !== id); setStops(next); queue(next); }
  function moveStop(index: number, delta: number) {
    const next = [...stops];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setStops(next); queue(next);
  }
  let transitFallbackUrl: string | null = null;
  if (profile === 'bus' && lastWaypoints.length === 2 && ['NO_TRANSIT_ROUTE', 'PROVIDER_UNAVAILABLE', 'PROVIDER_TIMEOUT'].includes(errorCode)) {
    const [origin, destination] = lastWaypoints;
    const url = new URL('https://www.google.com/maps/dir/');
    url.search = new URLSearchParams({ api: '1', origin: `${origin.latitude},${origin.longitude}`, destination: `${destination.latitude},${destination.longitude}`, travelmode: 'transit' }).toString();
    transitFallbackUrl = url.href;
  }
  return {
    stops, originId, route, loading, error, waitingForGps, profile, transitFallbackUrl, addStop, removeStop, moveStop,
    calculate() { queue(stops); },
    setProfile(next: VehicleProfile) { setVehicle(next); queue(stops, next); },
    setOriginId(id: string) { setOrigin(id); queue(stops, profile, id); },
    clear() { invalidate(); setStops([]); },
    cancel: invalidate,
  };
}
