/**
 * @file EventLogs.tsx
 * @description Nhật ký chi tiết các sự kiện hệ thống (Logs Feature)
 */

import React from 'react';
import type { JournalEntry } from '../../types';

interface EventLogsProps {
  systemLogs: JournalEntry[];
  usageLogs: JournalEntry[];
}

export function EventLogs({ systemLogs, usageLogs }: EventLogsProps) {
  return (
    <div className="event-logs-panel">
      <h2>Nhật ký hoạt động chi tiết</h2>
      <div className="logs-columns">
        <div className="log-col">
          <h3>Nhật ký hệ thống</h3>
          <ul className="log-list">
            {systemLogs.slice(0, 10).map((log) => (
              <li key={log.id} className={`log-entry ${log.level}`}>
                <span className="log-time">{new Date(log.time).toLocaleTimeString('vi-VN')}</span>
                <span className="log-msg">{log.message}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="log-col">
          <h3>Yêu cầu từ du khách</h3>
          <ul className="log-list">
            {usageLogs.slice(0, 10).map((log) => (
              <li key={log.id} className="log-entry info">
                <span className="log-time">{new Date(log.time).toLocaleTimeString('vi-VN')}</span>
                <span className="log-msg">{log.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
