/**
 * @file CategoryManager.tsx
 * @description Phân hệ Quản lý Danh mục Điểm tham quan (Categories Feature)
 * Hiển thị và quản lý phân loại các nhóm điểm đến du lịch (Lịch sử, Chợ, Kiến trúc, Ẩm thực,...).
 */

import React from 'react';
import { Badge } from '@vinlook/ui/badge';
import { Card } from '@vinlook/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@vinlook/ui/table';
import { categories } from '../../services/api';
import type { Stats } from '../../types';

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  market: 'Khu mua sắm, chợ truyền thống và trung tâm thương mại.',
  history: 'Bảo tàng, di tích lịch sử và công trình tưởng niệm.',
  architecture: 'Công trình kiến trúc tiêu biểu, tôn giáo và văn hóa đặc sắc.',
};

interface CategoryManagerProps {
  stats: Stats | null;
}

export function CategoryManager({ stats }: CategoryManagerProps) {
  const categoryCounts = new Map<string, number>();
  stats?.categories.forEach((c) => {
    categoryCounts.set(c.category, c.total);
  });

  return (
    <Card className="min-w-0 gap-0 overflow-hidden rounded-xl border-[#e2e8dc] bg-white shadow-[0_2px_4px_#14372103]">
      <div className="px-[22px] py-[21px]">
        <h2 className="m-0 text-[15px] leading-[1.6] font-semibold text-[#2d473a] md:text-base">
          Danh mục điểm tham quan
        </h2>
        <p className="mt-1 mb-0 text-[10px] leading-[1.8] text-[#96a18b] md:text-[11px]">
          Phân loại chủ đề cho các điểm đến trên bản đồ du lịch.
        </p>
      </div>

      <Table className="w-full text-xs">
        <TableHeader className="sr-only sm:not-sr-only sm:bg-[#fbfcf9]">
          <TableRow className="border-[#edf1e7] hover:bg-transparent">
            <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
              Mã danh mục
            </TableHead>
            <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
              Tên hiển thị tiếng Việt
            </TableHead>
            <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
              Số lượng điểm đến
            </TableHead>
            <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
              Mô tả chức năng
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(categories).map(([code, name]) => {
            const count = categoryCounts.get(code) ?? 0;
            return (
              <TableRow
                key={code}
                className="grid grid-cols-1 gap-2 border-b border-[#edf1e7] px-[22px] py-4 sm:table-row sm:p-0"
              >
                <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-[22px] sm:py-4">
                  <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">
                    Mã danh mục
                  </span>
                  <code className="rounded bg-[#f0f4eb] px-1.5 py-0.5 font-mono text-[11px] text-[#2d473a]">
                    {code}
                  </code>
                </TableCell>
                <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-4 sm:py-4">
                  <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">Tên</span>
                  <strong className="font-semibold text-foreground">{name}</strong>
                </TableCell>
                <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-4 sm:py-4">
                  <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">Số lượng</span>
                  <Badge
                    variant="muted"
                    className="rounded-[5px] bg-[#edf2e6] px-2 py-1 text-[10px] font-medium text-[#7f9868]"
                  >
                    {count} địa điểm
                  </Badge>
                </TableCell>
                <TableCell className="flex flex-col gap-0.5 p-0 text-[#5b6d55] sm:table-cell sm:px-[22px] sm:py-4">
                  <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">Mô tả</span>
                  <span>{CATEGORY_DESCRIPTIONS[code] ?? ''}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
