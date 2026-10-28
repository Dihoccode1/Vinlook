import { useEffect, useMemo, useState } from 'react';
import type { Poi } from '../../types/poi';
import { listAllPois } from '../../services/pois';
import { filterExplorePois } from './explore-pois';

interface Options { search: string; category: string; position: { latitude: number; longitude: number } | null }
export function usePoiDiscovery({ search, category, position }: Options, retry = 0) {
  const [allPois, setAllPois] = useState<Poi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    listAllPois(controller.signal).then(result => { if (!controller.signal.aborted) setAllPois(result); })
      .catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Không tải được địa điểm.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  const latitude = position?.latitude, longitude = position?.longitude;
  const matches = useMemo(() => filterExplorePois(allPois, { search, category, position: latitude === undefined || longitude === undefined ? null : { latitude, longitude } }), [allPois, search, category, latitude, longitude]);
  return { allPois, matches, loading, error };
}
