/**
 * @file AlertsList.tsx
 * @description Danh sách cảnh báo và sự cố hệ thống (Alerts Feature)
 */

import React from 'react';
import { Badge } from '@vinlook/ui/badge';
import { Card } from '@vinlook/ui/card';
import type { JournalEntry } from '../../types';

interface AlertsListProps {
  alerts: JournalEntry[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const errorAlerts = alerts.filter((a) => a.level === 'error');

  return (
    <Card className="min-w-0 rounded-lg p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold text-foreground">Cảnh báo & Sự cố hệ thống</h2>
      {!errorAlerts.length ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Không có cảnh báo hoặc lỗi nghiêm trọng nào được ghi nhận.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {errorAlerts.map((alert) => (
            <li
              key={alert.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm"
            >
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {new Date(alert.time).toLocaleTimeString('vi-VN')}
              </span>
              <span className="min-w-0 flex-1 break-words text-foreground">{alert.message}</span>
              {alert.status && (
                <Badge variant="destructive" className="shrink-0">
                  HTTP {alert.status}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
