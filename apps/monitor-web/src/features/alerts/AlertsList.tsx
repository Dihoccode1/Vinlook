/**
 * @file AlertsList.tsx
 * @description Danh sách cảnh báo và sự cố hệ thống (Alerts Feature)
 */

import React from 'react';
import type { JournalEntry } from '../../types';

interface AlertsListProps {
  alerts: JournalEntry[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const errorAlerts = alerts.filter((a) => a.level === 'error');

  return (
    <div className="alerts-list-panel">
      <h2>Cảnh báo & Sự cố hệ thống</h2>
      {!errorAlerts.length ? (
        <p className="empty-notice">Không có cảnh báo hoặc lỗi nghiêm trọng nào được ghi nhận.</p>
      ) : (
        <ul className="alerts-items">
          {errorAlerts.map((alert) => (
            <li key={alert.id} className="alert-item error">
              <span className="alert-time">{new Date(alert.time).toLocaleTimeString('vi-VN')}</span>
              <span className="alert-msg">{alert.message}</span>
              {alert.status && <span className="alert-code">HTTP {alert.status}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
