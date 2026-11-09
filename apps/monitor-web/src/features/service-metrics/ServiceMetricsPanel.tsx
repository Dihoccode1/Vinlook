/**
 * @file ServiceMetricsPanel.tsx
 * @description Bảng đo lường chi tiết độ trễ và trạng thái từng Microservice (Service Metrics Feature)
 */

import React from 'react';
import type { ServiceStatus } from '../../types';

interface ServiceMetricsPanelProps {
  services: ServiceStatus[];
}

export function ServiceMetricsPanel({ services }: ServiceMetricsPanelProps) {
  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <span className="status-badge healthy">Hoạt động tốt</span>;
      case 'unavailable':
        return <span className="status-badge unavailable">Chưa sẵn sàng</span>;
      default:
        return <span className="status-badge unreachable">Mất kết nối</span>;
    }
  };

  return (
    <div className="service-metrics-panel">
      <h2>Chi tiết từng dịch vụ</h2>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Tên dịch vụ</th>
              <th>Mã định danh (ID)</th>
              <th>Trạng thái</th>
              <th>Độ trễ phản hồi</th>
              <th>Cơ sở dữ liệu</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td>
                  <strong>{service.name}</strong>
                </td>
                <td>
                  <code>{service.id}</code>
                </td>
                <td>{getStatusBadge(service.status)}</td>
                <td>{service.latency_ms !== null ? `${service.latency_ms} ms` : '—'}</td>
                <td>{service.database ? `${service.database} (SQL Server)` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
