/**
 * @file PoiListPanel.tsx
 * @description Bảng danh sách, tìm kiếm, lọc và phân trang Điểm tham quan (POI List Panel).
 * Dùng chung ở chế độ xem rút gọn (Tổng quan) và chế độ quản lý đầy đủ (Quản lý địa điểm).
 */

import React from 'react';
import { Icon } from '../../components/Icon';
import { categories } from '../../services/api';
import type { Poi } from '../../types';

const format_date = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh'
  });

interface PoiListPanelProps {
  mode: 'overview' | 'pois';
  pois: Poi[];
  total: number;
  overview_total?: number;
  page: number;
  search: string;
  category: string;
  status: string;
  loading: boolean;
  error: string;
  on_search_change: (value: string) => void;
  on_category_change: (value: string) => void;
  on_status_change: (value: string) => void;
  on_page_change: (page: number) => void;
  on_refresh: () => void;
  on_view_all: () => void;
  on_edit_poi: (poi: Poi) => void;
  on_open_qr: (poi: Poi) => void;
}

export function PoiListPanel({
  mode,
  pois,
  total,
  overview_total,
  page,
  search,
  category,
  status,
  loading,
  error,
  on_search_change,
  on_category_change,
  on_status_change,
  on_page_change,
  on_refresh,
  on_view_all,
  on_edit_poi,
  on_open_qr
}: PoiListPanelProps) {
  const is_overview = mode === 'overview';

  return (
    <section className="panel poi-panel">
      <div className="panel-title">
        <div>
          <h2>
            {is_overview ? 'Cập nhật gần đây' : 'Danh sách địa điểm'}{' '}
            <span className="count-badge">{is_overview ? overview_total ?? '—' : total}</span>
          </h2>
          <p>
            {is_overview
              ? 'Các địa điểm được cập nhật gần nhất trong database.'
              : 'Tìm và quản lý các POI đang có trong hệ thống.'}
          </p>
        </div>
        {is_overview ? (
          <button className="text-button" onClick={on_view_all}>
            Xem tất cả →
          </button>
        ) : (
          <button onClick={on_refresh} disabled={loading}>
            ↻ Làm mới
          </button>
        )}
      </div>

      {!is_overview && (
        <div className="filters">
          <label className="search">
            <Icon kind="search" />
            <input
              aria-label="Tìm địa điểm"
              type="search"
              value={search}
              placeholder="Tìm tên hoặc địa chỉ…"
              maxLength={200}
              onChange={(event) => on_search_change(event.target.value)}
            />
          </label>

          <select
            aria-label="Lọc danh mục"
            value={category}
            onChange={(event) => on_category_change(event.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {Object.entries(categories).map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(event) => on_status_change(event.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
          </select>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          {error} <button onClick={on_refresh}>Thử lại</button>
        </div>
      )}

      <div className="table-wrap" aria-busy={loading}>
        <table>
          <thead>
            <tr>
              <th>Địa điểm</th>
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
                    {format_date(poi.updated_at)}
                  </td>
                  <td>
                    <div className="poi-actions">
                      <button
                        type="button"
                        className="edit-button"
                        aria-label={`Mã QR ${poi.name}`}
                        onClick={() => on_open_qr(poi)}
                      >
                        Mã QR
                      </button>
                      <button
                        type="button"
                        className="edit-button"
                        aria-label={`Chỉnh sửa ${poi.name}`}
                        onClick={() => on_edit_poi(poi)}
                      >
                        Chỉnh sửa ↗
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {loading && (
          <p className="empty-state" role="status">
            Đang tải địa điểm…
          </p>
        )}
        {!loading && !error && !pois.length && (
          <p className="empty-state">Chưa có địa điểm phù hợp. Thử bộ lọc khác hoặc thêm địa điểm mới.</p>
        )}
      </div>

      <footer className="table-footer">
        <span>
          {is_overview
            ? `Hiển thị ${pois.length} địa điểm cập nhật gần nhất`
            : `${total} địa điểm · Trang ${page}/${Math.max(1, Math.ceil(total / 10))}`}
        </span>
        {!is_overview && (
          <div>
            <button disabled={page === 1 || loading} onClick={() => on_page_change(page - 1)}>
              ← Trước
            </button>
            <button disabled={page * 10 >= total || loading} onClick={() => on_page_change(page + 1)}>
              Sau →
            </button>
          </div>
        )}
      </footer>
    </section>
  );
}
