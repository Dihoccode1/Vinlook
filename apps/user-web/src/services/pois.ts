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

// Map pins must never depend on the exploration/search page or its GPS radius.
export async function listAllPois(signal: AbortSignal): Promise<Poi[]> {
  const limit = 100;
  const first = await get<PoiPage>(`/api/pois?page=1&limit=${limit}`, signal);
  const catalog = new Map(first.data.map(poi => [poi.id, poi]));
  const pages = Math.ceil(first.pagination.total / limit);
  for (let page = 2; page <= pages; page++) {
    const result = await get<PoiPage>(`/api/pois?page=${page}&limit=${limit}`, signal);
    for (const poi of result.data) catalog.set(poi.id, poi);
  }
  return [...catalog.values()];
}

export function getPoi(id: string, signal: AbortSignal) {
  return get<{ data: Poi }>(`/api/pois/${encodeURIComponent(id)}`, signal);
}
