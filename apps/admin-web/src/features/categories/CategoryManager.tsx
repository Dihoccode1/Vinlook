/**
 * @file CategoryManager.tsx
 * @description Phân hệ Quản lý Danh mục Điểm tham quan (Categories Feature)
 * Hiển thị và quản lý phân loại các nhóm điểm đến du lịch (Lịch sử, Chợ, Kiến trúc, Ẩm thực,...).
 */

import React from 'react';
import { categories } from '../../services/api';
import type { Stats } from '../../types';

interface CategoryManagerProps {
  stats: Stats | null;
}

export function CategoryManager({ stats }: CategoryManagerProps) {
  const categoryCounts = new Map<string, number>();
  stats?.categories.forEach((c) => {
    categoryCounts.set(c.category, c.total);
  });

  return (
    <section className="panel category-manager">
      <div className="panel-title">
        <div>
          <h2>Danh mục điểm tham quan</h2>
          <p>Phân loại chủ đề cho các điểm đến trên bản đồ du lịch.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã danh mục</th>
              <th>Tên hiển thị tiếng Việt</th>
              <th>Số lượng điểm đến</th>
              <th>Mô tả chức năng</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(categories).map(([code, name]) => {
              const count = categoryCounts.get(code) ?? 0;
              return (
                <tr key={code}>
                  <td>
                    <code>{code}</code>
                  </td>
                  <td>
                    <strong>{name}</strong>
                  </td>
                  <td>
                    <span className="badge">{count} địa điểm</span>
                  </td>
                  <td>
                    {code === 'market' && 'Khu mua sắm, chợ truyền thống và trung tâm thương mại.'}
                    {code === 'history' && 'Bảo tàng, di tích lịch sử và công trình tưởng niệm.'}
                    {code === 'architecture' &&
                      'Công trình kiến trúc tiêu biểu, tôn giáo và văn hóa đặc sắc.'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
