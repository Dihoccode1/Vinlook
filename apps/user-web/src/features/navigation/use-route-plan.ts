import { useEffect, useRef, useState } from 'react';
import type { Poi } from '../../types/poi';
import type { LocationFix } from '../tracking/location-tracker';
import type { PlannedRoute, VehicleProfile } from './types';
import { calculate_route } from '../../services/routes';

export function use_route_plan(pois: Poi[], gps: { active: boolean; position: LocationFix | null; stale: boolean; error?: string | null; start: () => void }) {
  const [stops, set_stops] = useState<Poi[]>([]);
  const [origin_id, set_origin] = useState('gps');
  const [route, set_route] = useState<PlannedRoute | null>(null);
  const [loading, set_loading] = useState(false);
  const [error, set_error] = useState('');
  const [waiting_for_gps, set_waiting_for_gps] = useState(false);
  const [profile, set_vehicle] = useState<VehicleProfile>('driving');
  const [pending, set_pending] = useState<{ id: number; stops: Poi[]; origin_id: string; profile: VehicleProfile } | null>(null);
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const executed = useRef(-1);

  function invalidate() {
    request.current?.abort();
    request.current = null;
    set_pending(null); set_route(null); set_error(''); set_loading(false); set_waiting_for_gps(false);
  }
  useEffect(() => () => request.current?.abort(), []);
  function queue(next_stops: Poi[], next_profile = profile, next_origin = origin_id) {
    invalidate();
    if (!next_stops.length) return;
    set_pending({ id: ++sequence.current, stops: next_stops, profile: next_profile, origin_id: next_origin });
    if (next_origin === 'gps' && !gps.active) gps.start();
  }

  useEffect(() => {
    if (!pending) return;
    if (pending.origin_id === 'gps' && !gps.active && gps.error) {
      request.current?.abort(); request.current = null; executed.current = -1;
      set_route(null); set_loading(false); set_waiting_for_gps(false); set_error(gps.error);
      return;
    }
    if (executed.current === pending.id) return;
    const origin = pending.origin_id === 'gps' ? gps.position : pois.find(poi => poi.id === pending.origin_id);
    if (pending.origin_id === 'gps' && (!gps.active || !origin || gps.stale || Date.now() - (gps.position?.timestamp ?? 0) > 30000)) {
      set_waiting_for_gps(!gps.error || gps.active);
      if (gps.error && !gps.active) set_error(gps.error);
      return;
    }
    if (!origin) { set_error('Hãy chọn một điểm xuất phát hợp lệ.'); return; }
    executed.current = pending.id;
    set_waiting_for_gps(false); set_error(''); set_loading(true);
    const controller = new AbortController(); request.current = controller;
    const waypoints = [origin, ...pending.stops].map(p => ({ latitude: p.latitude, longitude: p.longitude }));
    const origin_label = pending.origin_id === 'gps' ? 'Vị trí GPS của bạn' : (origin as Poi).name;
    const calculated_at = Date.now();
    void calculate_route(waypoints, controller.signal, pending.profile).then(data => {
      if (!controller.signal.aborted) set_route({ ...data, origin_label: origin_label, calculated_at: calculated_at, stop_ids: pending.stops.map(poi => poi.id) });
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) {
        set_error(failure instanceof Error ? failure.message : 'Không thể tính đường.');
      }
    }).finally(() => {
      if (!controller.signal.aborted) { set_loading(false); request.current = null; }
    });
  }, [pending, gps.active, gps.position, gps.stale, gps.error, pois]);

  function add_stop(poi: Poi, replace = false) {
    if (!replace && stops.some(stop => stop.id === poi.id)) return;
    if (!replace && stops.length >= 9) { set_error('Lộ trình hỗ trợ tối đa 9 điểm dừng.'); return; }
    const next = replace ? [poi] : [...stops, poi];
    set_stops(next);
    if (replace) set_vehicle('driving');
    queue(next, replace ? 'driving' : profile);
  }
  function remove_stop(id: string) { const next = stops.filter(stop => stop.id !== id); set_stops(next); queue(next); }
  function move_stop(index: number, delta: number) {
    const next = [...stops];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set_stops(next); queue(next);
  }
  function reorder_stops(ids: string[]) {
    const by_id = new Map(stops.map(poi => [poi.id, poi]));
    if (ids.length !== stops.length || new Set(ids).size !== stops.length || ids.some(id => !by_id.has(id))) return false;
    if (ids.every((id, index) => stops[index].id === id)) return true;
    const next = ids.map(id => by_id.get(id)!);
    set_stops(next); queue(next);
    return true;
  }
  return {
    stops, origin_id: origin_id, route, loading, error, waiting_for_gps: waiting_for_gps, profile, add_stop: add_stop, remove_stop: remove_stop, move_stop: move_stop, reorder_stops: reorder_stops,
    calculate() { queue(stops); },
    set_profile(next: VehicleProfile) { set_vehicle(next); queue(stops, next); },
    set_origin_id(id: string) { set_origin(id); queue(stops, profile, id); },
    clear() { invalidate(); set_stops([]); },
    cancel: invalidate,
  };
}
