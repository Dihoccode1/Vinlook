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
    <div className="usage-stats-panel bg-[var(--card-bg)] p-[1.5rem]">
      <h2>Hoạt động du khách trực tiếp</h2>
      <div className="usage-grid grid grid-cols-[repeat(auto-fit,_minmax(240px,_1fr))] gap-[1rem] mt-[1rem]">
        <div className="usage-card bg-[#0f172a] p-[1rem] flex flex-col">
          <span className="card-num text-[1.75rem] font-bold text-[var(--accent)] my-[0.25rem] mx-[0]">
            {activity?.visitors ?? '—'}
          </span>
          <span className="card-desc text-[0.75rem] text-[var(--text-muted)]">
            Thiết bị đang mở bản đồ (5 phút gần nhất)
          </span>
        </div>
        <div className="usage-card bg-[#0f172a] p-[1rem] flex flex-col">
          <span className="card-num text-[1.75rem] font-bold text-[var(--accent)] my-[0.25rem] mx-[0]">
            {activity?.listeners ?? '—'}
          </span>
          <span className="card-desc text-[0.75rem] text-[var(--text-muted)]">
            Phiên nghe thuyết minh audio đang hoạt động
          </span>
        </div>
      </div>
    </div>
  );
}
