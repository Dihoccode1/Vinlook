/**
 * @file PoiListPanel.tsx
 * @description Bảng danh sách, tìm kiếm, lọc và phân trang Điểm tham quan (POI List Panel).
 * Dùng chung ở cả chế độ xem rút gọn (Tổng quan) và chế độ quản lý đầy đủ (Điểm tham quan).
 */

import React from 'react';
import { Icon } from '../../components/Icon';
import { categories } from '../../services/api';
import type { Poi } from '../../types';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

interface PoiListPanelProps {
  mode: 'overview' | 'pois';
  pois: Poi[];
  total: number;
  overviewTotal?: number;
  page: number;
  search: string;
  category: string;
  status: string;
  loading: boolean;
  error: string;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onViewAll: () => void;
  onEditPoi: (poi: Poi) => void;
  onPreview: (poi: Poi) => void;
}

export function PoiListPanel({
  mode,
  pois,
  total,
  overviewTotal,
  page,
  search,
  category,
  status,
  loading,
  error,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onPageChange,
  onRefresh,
  onViewAll,
  onEditPoi,
  onPreview,
}: PoiListPanelProps) {
  const isOverview = mode === 'overview';

  return (
    <section className="panel poi-panel">
      <div className="panel-title">
        <div>
          <h2>
            {isOverview ? 'Cập nhật gần đây' : 'Danh sách điểm tham quan'}{' '}
            <span className="count-badge">{isOverview ? (overviewTotal ?? '—') : total}</span>
          </h2>
          <p>
            {isOverview
              ? 'Các điểm tham quan được cập nhật gần nhất trong cơ sở dữ liệu.'
              : 'Tìm kiếm, chỉnh sửa và quản lý các POI đang có trong hệ thống.'}
          </p>
        </div>
        {isOverview ? (
          <button className="text-button" onClick={onViewAll}>
            Xem tất cả điểm đến →
          </button>
        ) : (
          <button onClick={onRefresh} disabled={loading}>
            Làm mới
          </button>
        )}
      </div>

      {!isOverview && (
        <div className="filters">
          <label className="search">
            <Icon kind="search" />
            <input
              aria-label="Tìm điểm tham quan"
              type="search"
              value={search}
              placeholder="Tìm tên hoặc địa chỉ..."
              maxLength={200}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>

          <select
            aria-label="Lọc danh mục"
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
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
            onChange={(event) => onStatusChange(event.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
          </select>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          {error} <button onClick={onRefresh}>Thử lại</button>
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
                    <span className={`category-tag ${poi.category}`}>
                      {categories[poi.category] ?? poi.category}
                    </span>
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
                        aria-label={`Nghe thử mẫu ${poi.name}`}
                        onClick={() => onPreview(poi)}
                      >
                        Nghe thử mẫu
                      </button>
                      <button
                        type="button"
                        className="edit-button primary-edit"
                        aria-label={`Chỉnh sửa ${poi.name}`}
                        onClick={() => onEditPoi(poi)}
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
          {isOverview
            ? `Hiển thị ${pois.length} địa điểm cập nhật gần nhất`
            : `${total} địa điểm • Trang ${page}/${Math.max(1, Math.ceil(total / 10))}`}
        </span>
        {!isOverview && (
          <div>
            <button disabled={page === 1 || loading} onClick={() => onPageChange(page - 1)}>
              ← Trước
            </button>
            <button disabled={page * 10 >= total || loading} onClick={() => onPageChange(page + 1)}>
              Sau →
            </button>
          </div>
        )}
      </footer>
    </section>
  );
}
