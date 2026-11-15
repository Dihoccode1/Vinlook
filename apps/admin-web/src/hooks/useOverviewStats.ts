import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { api } from '../services/api';
import type { Stats } from '../types';
export function useOverviewStats(refresh: number, set_error: Dispatch<SetStateAction<string>>) {
  const [stats, set_stats] = useState<Stats | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: Stats }>('/stats', { signal: controller.signal })
      .then((result) => set_stats(result.data))
      .catch(() => {
        if (!controller.signal.aborted) set_error('Không thể tải tổng quan từ database.');
      });
    return () => controller.abort();
  }, [refresh, set_error]);

  return stats;
}
