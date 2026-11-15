import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Poi } from '../types';
import type { AdminViewTab } from '../layouts/AdminLayout';
import { api } from '../services/api';
export function useAdminPois(
  view: AdminViewTab,
  refresh: number,
  set_error: Dispatch<SetStateAction<string>>,
) {
  // Thống kê và danh sách POI
  const [pois, set_pois] = useState<Poi[]>([]);
  const [total, set_total] = useState(0);
  const [page, set_page] = useState(1);

  // Bộ lọc tìm kiếm
  const [search, set_search] = useState('');
  const [category, set_category] = useState('');
  const [status, set_status] = useState('all');

  const [loading, set_loading] = useState(true);
  // Tải danh sách POI (debounce 200ms khi lọc/phân trang)
  useEffect(() => {
    if (view !== 'overview' && view !== 'pois') return;

    const controller = new AbortController();
    set_loading(true);
    set_error('');

    const timer = setTimeout(() => {
      const query = new URLSearchParams({
        q: view === 'overview' ? '' : search,
        status: view === 'overview' ? 'all' : status,
        page: String(view === 'overview' ? 1 : page),
        limit: view === 'overview' ? '5' : '10',
      });
      if (category && view === 'pois') query.set('category', category);

      api<{ data: Poi[]; pagination: { total: number } }>(`/pois?${query}`, {
        signal: controller.signal,
      })
        .then((result) => {
          set_pois(result.data);
          set_total(result.pagination.total);
        })
        .catch((failure) => {
          if (!controller.signal.aborted) {
            set_error(
              failure instanceof Error ? failure.message : 'Không tải được danh sách địa điểm.',
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) set_loading(false);
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [view, search, category, status, page, refresh, set_error]);

  return {
    pois,
    total,
    page,
    set_page,
    search,
    set_search,
    category,
    set_category,
    status,
    set_status,
    loading,
  };
}
