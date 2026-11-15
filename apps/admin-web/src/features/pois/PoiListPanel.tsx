import { Table } from '@vinlook/ui/table';
import { NativeSelect } from '@vinlook/ui/native-select';
import { Input } from '@vinlook/ui/input';
import { Button } from '@vinlook/ui/button';
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
    <section className="panel overflow-hidden poi-panel mb-[24px]">
      <div className="panel-title justify-between">
        <div>
          <h2>
            {isOverview ? 'Cập nhật gần đây' : 'Danh sách điểm tham quan'}{' '}
            <span className="count-badge ml-[6px]">
              {isOverview ? (overviewTotal ?? '—') : total}
            </span>
          </h2>
          <p>
            {isOverview
              ? 'Các điểm tham quan được cập nhật gần nhất trong cơ sở dữ liệu.'
              : 'Tìm kiếm, chỉnh sửa và quản lý các POI đang có trong hệ thống.'}
          </p>
        </div>
        {isOverview ? (
          <Button
            variant="custom"
            type="submit"
            className="text-button bg-[transparent]"
            onClick={onViewAll}
          >
            Xem tất cả điểm đến →
          </Button>
        ) : (
          <Button variant="custom" type="submit" onClick={onRefresh} disabled={loading}>
            Làm mới
          </Button>
        )}
      </div>

      {!isOverview && (
        <div className="filters flex items-center [@media(max-width:_760px)]:min-w-0">
          <label className="search flex items-center gap-[8px] flex-[1] text-[#93a383]">
            <Icon kind="search" />
            <Input
              appearance="custom"
              aria-label="Tìm điểm tham quan"
              type="search"
              value={search}
              placeholder="Tìm tên hoặc địa chỉ..."
              maxLength={200}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>

          <NativeSelect
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
          </NativeSelect>

          <NativeSelect
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
          </NativeSelect>
        </div>
      )}

      {error && (
        <div
          className="error-banner py-[13px] px-[15px] bg-[#fff0e8] text-[#a65d40] rounded-[8px]"
          role="alert"
        >
          {error}{' '}
          <Button variant="custom" type="submit" onClick={onRefresh}>
            Thử lại
          </Button>
        </div>
      )}

      <div className="table-wrap" aria-busy={loading}>
        <Table>
          <thead>
            <tr>
              <th>Điểm tham quan</th>
              <th>Danh mục</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
              <th>
                <span className="sr-only absolute w-[1px] h-[1px] p-[0] m-[-1px] overflow-hidden whitespace-nowrap">
                  Thao tác
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading &&
              !error &&
              pois.map((poi) => (
                <tr key={poi.id}>
                  <td>
                    <div className="poi-cell flex items-center [@media(max-width:_760px)]:items-start">
                      {poi.image_url ? (
                        <img
                          src={`${poi.image_url}?v=${encodeURIComponent(poi.updated_at)}`}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span className="photo-placeholder grid bg-[#edf2e6] text-[#95a583]">
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
                    <span
                      className={`category-tag inline-block [@media(max-width:_760px)]:max-w-[100%] ${poi.category}`}
                    >
                      {categories[poi.category] ?? poi.category}
                    </span>
                  </td>
                  <td data-label="Trạng thái">
                    <span
                      className={`publish-status [@media(max-width:_760px)]:max-w-[100%] ${poi.is_published ? 'published' : ''}`}
                    >
                      <i />
                      {poi.is_published ? 'Đã xuất bản' : 'Bản nháp'}
                    </span>
                  </td>
                  <td data-label="Cập nhật" className="updated-date">
                    {formatDate(poi.updated_at)}
                  </td>
                  <td>
                    <div className="poi-actions">
                      <Button
                        variant="custom"
                        type="button"
                        className="edit-button whitespace-nowrap"
                        aria-label={`Nghe thử mẫu ${poi.name}`}
                        onClick={() => onPreview(poi)}
                      >
                        Nghe thử mẫu
                      </Button>
                      <Button
                        variant="custom"
                        type="button"
                        className="edit-button whitespace-nowrap primary-edit"
                        aria-label={`Chỉnh sửa ${poi.name}`}
                        onClick={() => onEditPoi(poi)}
                      >
                        Chỉnh sửa →
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </Table>

        {loading && (
          <p className="empty-state p-[25px] text-center text-[#8c9a7f]" role="status">
            Đang tải danh sách điểm tham quan...
          </p>
        )}
        {!loading && !error && !pois.length && (
          <p className="empty-state p-[25px] text-center text-[#8c9a7f]">
            Không có địa điểm nào phù hợp. Vui lòng thử bộ lọc khác.
          </p>
        )}
      </div>

      <footer className="table-footer flex items-center justify-between">
        <span>
          {isOverview
            ? `Hiển thị ${pois.length} địa điểm cập nhật gần nhất`
            : `${total} địa điểm • Trang ${page}/${Math.max(1, Math.ceil(total / 10))}`}
        </span>
        {!isOverview && (
          <div>
            <Button
              variant="custom"
              type="submit"
              disabled={page === 1 || loading}
              onClick={() => onPageChange(page - 1)}
            >
              ← Trước
            </Button>
            <Button
              variant="custom"
              type="submit"
              disabled={page * 10 >= total || loading}
              onClick={() => onPageChange(page + 1)}
            >
              Sau →
            </Button>
          </div>
        )}
      </footer>
    </section>
  );
}
