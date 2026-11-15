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
    <div className="event-logs-panel bg-[var(--card-bg)] p-[1.5rem]">
      <h2>Nhật ký hoạt động chi tiết</h2>
      <div className="logs-columns">
        <div className="log-col">
          <h3>Nhật ký hệ thống</h3>
          <ul className="log-list p-[0] m-[0]">
            {systemLogs.slice(0, 10).map((log) => (
              <li
                key={log.id}
                className={`log-entry py-[0.5rem] px-[0] text-[0.85rem] flex gap-[0.75rem] ${log.level}`}
              >
                <span className="log-time text-[var(--text-muted)] text-[0.75rem]">
                  {new Date(log.time).toLocaleTimeString('vi-VN')}
                </span>
                <span className="log-msg">{log.message}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="log-col">
          <h3>Yêu cầu từ du khách</h3>
          <ul className="log-list p-[0] m-[0]">
            {usageLogs.slice(0, 10).map((log) => (
              <li
                key={log.id}
                className="log-entry py-[0.5rem] px-[0] text-[0.85rem] flex gap-[0.75rem] info"
              >
                <span className="log-time text-[var(--text-muted)] text-[0.75rem]">
                  {new Date(log.time).toLocaleTimeString('vi-VN')}
                </span>
                <span className="log-msg">{log.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
