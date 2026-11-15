/**
 * @file SystemHealthPanel.tsx
 * @description Bảng điều khiển sức khỏe hệ thống (System Health Feature)
 */

import React from 'react';
import { Button } from '@vinlook/ui/button';
import type { SystemSnapshot } from '../../types';

interface SystemHealthPanelProps {
  snapshot: SystemSnapshot | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
}

export function SystemHealthPanel({ snapshot, loading, error, onRefresh }: SystemHealthPanelProps) {
  const healthyCount = snapshot?.services.filter((s) => s.status === 'healthy').length ?? 0;
  const totalCount = snapshot?.services.length ?? 0;

  return (
    <div className="system-health-panel bg-[var(--card-bg)] p-[1.5rem]">
      <div className="panel-header flex justify-between items-center">
        <div>
          <h2>Sức khỏe Hệ thống & Dịch vụ Microservices</h2>
          <p>
            {snapshot
              ? `Thời gian kiểm tra: ${new Date(snapshot.checked_at).toLocaleTimeString('vi-VN')} • Uptime: ${Math.floor(snapshot.uptime_seconds / 60)} phút`
              : 'Đang kiểm tra kết nối...'}
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          {loading ? 'Đang tải...' : 'Làm mới'}
        </Button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="health-metrics-grid grid grid-cols-[repeat(auto-fit,_minmax(240px,_1fr))] gap-[1rem] mt-[1rem]">
        <div className="metric-box bg-[#0f172a] p-[1rem] flex flex-col">
          <span className="metric-title text-[0.85rem] text-[var(--text-muted)]">
            Dịch vụ sẵn sàng
          </span>
          <span className="metric-value text-[1.75rem] font-bold text-[var(--accent)] my-[0.25rem] mx-[0]">
            {totalCount > 0 ? `${healthyCount}/${totalCount}` : '—'}
          </span>
          <span className="metric-sub text-[0.75rem] text-[var(--text-muted)]">
            Kiểm tra tự động mỗi 5 giây
          </span>
        </div>

        <div className="metric-box bg-[#0f172a] p-[1rem] flex flex-col">
          <span className="metric-title text-[0.85rem] text-[var(--text-muted)]">
            Trạng thái Cơ sở dữ liệu
          </span>
          <span className="metric-value text-[1.75rem] font-bold text-[var(--accent)] my-[0.25rem] mx-[0]">
            {snapshot?.services.some((s) => s.database && s.status === 'healthy')
              ? 'Sẵn sàng'
              : 'Chưa kết nối'}
          </span>
          <span className="metric-sub text-[0.75rem] text-[var(--text-muted)]">
            Microsoft SQL Server
          </span>
        </div>
      </div>
    </div>
  );
}
