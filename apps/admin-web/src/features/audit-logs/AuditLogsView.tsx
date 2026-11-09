/**
 * @file AuditLogsView.tsx
 * @description Phân hệ Nhật ký Kiểm toán & Bảo mật (Audit Logs Feature)
 * Theo dõi lịch sử các thao tác thay đổi dữ liệu, đăng nhập và quản lý phiên làm việc.
 */

import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface LogItem {
  id: number;
  time: string;
  level: 'info' | 'error';
  message: string;
  status: number | null;
}

export function AuditLogsView() {
  const [logs, set_logs] = useState<LogItem[]>([]);
  const [loading, set_loading] = useState(true);
  const [error, set_error] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api<{ data: { system: LogItem[] } }>('/monitor/events', { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          set_logs(res.data.system || []);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          set_error(e instanceof Error ? e.message : 'Không tải được nhật ký kiểm toán.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) set_loading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <section className="panel audit-logs-view">
      <div className="panel-title">
        <div>
          <h2>Nhật ký kiểm toán hệ thống</h2>
          <p>Ghi nhận chi tiết các thao tác quản trị, đăng nhập và thay đổi dữ liệu theo thời gian thực.</p>
        </div>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <div className="table-wrap" aria-busy={loading}>
        <table>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Mức độ</th>
              <th>Nội dung thao tác</th>
              <th>Mã HTTP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.time).toLocaleString('vi-VN')}</td>
                <td>
                  <span className={`publish-status ${log.level === 'info' ? 'published' : ''}`}>
                    {log.level.toUpperCase()}
                  </span>
                </td>
                <td>{log.message}</td>
                <td>
                  <code>{log.status ?? '—'}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading ? (
          <p className="empty-state">Đang tải nhật ký kiểm toán...</p>
        ) : !logs.length ? (
          <p className="empty-state">Chưa có bản ghi nhật ký kiểm toán nào.</p>
        ) : null}
      </div>
    </section>
  );
}
