/**
 * @file OverviewDashboard.tsx
 * @description Phân hệ Tổng quan (Overview Dashboard) của trang Quản trị.
 * Hiển thị 3 ô chỉ số hoạt động trực tiếp, biểu đồ chuỗi thời gian và phân bố danh mục địa điểm.
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
  on_create_poi: () => void;
}

export function OverviewDashboard({
  stats,
  activity,
  samples,
  on_create_poi
}: OverviewDashboardProps) {
  const metrics = [
    {
      label: 'Tổng địa điểm',
      value: stats?.total,
      icon: 'pin' as const,
      note: 'Trong kho nội dung',
      color: 'green'
    },
    {
      label: 'Đang truy cập',
      value: activity?.visitors,
      icon: 'eye' as const,
      note: activity ? 'Phiên truy cập đang hoạt động' : 'Đang tải thông tin trực tiếp…',
      color: 'blue'
    },
    {
      label: 'Đang lắng nghe',
      value: activity?.listeners,
      icon: 'listen' as const,
      note: activity ? 'Phiên đang phát thuyết minh' : 'Đang tải thông tin trực tiếp…',
      color: 'orange'
    }
  ];

  return (
    <>
      <section className="metrics" aria-label="Thống kê địa điểm">
        {metrics.map((item) => (
          <article key={item.label}>
            <div className="metric-label">
              {item.label}
              <span className={`metric-icon ${item.color}`}>
                <Icon kind={item.icon} />
              </span>
            </div>
            <strong>{item.value ?? '—'}</strong>
            <p>{item.note}</p>
          </article>
        ))}
      </section>

      <ActivityChart samples={samples} />

      <div className="overview-grid">
        <section className="panel categories">
          <div className="panel-title">
            <div>
              <h2>Phân bố địa điểm</h2>
              <p>Mỗi danh mục, một cách khám phá thành phố.</p>
            </div>
            <span className="soft-badge">{stats?.categories.length ?? '—'} danh mục</span>
          </div>
          {Object.entries(categories).map(([key, name], index) => {
            const count = stats?.categories.find((item) => item.category === key)?.total ?? 0;
            const percent = stats?.total ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div className="category-row" key={key}>
                <div>
                  <span className={`category-dot c${index}`} />
                  {name}
                  <strong>
                    {count} <small>địa điểm</small>
                  </strong>
                </div>
                <div className="bar-track">
                  <span className={`bar-fill c${index}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
          <p className="chart-note">Tính trên toàn bộ địa điểm, gồm cả bản nháp.</p>
        </section>

        <section className="editorial-note">
          <span className="note-symbol" aria-hidden="true">
            ↗
          </span>
          <span className="eyebrow">KỂ MỘT CÂU CHUYỆN HAY</span>
          <h2>
            Mỗi nơi đến,
            <br />
            một điều đáng nhớ.
          </h2>
          <p>
            Thêm địa điểm, chọn một bức ảnh và viết câu chuyện gốc. Vinlook kết nối những câu chuyện ấy với hành trình
            của khách.
          </p>
          <button onClick={on_create_poi}>
            Bắt đầu với địa điểm mới <span>→</span>
          </button>
        </section>
      </div>
    </>
  );
}
