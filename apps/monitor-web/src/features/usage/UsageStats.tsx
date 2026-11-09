/**
 * @file UsageStats.tsx
 * @description Thống kê lượng truy cập du khách và phiên nghe audio (Usage Feature)
 */

import React from 'react';
import type { ActivityData } from '../../types';

interface UsageStatsProps {
  activity: ActivityData | null;
}

export function UsageStats({ activity }: UsageStatsProps) {
  return (
    <div className="usage-stats-panel">
      <h2>Hoạt động du khách trực tiếp</h2>
      <div className="usage-grid">
        <div className="usage-card">
          <span className="card-num">{activity?.visitors ?? '—'}</span>
          <span className="card-desc">Thiết bị đang mở bản đồ (5 phút gần nhất)</span>
        </div>
        <div className="usage-card">
          <span className="card-num">{activity?.listeners ?? '—'}</span>
          <span className="card-desc">Phiên nghe thuyết minh audio đang hoạt động</span>
        </div>
      </div>
    </div>
  );
}
