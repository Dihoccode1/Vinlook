export interface Poi {
  visitorDescription?: string;
  id: string; name: string; slug: string; description: string; address: string; category: string;
  latitude: number; longitude: number; sourceLanguage: string; isPublished: boolean; updatedAt: string;
  imageUrl: string | null; imageCredit: string | null; imageSourceUrl: string | null; imageLicenseUrl: string | null;
}
export interface Stats { total: number; published: number; drafts: number; withImages: number; categories: { category: string; total: number }[] }
export const categories: Record<string, string> = { market: 'Chợ & mua sắm', history: 'Lịch sử & bảo tàng', architecture: 'Kiến trúc & văn hóa' };
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const headers = new Headers(init?.headers); headers.set('x-vinlook-admin', '1');
  try { response = await fetch(`/api/admin${path}`, { ...init, headers }); }
  catch { throw new Error('Không kết nối được máy chủ. Hãy kiểm tra các service local.'); }
  const body = await response.json();
  if (response.status === 401) window.dispatchEvent(new Event('admin-session-expired'));
  if (!response.ok) throw new Error(body.error?.message ?? (response.status === 401 ? 'Không có quyền truy cập quản trị.' : 'Không thể tải dữ liệu.'));
  return body as T;
}
