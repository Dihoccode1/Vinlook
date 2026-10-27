import type { Poi, PoiPage } from '../types/poi';

async function get<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Không thể tải địa điểm. Vui lòng kiểm tra API và kết nối cơ sở dữ liệu.');
  return response.json() as Promise<T>;
}

export function listPois(q: string, category: string, page: number, signal: AbortSignal) {
  const query = new URLSearchParams({ q, page: String(page), limit: '20' });
  if (category) query.set('category', category);
  return get<PoiPage>(`/api/pois?${query}`, signal);
}

export function getPoi(id: string, signal: AbortSignal) {
  return get<{ data: Poi }>(`/api/pois/${encodeURIComponent(id)}`, signal);
}
