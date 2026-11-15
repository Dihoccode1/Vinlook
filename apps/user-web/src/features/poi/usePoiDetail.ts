import { useEffect, useState } from 'react';
import type { Poi } from '../../types/poi';
import { get_poi } from '../../services/pois';
export function usePoiDetail(selected: Poi | null) {
  const [detail, set_detail] = useState<Poi | null>(null);
  const [detail_error, set_detail_error] = useState('');
  useEffect(() => {
    set_detail(null);
    set_detail_error('');
    if (!selected) return;
    const controller = new AbortController();
    get_poi(selected.id, controller.signal)
      .then((result) => set_detail(result.data))
      .catch(() => {
        if (!controller.signal.aborted)
          set_detail_error('Không thể tải chi tiết địa điểm. Hãy chọn lại địa điểm.');
      });
    return () => controller.abort();
  }, [selected]);

  return { detail, detail_error };
}
