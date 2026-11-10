/**
 * @file App.tsx
 * @description Điều phối viên trung tâm của phân hệ Quản trị (Admin Web Application).
 * Quản lý trạng thái điều hướng tab, tải dữ liệu bất đồng bộ và kết nối các phân hệ chức năng:
 * Tổng quan, Quản lý địa điểm, Giám sát hệ thống và Quản lý tài khoản.
 */

import React, { useEffect, useState } from 'react';
import { MonitorDashboard } from './features/overview/MonitorDashboard';
import { OverviewDashboard } from './features/overview/OverviewDashboard';
import { PoiEditor } from './features/pois/PoiEditor';
import { PoiListPanel } from './features/pois/PoiListPanel';
import { PoiQrDialog } from './features/pois/PoiQrDialog';
import { UserManagement } from './features/users/UserManagement';
import { AdminLayout, type AdminViewTab } from './layouts/AdminLayout';
import { api } from './services/api';
import type { ActivitySample, Poi, Stats } from './types';

interface AppProps {
  on_logout: () => Promise<void>;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'staff';
  };
}

export default function App({ on_logout, user }: AppProps) {
  const [view, set_view] = useState<AdminViewTab>('overview');

  // Thống kê và danh sách POI
  const [stats, set_stats] = useState<Stats | null>(null);
  const [pois, set_pois] = useState<Poi[]>([]);
  const [total, set_total] = useState(0);
  const [page, set_page] = useState(1);

  // Bộ lọc tìm kiếm
  const [search, set_search] = useState('');
  const [category, set_category] = useState('');
  const [status, set_status] = useState('all');

  // Trạng thái tải và thông báo
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState('');
  const [refresh, set_refresh] = useState(0);
  const [toast, set_toast] = useState('');
  const [logging_out, set_logging_out] = useState(false);

  // Hoạt động thời gian thực (visitors / listeners)
  const [activity, set_activity] = useState<{ visitors: number; listeners: number } | null>(null);
  const [samples, set_samples] = useState<ActivitySample[]>([]);

  // Hộp thoại soạn thảo POI hoặc mã QR
  const [editor, set_editor] = useState<Poi | null | undefined>(undefined);
  const [qr_poi, set_qr_poi] = useState<Poi | null>(null);

  async function logout() {
    set_logging_out(true);
    try {
      await on_logout();
    } catch {
      set_toast('Chưa đăng xuất được. Vui lòng thử lại.');
      set_logging_out(false);
    }
  }

  // Tải thống kê tổng quan
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: Stats }>('/stats', { signal: controller.signal })
      .then((result) => set_stats(result.data))
      .catch(() => {
        if (!controller.signal.aborted) set_error('Không tải được tổng quan từ database.');
      });
    return () => controller.abort();
  }, [refresh]);

  // Tải danh sách POI (debounce 200ms khi lọc/phân trang)
  useEffect(() => {
    if (view === 'monitor' || view === 'users') return;

    const controller = new AbortController();
    set_loading(true);
    set_error('');

    const timer = setTimeout(() => {
      const query = new URLSearchParams({
        q: view === 'overview' ? '' : search,
        status: view === 'overview' ? 'all' : status,
        page: String(view === 'overview' ? 1 : page),
        limit: view === 'overview' ? '5' : '10'
      });
      if (category && view === 'pois') query.set('category', category);

      api<{ data: Poi[]; pagination: { total: number } }>(`/pois?${query}`, { signal: controller.signal })
        .then((result) => {
          set_pois(result.data);
          set_total(result.pagination.total);
        })
        .catch((failure) => {
          if (!controller.signal.aborted) {
            set_error(failure instanceof Error ? failure.message : 'Không tải được địa điểm.');
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
  }, [view, search, category, status, page, refresh]);

  // Tự động ẩn thông báo sau 5 giây
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => set_toast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Polling hoạt động du khách mỗi 3 giây trên cửa sổ 5 phút
  useEffect(() => {
    if (view !== 'overview') return;
    const controller = new AbortController();
    let pending = false;

    const poll = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await api<{ data: { visitors: number; listeners: number } }>('/activity', {
          signal: controller.signal
        });
        if (!controller.signal.aborted) {
          set_activity(result.data);
          set_samples((prev) =>
            [...prev, { time: Date.now(), ...result.data }].filter((item) => item.time >= Date.now() - 300000)
          );
        }
      } catch {
        if (!controller.signal.aborted) set_activity(null);
      } finally {
        pending = false;
      }
    };

    void poll();
    const timer = setInterval(() => void poll(), 3000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [view]);

  function navigate(next_view: AdminViewTab) {
    set_view(next_view);
    set_page(1);
  }

  function saved() {
    set_editor(undefined);
    set_toast('Đã lưu địa điểm thành công.');
    set_refresh((value) => value + 1);
  }

  return (
    <AdminLayout
      user={user}
      current_view={view}
      has_stats={stats !== null}
      logging_out={logging_out}
      toast={toast}
      on_view_change={navigate}
      on_logout={() => void logout()}
      on_create_poi={() => set_editor(null)}
    >
      {view === 'overview' && (
        <OverviewDashboard
          stats={stats}
          activity={activity}
          samples={samples}
          on_create_poi={() => set_editor(null)}
        />
      )}

      {view === 'users' && user.role === 'admin' ? (
        <UserManagement current_user_id={user.id} />
      ) : view === 'monitor' && user.role === 'admin' ? (
        <MonitorDashboard />
      ) : (
        <PoiListPanel
          mode={view === 'overview' ? 'overview' : 'pois'}
          pois={pois}
          total={total}
          overview_total={stats?.total}
          page={page}
          search={search}
          category={category}
          status={status}
          loading={loading}
          error={error}
          on_search_change={(value) => {
            set_search(value);
            set_page(1);
          }}
          on_category_change={(value) => {
            set_category(value);
            set_page(1);
          }}
          on_status_change={(value) => {
            set_status(value);
            set_page(1);
          }}
          on_page_change={set_page}
          on_refresh={() => set_refresh((value) => value + 1)}
          on_view_all={() => navigate('pois')}
          on_edit_poi={(poi) => set_editor(poi)}
          on_open_qr={(poi) => set_qr_poi(poi)}
        />
      )}

      {qr_poi && <PoiQrDialog key={qr_poi.id} poi={qr_poi} on_close={() => set_qr_poi(null)} />}
      {editor !== undefined && <PoiEditor poi={editor} on_close={() => set_editor(undefined)} on_saved={saved} />}
    </AdminLayout>
  );
}
