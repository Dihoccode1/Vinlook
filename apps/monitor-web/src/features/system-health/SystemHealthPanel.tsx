/**
 * @file SystemHealthPanel.tsx
 * @description Bảng điều khiển sức khỏe hệ thống (System Health Feature)
 */

import React from 'react';
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
    <div className="system-health-panel">
      <div className="panel-header">
        <div>
          <h2>Sức khỏe Hệ thống & Dịch vụ Microservices</h2>
          <p>
            {snapshot
              ? `Thời gian kiểm tra: ${new Date(snapshot.checked_at).toLocaleTimeString('vi-VN')} • Uptime: ${Math.floor(snapshot.uptime_seconds / 60)} phút`
              : 'Đang kiểm tra kết nối...'}
          </p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="health-metrics-grid">
        <div className="metric-box">
          <span className="metric-title">Dịch vụ sẵn sàng</span>
          <span className="metric-value">
            {totalCount > 0 ? `${healthyCount}/${totalCount}` : '—'}
          </span>
          <span className="metric-sub">Kiểm tra tự động mỗi 5 giây</span>
        </div>

        <div className="metric-box">
          <span className="metric-title">Trạng thái Cơ sở dữ liệu</span>
          <span className="metric-value">
            {snapshot?.services.some((s) => s.database && s.status === 'healthy') ? 'Sẵn sàng' : 'Chưa kết nối'}
          </span>
          <span className="metric-sub">Microsoft SQL Server</span>
        </div>
      </div>
    </div>
  );
}
