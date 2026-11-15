/**
 * @file EventLogs.tsx
 * @description Nhật ký chi tiết các sự kiện hệ thống (Logs Feature)
 */

import React from 'react';
import { Card } from '@vinlook/ui/card';
import type { JournalEntry } from '../../types';

interface EventLogsProps {
  systemLogs: JournalEntry[];
  usageLogs: JournalEntry[];
}

export function EventLogs({ systemLogs, usageLogs }: EventLogsProps) {
  return (
    <Card className="min-w-0 rounded-lg p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold text-foreground">Nhật ký hoạt động chi tiết</h2>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Nhật ký hệ thống</h3>
          <ul className="divide-y divide-border">
            {systemLogs.slice(0, 10).map((log) => (
              <li key={log.id} className="flex items-baseline gap-3 py-2 text-sm">
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {new Date(log.time).toLocaleTimeString('vi-VN')}
                </span>
                <span
                  className={
                    log.level === 'error'
                      ? 'min-w-0 break-words text-destructive'
                      : 'min-w-0 break-words text-foreground'
                  }
                >
                  {log.message}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Yêu cầu từ du khách</h3>
          <ul className="divide-y divide-border">
            {usageLogs.slice(0, 10).map((log) => (
              <li key={log.id} className="flex items-baseline gap-3 py-2 text-sm">
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {new Date(log.time).toLocaleTimeString('vi-VN')}
                </span>
                <span className="min-w-0 break-words text-foreground">{log.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
