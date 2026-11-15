import { useAdminPois } from './useAdminPois';
import { useActivityPolling } from './useActivityPolling';
import { useOverviewStats } from './useOverviewStats';

import { useEffect, useState } from 'react';

import { type AdminViewTab } from '../layouts/AdminLayout';
import { api } from '../services/api';
import type { Poi } from '../types';

interface AppProps {
  on_logout: () => Promise<void>;
  on_password_changed: () => void;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'staff';
  };
}

export function useAdminDashboard({ on_logout, on_password_changed, user }: AppProps) {
  const [view, set_view] = useState<AdminViewTab>('overview');

  // Trạng thái tải và thông báo
  const [error, set_error] = useState('');
  const [refresh, set_refresh] = useState(0);
  const {
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
  } = useAdminPois(view, refresh, set_error);
  const stats = useOverviewStats(refresh, set_error);
  const [toast, set_toast] = useState('');
  const [logging_out, set_logging_out] = useState(false);
  const [changing_password, set_changing_password] = useState(false);

  // Hoạt động thời gian thực (visitors / listeners)
  const { activity, samples } = useActivityPolling(view);

  // Hộp thoại soạn thảo POI hoặc nghe thử thuyết minh
  const [editor, set_editor] = useState<Poi | null | undefined>(undefined);
  const [preview_poi, set_preview_poi] = useState<Poi | null>(null);

  async function logout() {
    set_logging_out(true);
    try {
      await on_logout();
    } catch {
      set_toast('Chưa đăng xuất được. Vui lòng thử lại.');
      set_logging_out(false);
    }
  }

  // Tự động ẩn thông báo sau 5 giây
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => set_toast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  function saved() {
    set_editor(undefined);
    set_refresh((v) => v + 1);
    set_toast('Đã lưu điểm tham quan thành công.');
  }

  function navigate(nextView: AdminViewTab) {
    set_view(nextView);
    set_page(1);
    set_search('');
    set_category('');
    set_status('all');
  }

  return {
    view,
    stats,
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
    error,
    set_refresh,
    toast,
    set_toast,
    logging_out,
    changing_password,
    set_changing_password,
    activity,
    samples,
    editor,
    set_editor,
    preview_poi,
    set_preview_poi,
    logout,
    saved,
    navigate,
    on_password_changed,
    user,
  };
}
