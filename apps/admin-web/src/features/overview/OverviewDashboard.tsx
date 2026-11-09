/**
 * @file OverviewDashboard.tsx
 * @description Bảng điều khiển Tổng quan (Overview Dashboard) của trang Quản trị.
 * Hiển thị 6 chỉ số KPI cốt lõi, biểu đồ hoạt động thời gian thực và phân bố danh mục điểm đến.
 */

import React from 'react';
import { Icon } from '../../components/Icon';
import { categories } from '../../services/api';
import type { ActivitySample, Stats } from '../../types';
import { ActivityChart } from './ActivityChart';

interface OverviewDashboardProps {
  stats: Stats | null;
  activity: { visitors: number; listeners: number } | null;
  samples: ActivitySample[];
  onNavigateCategories: () => void;
  onCreatePoi: () => void;
}

export function OverviewDashboard({
  stats,
  activity,
  samples,
  onNavigateCategories,
  onCreatePoi
}: OverviewDashboardProps) {
  return (
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
            <button className="text-button" onClick={onNavigateCategories}>
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
          <button className="primary" onClick={onCreatePoi}>
            Bắt đầu thêm điểm mới <span>+</span>
          </button>
        </section>
      </div>
    </>
  );
}
