import { useEffect, useMemo, useState } from 'react';
import type { Poi } from '../../types/poi';
import { list_all_pois } from '../../services/pois';
import { filter_explore_pois } from './explore-pois';

interface Options { search: string; category: string; position: { latitude: number; longitude: number } | null }
export function use_poi_discovery({ search, category, position }: Options, retry = 0) {
  const [all_pois, set_all_pois] = useState<Poi[]>([]);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    set_loading(true); set_error('');
    list_all_pois(controller.signal).then(result => { if (!controller.signal.aborted) set_all_pois(result); })
      .catch(failure => { if (!controller.signal.aborted) set_error(failure instanceof Error ? failure.message : 'Không tải được địa điểm.'); })
      .finally(() => { if (!controller.signal.aborted) set_loading(false); });
    return () => controller.abort();
  }, [retry]);
  const latitude = position?.latitude, longitude = position?.longitude;
  const matches = useMemo(() => filter_explore_pois(all_pois, { search, category, position: latitude === undefined || longitude === undefined ? null : { latitude, longitude } }), [all_pois, search, category, latitude, longitude]);
  return { all_pois: all_pois, matches, loading, error };
}
