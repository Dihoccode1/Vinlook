/**
 * @file UsageStats.tsx
 * @description Thống kê lượng truy cập du khách và phiên nghe audio (Usage Feature)
 */

import React from 'react';
import { Card } from '@vinlook/ui/card';
import type { ActivityData } from '../../types';

interface UsageStatsProps {
  activity: ActivityData | null;
}

export function UsageStats({ activity }: UsageStatsProps) {
  return (
    <Card className="rounded-lg p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold text-foreground">Hoạt động du khách trực tiếp</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col rounded-md border border-border bg-muted p-4">
          <span className="my-1 text-[28px] font-bold leading-tight text-primary tabular-nums">
            {activity?.visitors ?? '—'}
          </span>
          <span className="text-xs text-muted-foreground">
            Thiết bị đang mở bản đồ (5 phút gần nhất)
          </span>
        </div>
        <div className="flex flex-col rounded-md border border-border bg-muted p-4">
          <span className="my-1 text-[28px] font-bold leading-tight text-primary tabular-nums">
            {activity?.listeners ?? '—'}
          </span>
          <span className="text-xs text-muted-foreground">
            Phiên nghe thuyết minh audio đang hoạt động
          </span>
        </div>
      </div>
    </Card>
  );
}
