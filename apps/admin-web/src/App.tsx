/**
 * @file App.tsx
 * @description Giao diện chính phân hệ Quản trị (Admin Web Application)
 * Đồ án môn học Công nghệ Phần mềm - Vinlook Tourism Platform
 * Kết nối các phân hệ chức năng: Tổng quan, Điểm tham quan, Danh mục, Ngôn ngữ, Giám sát, Quản lý tài khoản.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api, categories } from './services/api';
import type { Poi, Stats, ActivitySample } from './types';
import { Icon } from './components/Icon';
import { PoiEditor } from './features/pois/PoiEditor';
import { PoiQrDialog } from './features/pois/PoiQrDialog';
import { MonitorDashboard } from './features/overview/MonitorDashboard';
import { ActivityChart } from './features/overview/ActivityChart';
import { UserManagement } from './features/users/UserManagement';
import { CategoryManager } from './features/categories/CategoryManager';
import { LanguageManager } from './features/languages/LanguageManager';
import { AdminLayout } from './layouts/AdminLayout';
import type { AdminViewTab } from './layouts/AdminLayout';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh'
  });

interface AppProps {
  on_logout: () => Promise<void>;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'staff';
  };
}

export default function App({ on_logout, user }: AppProps) {
  // Trạng thái tab hiển thị hiện tại
  const [view, set_view] = useState<AdminViewTab>('overview');

  // Dữ liệu thống kê và danh sách điểm tham quan
  const [stats, set_stats] = useState<Stats | null>(null);
  const [pois, set_pois] = useState<Poi[]>([]);
  const [total, set_total] = useState(0);
  const [page, set_page] = useState(1);

  // Bộ lọc tìm kiếm
  const [search, set_search] = useState('');
  const [category, set_category] = useState('');
  const [status, set_status] = useState('all');

  // Trạng thái tải và thông báo lỗi
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState('');
  const [refresh, set_refresh] = useState(0);
  const [toast, set_toast] = useState('');
  const [logging_out, set_logging_out] = useState(false);

  // Hoạt động thời gian thực (visitors / listeners)
  const [activity, set_activity] = useState<{ visitors: number; listeners: number } | null>(null);
  const [samples, set_samples] = useState<ActivitySample[]>([]);

  // Dialog mở modal soạn thảo POI hoặc mã QR
  const [editor, set_editor] = useState<Poi | null | undefined>(undefined);
  const [qr_poi, set_qr_poi] = useState<Poi | null>(null);

  const main_ref = useRef<HTMLElement>(null);

  // Cuộn về đầu trang mỗi khi chuyển tab
  useLayoutEffect(() => {
    main_ref.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [view]);

  /**
   * Xử lý đăng xuất
   */
  async function logout() {
    set_logging_out(true);
    try {
      await on_logout();
    } catch {
      set_toast('Chưa đăng xuất được. Vui lòng thử lại.');
      set_logging_out(false);
    }
  }

  // Tải thống kê tổng quan từ cơ sở dữ liệu
  useEffect(() => {
    const controller = new AbortController();
    api<{ data: Stats }>('/stats', { signal: controller.signal })
      .then((result) => set_stats(result.data))
      .catch(() => {
        if (!controller.signal.aborted) {
          set_error('Không thể tải tổng quan từ database.');
        }
      });
    return () => controller.abort();
  }, [refresh]);

  // Tải danh sách điểm tham quan (có debounce tìm kiếm và phân trang)
  useEffect(() => {
    if (view === 'monitor' || view === 'users' || view === 'languages' || view === 'categories') return;

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
            set_error(failure instanceof Error ? failure.message : 'Không tải được danh sách địa điểm.');
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

  // Tự động đóng toast sau 5 giây
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => set_toast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Polling đo lường hoạt động du khách (visitors, listeners) trong 5 phút
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
          set_samples((prev) => {
            const next = [...prev, { time: Date.now(), ...result.data }];
            return next.filter((item) => item.time >= Date.now() - 300000);
          });
        }
      } catch {
        // Bỏ qua lỗi tạm thời khi polling hoạt động
      } finally {
        pending = false;
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 5000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [view]);

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

  return (
    <AdminLayout
      user={user}
      currentView={view}
      onViewChange={navigate}
      onLogout={logout}
      loggingOut={logging_out}
      toast={toast}
      onClearToast={() => set_toast('')}
    >
      {/* Phân hệ Tổng quan (Overview View) */}
      {view === 'overview' && (
        <>
          <section className="metrics" aria-label="Các chỉ số chính">
            <article>
              <div className="metric-label">
                <Icon kind="pin" /> Điểm tham quan
              </div>
              <strong>{stats?.total ?? '—'}</strong>
              <p>Tổng số điểm đến trong cơ sở dữ liệu</p>
            </article>

            <article>
              <div className="metric-label">
                <Icon kind="eye" /> Đã xuất bản
              </div>
              <strong>{stats?.published ?? '—'}</strong>
              <p>Hiển thị công khai cho du khách trên bản đồ</p>
            </article>

            <article>
              <div className="metric-label">
                <Icon kind="draft" /> Bản nháp
              </div>
              <strong>{stats?.drafts ?? '—'}</strong>
              <p>Đang biên soạn hoặc chờ kiểm duyệt kịch bản</p>
            </article>

            <article>
              <div className="metric-label">
                <Icon kind="photo" /> Có ảnh minh họa
              </div>
              <strong>{stats?.with_images ?? '—'}</strong>
              <p>Đã tải ảnh thực tế và bản quyền tác giả</p>
            </article>

            <article>
              <div className="metric-label">
                <Icon kind="user" /> Đang truy cập
              </div>
              <strong>{activity?.visitors ?? '—'}</strong>
              <p>Số thiết bị đang mở bản đồ (5 phút gần nhất)</p>
            </article>

            <article>
              <div className="metric-label">
                <Icon kind="listen" /> Đang nghe thuyết minh
              </div>
              <strong>{activity?.listeners ?? '—'}</strong>
              <p>Số phiên audio thuyết minh đang phát trực tiếp</p>
            </article>
          </section>

          <ActivityChart samples={samples} />

          <div className="overview-split">
            <section className="panel categories-overview">
              <div className="panel-title">
                <h2>Phân bố danh mục</h2>
                <button className="text-button" onClick={() => navigate('categories')}>
                  Chi tiết danh mục →
                </button>
              </div>
              <div className="category-bars">
                {stats?.categories.map((c) => {
                  const pct = stats.total ? Math.round((c.total / stats.total) * 100) : 0;
                  return (
                    <div key={c.category} className="cat-row">
                      <div className="cat-meta">
                        <span>{categories[c.category] ?? c.category}</span>
                        <strong>
                          {c.total} <small>({pct}%)</small>
                        </strong>
                      </div>
                      <div className="cat-bar">
                        <div className={`cat-fill ${c.category}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel get-started">
              <span className="eyebrow">KHỞI ĐẦU ĐIỂM ĐẾN</span>
              <h2>Kể câu chuyện về thành phố.</h2>
              <p>
                Thêm điểm tham quan, chọn một bức ảnh đẹp và viết câu chuyện lịch sử văn hóa. Vinlook kết nối những câu
                chuyện ấy với hành trình của du khách.
              </p>
              <button className="primary" onClick={() => set_editor(null)}>
                Bắt đầu thêm điểm mới <span>+</span>
              </button>
            </section>
          </div>
        </>
      )}

      {/* Phân hệ Quản lý tài khoản (Users View) */}
      {view === 'users' && user.role === 'admin' && <UserManagement current_user_id={user.id} />}

      {/* Phân hệ Giám sát hệ thống (Monitor View) */}
      {view === 'monitor' && user.role === 'admin' && <MonitorDashboard />}

      {/* Phân hệ Danh mục (Categories View) */}
      {view === 'categories' && <CategoryManager stats={stats} />}

      {/* Phân hệ Ngôn ngữ (Languages View) */}
      {view === 'languages' && <LanguageManager />}

      {/* Phân hệ Danh sách điểm tham quan (POI List View hoặc bảng gần đây ở Overview) */}
      {(view === 'pois' || view === 'overview') && (
        <section className="panel poi-panel">
          <div className="panel-title">
            <div>
              <h2>
                {view === 'overview' ? 'Cập nhật gần đây' : 'Danh sách điểm tham quan'}{' '}
                <span className="count-badge">{view === 'overview' ? stats?.total ?? '—' : total}</span>
              </h2>
              <p>
                {view === 'overview'
                  ? 'Các điểm tham quan được cập nhật gần nhất trong cơ sở dữ liệu.'
                  : 'Tìm kiếm, chỉnh sửa và quản lý các POI đang có trong hệ thống.'}
              </p>
            </div>
            {view === 'overview' ? (
              <button className="text-button" onClick={() => navigate('pois')}>
                Xem tất cả điểm đến →
              </button>
            ) : (
              <button onClick={() => set_refresh((v) => v + 1)} disabled={loading}>
                Làm mới
              </button>
            )}
          </div>

          {view === 'pois' && (
            <div className="filters">
              <label className="search">
                <Icon kind="search" />
                <input
                  aria-label="Tìm điểm tham quan"
                  type="search"
                  value={search}
                  placeholder="Tìm tên hoặc địa chỉ..."
                  maxLength={200}
                  onChange={(event) => {
                    set_search(event.target.value);
                    set_page(1);
                  }}
                />
              </label>

              <select
                aria-label="Lọc danh mục"
                value={category}
                onChange={(event) => {
                  set_category(event.target.value);
                  set_page(1);
                }}
              >
                <option value="">Tất cả danh mục</option>
                {Object.entries(categories).map(([val, name]) => (
                  <option key={val} value={val}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Lọc trạng thái"
                value={status}
                onChange={(event) => {
                  set_status(event.target.value);
                  set_page(1);
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="published">Đã xuất bản</option>
                <option value="draft">Bản nháp</option>
              </select>
            </div>
          )}

          {error && (
            <div className="error-banner" role="alert">
              {error} <button onClick={() => set_refresh((v) => v + 1)}>Thử lại</button>
            </div>
          )}

          <div className="table-wrap" aria-busy={loading}>
            <table>
              <thead>
                <tr>
                  <th>Điểm tham quan</th>
                  <th>Danh mục</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  !error &&
                  pois.map((poi) => (
                    <tr key={poi.id}>
                      <td>
                        <div className="poi-cell">
                          {poi.image_url ? (
                            <img
                              src={`${poi.image_url}?v=${encodeURIComponent(poi.updated_at)}`}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span className="photo-placeholder">
                              <Icon kind="photo" />
                            </span>
                          )}
                          <div>
                            <strong>{poi.name}</strong>
                            <small>{poi.address}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Danh mục">
                        <span className={`category-tag ${poi.category}`}>{categories[poi.category] ?? poi.category}</span>
                      </td>
                      <td data-label="Trạng thái">
                        <span className={`publish-status ${poi.is_published ? 'published' : ''}`}>
                          <i />
                          {poi.is_published ? 'Đã xuất bản' : 'Bản nháp'}
                        </span>
                      </td>
                      <td data-label="Cập nhật" className="updated-date">
                        {formatDate(poi.updated_at)}
                      </td>
                      <td>
                        <div className="poi-actions">
                          <button
                            type="button"
                            className="edit-button"
                            aria-label={`Mã QR ${poi.name}`}
                            onClick={() => set_qr_poi(poi)}
                          >
                            Mã QR
                          </button>
                          <button
                            type="button"
                            className="edit-button primary-edit"
                            aria-label={`Chỉnh sửa ${poi.name}`}
                            onClick={() => set_editor(poi)}
                          >
                            Chỉnh sửa →
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {loading && (
              <p className="empty-state" role="status">
                Đang tải danh sách điểm tham quan...
              </p>
            )}
            {!loading && !error && !pois.length && (
              <p className="empty-state">Không có địa điểm nào phù hợp. Vui lòng thử bộ lọc khác.</p>
            )}
          </div>

          <footer className="table-footer">
            <span>
              {view === 'overview'
                ? `Hiển thị ${pois.length} địa điểm cập nhật gần nhất`
                : `${total} địa điểm • Trang ${page}/${Math.max(1, Math.ceil(total / 10))}`}
            </span>
            {view === 'pois' && (
              <div>
                <button disabled={page === 1 || loading} onClick={() => set_page((v) => v - 1)}>
                  ← Trước
                </button>
                <button disabled={page * 10 >= total || loading} onClick={() => set_page((v) => v + 1)}>
                  Sau →
                </button>
              </div>
            )}
          </footer>
        </section>
      )}

      {/* Modal Dialog xem và tạo mã QR */}
      {qr_poi && <PoiQrDialog key={qr_poi.id} poi={qr_poi} on_close={() => set_qr_poi(null)} />}

      {/* Modal Dialog soạn thảo điểm tham quan */}
      {editor !== undefined && <PoiEditor poi={editor} on_close={() => set_editor(undefined)} on_saved={saved} />}
    </AdminLayout>
  );
}
