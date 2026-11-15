/**
 * @file App.tsx
 * @description Điều phối viên trung tâm của phân hệ Quản trị (Admin Web Application).
 * Quản lý trạng thái điều hướng tab, tải dữ liệu bất đồng bộ và kết nối các phân hệ chức năng:
 * Tổng quan, Điểm tham quan, Danh mục, Ngôn ngữ, Giám sát hệ thống và Quản lý tài khoản.
 */

import { CategoryManager } from './features/categories/CategoryManager';
import { LanguageManager } from './features/languages/LanguageManager';
import { MonitorDashboard } from './features/overview/MonitorDashboard';
import { OverviewDashboard } from './features/overview/OverviewDashboard';
import { PoiEditor } from './features/pois/PoiEditor';
import { PoiListPanel } from './features/pois/PoiListPanel';
import { PoiNarrationDialog } from './features/pois/PoiNarrationDialog';
import { PasswordChangeDialog } from './features/users/PasswordChangeDialog';
import { UserManagement } from './features/users/UserManagement';
import { AdminLayout } from './layouts/AdminLayout';

interface AppProps {
  on_logout: () => Promise<void>;
  on_password_changed: () => void;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'staff';
  };
}

import { useAdminDashboard } from './hooks/useAdminDashboard';
export default function App({ on_logout, on_password_changed, user }: AppProps) {
  const {
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
  } = useAdminDashboard({ on_logout, on_password_changed, user });
  return (
    <AdminLayout
      user={user}
      currentView={view}
      onCreatePoi={() => set_editor(null)}
      onRefresh={() => set_refresh((value) => value + 1)}
      onViewChange={navigate}
      onLogout={logout}
      on_change_password={() => set_changing_password(true)}
      loggingOut={logging_out}
      toast={toast}
      onClearToast={() => set_toast('')}
    >
      {view === 'overview' && (
        <OverviewDashboard
          stats={stats}
          activity={activity}
          samples={samples}
          onNavigateCategories={() => navigate('categories')}
          onCreatePoi={() => set_editor(null)}
        />
      )}

      {view === 'users' && user.role === 'admin' && (
        <UserManagement current_user={user} on_password_changed={on_password_changed} />
      )}
      {view === 'monitor' && user.role === 'admin' && <MonitorDashboard />}
      {view === 'categories' && <CategoryManager stats={stats} />}
      {view === 'languages' && <LanguageManager />}

      {(view === 'pois' || view === 'overview') && (
        <PoiListPanel
          mode={view}
          pois={pois}
          total={total}
          overviewTotal={stats?.total}
          page={page}
          search={search}
          category={category}
          status={status}
          loading={loading}
          error={error}
          onSearchChange={(value) => {
            set_search(value);
            set_page(1);
          }}
          onCategoryChange={(value) => {
            set_category(value);
            set_page(1);
          }}
          onStatusChange={(value) => {
            set_status(value);
            set_page(1);
          }}
          onPageChange={set_page}
          onRefresh={() => set_refresh((v) => v + 1)}
          onViewAll={() => navigate('pois')}
          onEditPoi={(poi) => set_editor(poi)}
          onPreview={(poi) => set_preview_poi(poi)}
        />
      )}

      {preview_poi && (
        <PoiNarrationDialog
          key={preview_poi.id}
          poi={preview_poi}
          on_close={() => set_preview_poi(null)}
        />
      )}
      {editor !== undefined && (
        <PoiEditor poi={editor} on_close={() => set_editor(undefined)} on_saved={saved} />
      )}
      {changing_password && (
        <PasswordChangeDialog
          username={user.username}
          on_close={() => set_changing_password(false)}
          on_saved={on_password_changed}
        />
      )}
    </AdminLayout>
  );
}
