/**
 * @file ServiceMetricsPanel.tsx
 * @description Bảng đo lường chi tiết độ trễ và trạng thái từng Microservice (Service Metrics Feature)
 */

import React from 'react';
import { Badge } from '@vinlook/ui/badge';
import { Card } from '@vinlook/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@vinlook/ui/table';
import type { ServiceStatus } from '../../types';

interface ServiceMetricsPanelProps {
  services: ServiceStatus[];
}

export function ServiceMetricsPanel({ services }: ServiceMetricsPanelProps) {
  const getStatusBadge = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="success">Hoạt động tốt</Badge>;
      case 'unavailable':
        return <Badge variant="warning">Chưa sẵn sàng</Badge>;
      default:
        return <Badge variant="destructive">Mất kết nối</Badge>;
    }
  };

  return (
    <Card className="min-w-0 rounded-lg p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold text-foreground">Chi tiết từng dịch vụ</h2>
      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4 py-3 text-[13px] font-semibold">Tên dịch vụ</TableHead>
              <TableHead className="px-4 py-3 text-[13px] font-semibold">
                Mã định danh (ID)
              </TableHead>
              <TableHead className="px-4 py-3 text-[13px] font-semibold">Trạng thái</TableHead>
              <TableHead className="px-4 py-3 text-[13px] font-semibold">Độ trễ phản hồi</TableHead>
              <TableHead className="px-4 py-3 text-[13px] font-semibold">Cơ sở dữ liệu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id} className="hover:bg-muted/40">
                <TableCell className="px-4 py-3 text-sm font-semibold text-foreground">
                  {service.name}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                  <code className="font-mono text-xs">{service.id}</code>
                </TableCell>
                <TableCell className="px-4 py-3">{getStatusBadge(service.status)}</TableCell>
                <TableCell className="px-4 py-3 text-sm tabular-nums">
                  {service.latency_ms !== null ? `${service.latency_ms} ms` : '—'}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm">
                  {service.database ? `${service.database} (SQL Server)` : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
