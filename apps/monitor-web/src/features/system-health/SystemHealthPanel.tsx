/**
 * @file SystemHealthPanel.tsx
 * @description Bảng điều khiển sức khỏe hệ thống (System Health Feature)
 */

import React from 'react';
import { Alert, AlertDescription } from '@vinlook/ui/alert';
import { Button } from '@vinlook/ui/button';
import { Card } from '@vinlook/ui/card';
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
    <Card className="rounded-lg p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-foreground">
            Sức khỏe Hệ thống & Dịch vụ Microservices
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {snapshot
              ? `Thời gian kiểm tra: ${new Date(snapshot.checked_at).toLocaleTimeString('vi-VN')} • Uptime: ${Math.floor(snapshot.uptime_seconds / 60)} phút`
              : 'Đang kiểm tra kết nối...'}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          className="border-white/90 bg-white font-semibold text-slate-900 hover:bg-slate-100"
        >
          {loading ? 'Đang tải...' : 'Làm mới'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col rounded-md border border-border bg-muted p-4">
          <span className="text-[13px] text-muted-foreground">Dịch vụ sẵn sàng</span>
          <span className="my-1 text-[28px] font-bold leading-tight text-primary tabular-nums">
            {totalCount > 0 ? `${healthyCount}/${totalCount}` : '—'}
          </span>
          <span className="text-xs text-muted-foreground">Kiểm tra tự động mỗi 5 giây</span>
        </div>

        <div className="flex flex-col rounded-md border border-border bg-muted p-4">
          <span className="text-[13px] text-muted-foreground">Trạng thái Cơ sở dữ liệu</span>
          <span className="my-1 text-[28px] font-bold leading-tight text-primary">
            {snapshot?.services.some((s) => s.database && s.status === 'healthy')
              ? 'Sẵn sàng'
              : 'Chưa kết nối'}
          </span>
          <span className="text-xs text-muted-foreground">Microsoft SQL Server</span>
        </div>
      </div>
    </Card>
  );
}
