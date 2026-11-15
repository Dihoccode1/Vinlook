/**
 * @file PoiListPanel.tsx
 * @description Bảng danh sách, tìm kiếm, lọc và phân trang Điểm tham quan (POI List Panel).
 * Dùng chung ở cả chế độ xem rút gọn (Tổng quan) và chế độ quản lý đầy đủ (Điểm tham quan).
 */

import React from 'react';
import { Alert } from '@vinlook/ui/alert';
import { Badge } from '@vinlook/ui/badge';
import { Button } from '@vinlook/ui/button';
import { Card } from '@vinlook/ui/card';
import { cn } from '@vinlook/ui/utils';
import { Input } from '@vinlook/ui/input';
import { Select } from '@vinlook/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@vinlook/ui/table';
import { Icon } from '../../components/Icon';
import { categories } from '../../services/api';
import type { Poi } from '../../types';

const CATEGORY_BADGE_CLASS: Record<string, string> = {
  market: 'bg-[#fbf0e4] text-[#a77341]',
  history: 'bg-[#edf3e6] text-[#5e7c4d]',
  architecture: 'bg-[#ecf2f2] text-[#4e6f6e]',
};

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
    <Card className="min-w-0 gap-0 overflow-hidden rounded-xl border-[#e2e8dc] bg-white shadow-[0_2px_4px_#14372103]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[22px] py-[21px]">
        <div>
          <h2 className="m-0 flex flex-wrap items-center gap-2 text-[15px] leading-[1.6] font-semibold text-[#2d473a] md:text-base">
            <span>{isOverview ? 'Cập nhật gần đây' : 'Danh sách điểm tham quan'}</span>
            <Badge
              variant="muted"
              className="rounded-md bg-[#f2f5ec] px-2 py-0.5 text-[11px] font-medium text-[#7e9668]"
            >
              {isOverview ? (overviewTotal ?? '—') : total}
            </Badge>
          </h2>
          <p className="mt-1 mb-0 text-[10px] leading-[1.8] text-[#96a18b] md:text-[11px]">
            {isOverview
              ? 'Các điểm tham quan được cập nhật gần nhất trong cơ sở dữ liệu.'
              : 'Tìm kiếm, chỉnh sửa và quản lý các POI đang có trong hệ thống.'}
          </p>
        </div>
        {isOverview ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onViewAll}
            className="text-xs font-medium text-[#5f7d50] hover:bg-[#f2f5ec]"
          >
            Xem tất cả điểm đến →
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 rounded-lg border-[#dce3d6] bg-white px-3.5 text-[11px] font-medium text-[#61735a]"
          >
            Làm mới
          </Button>
        )}
      </div>

      {!isOverview && (
        <div className="flex flex-col gap-2.5 px-[22px] pb-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Icon
              kind="search"
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#9aa893]"
            />
            <Input
              aria-label="Tìm điểm tham quan"
              type="search"
              value={search}
              placeholder="Tìm tên hoặc địa chỉ..."
              maxLength={200}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-10 rounded-[10px] border-[#dce3d6] bg-[#fcfdf9] pl-9 text-xs md:text-[13px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 md:flex md:items-center">
            <Select
              aria-label="Lọc danh mục"
              value={category}
              onChange={(event) => onCategoryChange(event.target.value)}
              className="h-10 min-w-[155px] rounded-[10px] border-[#dce3d6] bg-white text-xs md:text-[13px]"
            >
              <option value="">Tất cả danh mục</option>
              {Object.entries(categories).map(([val, name]) => (
                <option key={val} value={val}>
                  {name}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Lọc trạng thái"
              value={status}
              onChange={(event) => onStatusChange(event.target.value)}
              className="h-10 min-w-[155px] rounded-[10px] border-[#dce3d6] bg-white text-xs md:text-[13px]"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Bản nháp</option>
            </Select>
          </div>
        </div>
      )}

      {error && (
        <div className="px-[22px] pb-4">
          <Alert
            variant="destructive"
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 text-xs leading-[1.7]"
          >
            <span>{error}</span>
            <Button type="button" variant="outline" size="xs" onClick={onRefresh}>
              Thử lại
            </Button>
          </Alert>
        </div>
      )}

      <div aria-busy={loading} className="px-4 pb-2 md:px-0 md:pb-0">
        <Table className="w-full text-xs">
          <TableHeader className="sr-only md:not-sr-only md:bg-[#fbfcf9]">
            <TableRow className="border-[#edf1e7] hover:bg-transparent">
              <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
                Điểm tham quan
              </TableHead>
              <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
                Danh mục
              </TableHead>
              <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
                Trạng thái
              </TableHead>
              <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
                Cập nhật
              </TableHead>
              <TableHead className="px-[22px] py-3 text-right">
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading &&
              !error &&
              pois.map((poi) => (
                <TableRow
                  key={poi.id}
                  className="mb-3 grid grid-cols-2 gap-3 rounded-xl border border-[#e2e8dc] bg-white p-4 hover:bg-white md:mb-0 md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:border-b md:border-[#edf1e7] md:p-0 md:hover:bg-[#fafcf8]"
                >
                  <TableCell className="col-span-2 p-0 md:table-cell md:px-[22px] md:py-4">
                    <div className="flex items-center gap-3.5">
                      {poi.image_url ? (
                        <img
                          src={`${poi.image_url}?v=${encodeURIComponent(poi.updated_at)}`}
                          alt=""
                          loading="lazy"
                          className="h-12 w-12 shrink-0 rounded-[10px] object-cover bg-[#edf2e6]"
                        />
                      ) : (
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[10px] bg-[#edf2e6] text-[#7c9472]">
                          <Icon kind="photo" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <strong className="block text-[13px] font-semibold text-foreground md:text-[13px]">
                          {poi.name}
                        </strong>
                        <small className="mt-0.5 block text-[11px] leading-[1.45] text-[#7a8976]">
                          {poi.address}
                        </small>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="flex flex-col items-start gap-1 p-0 md:table-cell md:px-4 md:py-4">
                    <span className="text-[10px] font-medium text-[#7e8b75] md:hidden">
                      Danh mục
                    </span>
                    <Badge
                      variant="muted"
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[10px] font-medium whitespace-nowrap',
                        CATEGORY_BADGE_CLASS[poi.category] ?? 'bg-[#edf2e6] text-[#5e7c4d]',
                      )}
                    >
                      {categories[poi.category] ?? poi.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="flex flex-col items-start gap-1 p-0 md:table-cell md:px-4 md:py-4">
                    <span className="text-[10px] font-medium text-[#7e8b75] md:hidden">
                      Trạng thái
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 text-[11px] font-medium',
                        poi.is_published ? 'text-[#487650]' : 'text-[#8c7050]',
                      )}
                    >
                      <i
                        className={cn(
                          'inline-block h-1.5 w-1.5 rounded-full',
                          poi.is_published ? 'bg-[#4f8459]' : 'bg-[#c5965f]',
                        )}
                      />
                      {poi.is_published ? 'Đã xuất bản' : 'Bản nháp'}
                    </span>
                  </TableCell>
                  <TableCell className="col-span-2 flex flex-col items-start gap-1 p-0 text-[11px] whitespace-nowrap text-[#72826c] md:table-cell md:px-4 md:py-4 md:text-xs">
                    <span className="text-[10px] font-medium text-[#7e8b75] md:hidden">
                      Cập nhật
                    </span>
                    <span>{formatDate(poi.updated_at)}</span>
                  </TableCell>
                  <TableCell className="col-span-2 p-0 md:table-cell md:px-[22px] md:py-4 md:text-right">
                    <div className="grid grid-cols-2 gap-2 md:inline-flex md:flex-col md:items-end md:gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="h-8 rounded-lg border-[#dce3d6] bg-white px-2.5 text-[10px] font-medium text-[#475d45]"
                        aria-label={`Nghe thử mẫu ${poi.name}`}
                        onClick={() => onPreview(poi)}
                      >
                        Nghe thử mẫu
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="h-8 rounded-lg border-[#d5e2cf] bg-[#edf4e9] px-2.5 text-[10px] font-semibold text-[#254c38] hover:bg-[#e3eedf]"
                        aria-label={`Chỉnh sửa ${poi.name}`}
                        onClick={() => onEditPoi(poi)}
                      >
                        Chỉnh sửa →
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>

        {loading && (
          <p className="px-4 py-8 text-center text-xs text-[#85917d]" role="status">
            Đang tải danh sách điểm tham quan...
          </p>
        )}
        {!loading && !error && !pois.length && (
          <p className="px-4 py-8 text-center text-xs text-[#85917d]">
            Không có địa điểm nào phù hợp. Vui lòng thử bộ lọc khác.
          </p>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1e7] px-[22px] py-4 text-xs text-[#7c8b74]">
        <span>
          {isOverview
            ? `Hiển thị ${pois.length} địa điểm cập nhật gần nhất`
            : `${total} địa điểm • Trang ${page}/${Math.max(1, Math.ceil(total / 10))}`}
        </span>
        {!isOverview && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={page === 1 || loading}
              onClick={() => onPageChange(page - 1)}
              className="h-8 rounded-lg border-[#dce3d6] px-3 text-[11px]"
            >
              ← Trước
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={page * 10 >= total || loading}
              onClick={() => onPageChange(page + 1)}
              className="h-8 rounded-lg border-[#dce3d6] px-3 text-[11px]"
            >
              Sau →
            </Button>
          </div>
        )}
      </footer>
    </Card>
  );
}
