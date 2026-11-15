import { Badge } from '@vinlook/ui/badge';
import { Button } from '@vinlook/ui/button';
import { Card } from '@vinlook/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@vinlook/ui/table';
import {
  format_metric_number,
  format_metric_time,
  type RenderMetrics,
  type useMonitorDashboard,
} from './useMonitorDashboard';

type MonitorTone = 'healthy' | 'unavailable' | 'unreachable' | 'stale';

const TONE_BADGE_VARIANT: Record<MonitorTone, 'success' | 'warning' | 'destructive' | 'muted'> = {
  healthy: 'success',
  unavailable: 'warning',
  unreachable: 'destructive',
  stale: 'muted',
};

function render_status_badge(metrics: RenderMetrics | undefined): {
  tone: MonitorTone;
  label: string;
} {
  if (!metrics) return { tone: 'stale', label: 'Đang kiểm tra...' };
  if (metrics.status === 'ok') return { tone: 'healthy', label: 'Đang thu thập' };
  if (metrics.status === 'unconfigured') return { tone: 'stale', label: 'Chưa cấu hình' };
  if (metrics.status === 'empty') return { tone: 'unavailable', label: 'Chưa có số liệu' };
  return { tone: 'unreachable', label: 'Lỗi API Render' };
}

type Props = Pick<
  ReturnType<typeof useMonitorDashboard>,
  | 'snapshot'
  | 'error'
  | 'set_refresh'
  | 'delivery'
  | 'delivery_error'
  | 'workflow_url'
  | 'ci_label'
  | 'status_names'
>;
export function ServiceStatusPanel({
  snapshot,
  error,
  set_refresh,
  delivery,
  delivery_error,
  workflow_url,
  ci_label,
  status_names,
}: Props) {
  const render_metrics = snapshot?.render_metrics;
  const render_badge = render_status_badge(render_metrics);
  const render_summary_parts: string[] = [];
  if (render_metrics?.status === 'ok') {
    if (typeof render_metrics.cpu_percent === 'number') {
      render_summary_parts.push(`CPU ${format_metric_number(render_metrics.cpu_percent)}%`);
    }
    if (typeof render_metrics.memory_used_mib === 'number') {
      const limit =
        typeof render_metrics.memory_limit_mib === 'number'
          ? ` / ${format_metric_number(render_metrics.memory_limit_mib)} MiB`
          : '';
      render_summary_parts.push(
        `RAM ${format_metric_number(render_metrics.memory_used_mib)} MiB${limit}`,
      );
    }
  }
  const ci_tone: MonitorTone =
    delivery_error || delivery?.ci.state === 'unknown'
      ? 'stale'
      : delivery?.ci.conclusion === 'success'
        ? 'healthy'
        : 'unavailable';
  const db_tone: MonitorTone =
    error || !snapshot
      ? 'stale'
      : snapshot.services.filter((s) => s.database).every((s) => s.status === 'healthy')
        ? 'healthy'
        : 'unavailable';

  return (
    <Card className="min-w-0 gap-0 overflow-hidden rounded-xl border-[#e2e8dc] bg-white shadow-[0_2px_4px_#14372103]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[22px] py-[21px]">
        <div>
          <h2 className="m-0 text-[15px] leading-[1.6] font-semibold text-[#2d473a] md:text-base">
            Trạng thái hệ thống
          </h2>
          <p className="mt-1 mb-0 text-[10px] leading-[1.8] text-[#96a18b] md:text-[11px]">
            {snapshot
              ? `Kiểm tra lúc ${new Date(snapshot.checked_at).toLocaleTimeString('vi-VN')} • Gateway hoạt động ${Math.floor(snapshot.uptime_seconds / 60)} phút`
              : 'Đang kiểm tra các dịch vụ...'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => set_refresh((value) => value + 1)}
          className="h-9 rounded-lg border-[#dce3d6] bg-white px-3.5 text-[11px] font-medium text-[#61735a]"
        >
          Làm mới
        </Button>
      </div>

      {/* Bảng trạng thái CI / CD / Database */}
      <Table className="w-full text-xs">
        <TableHeader className="sr-only sm:not-sr-only sm:bg-[#fbfcf9]">
          <TableRow className="border-[#edf1e7] hover:bg-transparent">
            <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
              Hạng mục
            </TableHead>
            <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
              Trạng thái
            </TableHead>
            <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
              Chi tiết kiểm tra
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="grid grid-cols-1 gap-2 border-b border-[#edf1e7] px-[22px] py-4 sm:table-row sm:p-0">
            <TableCell className="p-0 sm:px-[22px] sm:py-4">
              <strong className="font-semibold text-foreground">CI (Tích hợp liên tục)</strong>
            </TableCell>
            <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-4 sm:py-4">
              <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">Trạng thái</span>
              <Badge variant={TONE_BADGE_VARIANT[ci_tone]} className="px-2 py-1 text-[10px]">
                {delivery_error
                  ? 'Không cập nhật được'
                  : delivery
                    ? ci_label(delivery.ci)
                    : 'Đang kiểm tra...'}
              </Badge>
            </TableCell>
            <TableCell className="flex flex-col gap-1 p-0 text-xs text-foreground sm:table-cell sm:px-[22px] sm:py-4">
              <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">
                Chi tiết kiểm tra
              </span>
              <a
                href={delivery?.ci.url ?? workflow_url}
                target="_blank"
                rel="noreferrer"
                className="text-foreground no-underline hover:text-primary hover:underline"
              >
                {delivery?.ci.url ? 'Xem lần chạy trên GitHub ↗' : 'Mở GitHub Actions ↗'}
              </a>
              {delivery && (
                <small className="block text-[10px] [overflow-wrap:anywhere] text-[#9da693]">
                  Kiểm tra lúc {new Date(delivery.checked_at).toLocaleTimeString('vi-VN')}
                </small>
              )}
            </TableCell>
          </TableRow>

          <TableRow className="grid grid-cols-1 gap-2 border-b border-[#edf1e7] px-[22px] py-4 sm:table-row sm:p-0">
            <TableCell className="p-0 sm:px-[22px] sm:py-4">
              <strong className="font-semibold text-foreground">CD (Triển khai liên tục)</strong>
            </TableCell>
            <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-4 sm:py-4">
              <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">Trạng thái</span>
              <Badge
                variant={
                  TONE_BADGE_VARIANT[delivery?.cd.state === 'backend_running' ? 'healthy' : 'stale']
                }
                className="px-2 py-1 text-[10px]"
              >
                {delivery_error
                  ? 'Không cập nhật được'
                  : delivery
                    ? delivery.cd.state === 'backend_running'
                      ? 'Backend đã cập nhật'
                      : 'Chưa có bản triển khai tự động'
                    : 'Đang kiểm tra...'}
              </Badge>
            </TableCell>
            <TableCell className="flex flex-col gap-1 p-0 text-xs text-foreground sm:table-cell sm:px-[22px] sm:py-4">
              <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">
                Chi tiết kiểm tra
              </span>
              <span>Docker trên máy nhóm; frontend được kiểm tra rồi promote lên Vercel.</span>
              {delivery?.cd.revision && (
                <small className="block text-[10px] [overflow-wrap:anywhere] text-[#9da693]">
                  Backend: {delivery.cd.revision.slice(0, 7)}
                </small>
              )}
              <small className="block text-[10px] [overflow-wrap:anywhere] text-[#9da693]">
                Xem workflow để xác nhận kết quả toàn bộ lần triển khai.
              </small>
            </TableCell>
          </TableRow>

          <TableRow className="grid grid-cols-1 gap-2 border-b border-[#edf1e7] px-[22px] py-4 sm:table-row sm:p-0">
            <TableCell className="p-0 sm:px-[22px] sm:py-4">
              <strong className="font-semibold text-foreground">Cơ sở dữ liệu (Database)</strong>
            </TableCell>
            <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-4 sm:py-4">
              <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">Trạng thái</span>
              <Badge variant={TONE_BADGE_VARIANT[db_tone]} className="px-2 py-1 text-[10px]">
                {error
                  ? 'Chưa cập nhật'
                  : !snapshot
                    ? 'Đang kiểm tra...'
                    : db_tone === 'healthy'
                      ? 'Đã kết nối'
                      : 'Chưa sẵn sàng'}
              </Badge>
            </TableCell>
            <TableCell className="flex flex-col gap-1 p-0 text-xs text-foreground sm:table-cell sm:px-[22px] sm:py-4">
              <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">
                Chi tiết kiểm tra
              </span>
              {snapshot?.services
                .filter((s) => s.database)
                .map((s) => (
                  <small
                    className="block text-[10px] [overflow-wrap:anywhere] text-[#9da693]"
                    key={s.id}
                  >
                    {s.database} •{' '}
                    {error
                      ? 'Chưa cập nhật'
                      : s.status === 'healthy'
                        ? 'Đã kết nối'
                        : 'Chưa xác nhận'}
                  </small>
                ))}
              <span>Microsoft SQL Server • Kiểm tra qua endpoint readiness mỗi 5 giây</span>
            </TableCell>
          </TableRow>

          <TableRow className="grid grid-cols-1 gap-2 border-b border-[#edf1e7] px-[22px] py-4 sm:table-row sm:p-0">
            <TableCell className="p-0 sm:px-[22px] sm:py-4">
              <strong className="font-semibold text-foreground">
                Tài nguyên Render (vinlook-api)
              </strong>
            </TableCell>
            <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-4 sm:py-4">
              <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">Trạng thái</span>
              <Badge
                variant={TONE_BADGE_VARIANT[render_badge.tone]}
                className="px-2 py-1 text-[10px]"
              >
                {render_badge.label}
              </Badge>
            </TableCell>
            <TableCell className="flex flex-col gap-1 p-0 text-xs text-foreground sm:table-cell sm:px-[22px] sm:py-4">
              <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">
                Chi tiết kiểm tra
              </span>
              <span>
                {render_metrics?.status === 'ok'
                  ? render_summary_parts.join(' • ')
                  : (render_metrics?.message ??
                    'Đang lấy số liệu CPU/RAM từ Render Metrics API...')}
              </span>
              {render_metrics && (
                <small className="block text-[10px] [overflow-wrap:anywhere] text-[#9da693]">
                  {render_metrics.updated_at
                    ? `Cập nhật lúc ${format_metric_time(render_metrics.updated_at)}`
                    : `Kiểm tra lúc ${format_metric_time(render_metrics.checked_at)}`}
                </small>
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Bảng trạng thái chi tiết các Microservices */}
      <Table className="mt-4 w-full border-t border-[#edf1e7] text-xs">
        <TableHeader className="sr-only sm:not-sr-only sm:bg-[#fbfcf9]">
          <TableRow className="border-[#edf1e7] hover:bg-transparent">
            <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
              Dịch vụ
            </TableHead>
            <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
              Trạng thái
            </TableHead>
            <TableHead className="px-4 py-3 text-[11px] font-medium text-[#7e8b75]">
              Độ trễ
            </TableHead>
            <TableHead className="px-[22px] py-3 text-[11px] font-medium text-[#7e8b75]">
              Cơ sở dữ liệu
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snapshot?.services.map((service) => (
            <TableRow
              key={service.id}
              className="grid grid-cols-1 gap-2 border-b border-[#edf1e7] px-[22px] py-4 sm:table-row sm:p-0"
            >
              <TableCell className="p-0 sm:px-[22px] sm:py-4">
                <strong className="block font-semibold text-foreground">{service.name}</strong>
                <small className="block text-[10px] [overflow-wrap:anywhere] text-[#9da693]">
                  {service.id}
                </small>
              </TableCell>
              <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-4 sm:py-4">
                <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">Trạng thái</span>
                <Badge
                  variant={TONE_BADGE_VARIANT[error ? 'stale' : service.status]}
                  className="px-2 py-1 text-[10px]"
                >
                  {error ? 'Chưa cập nhật' : status_names[service.status]}
                </Badge>
              </TableCell>
              <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-4 sm:py-4">
                <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">Phản hồi</span>
                <span>{service.latency_ms === null ? '—' : `${service.latency_ms} ms`}</span>
              </TableCell>
              <TableCell className="flex items-center justify-between gap-2 p-0 sm:table-cell sm:px-[22px] sm:py-4">
                <span className="text-[11px] font-medium text-[#7e8b75] sm:hidden">
                  Cơ sở dữ liệu
                </span>
                <span>
                  {service.database
                    ? `${service.database} • ${
                        error
                          ? 'Chưa cập nhật'
                          : service.status === 'healthy'
                            ? 'Đã kết nối'
                            : 'Chưa xác nhận'
                      }`
                    : '—'}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="mx-[22px] mt-3 mb-[19px] text-[10px] leading-[1.8] text-[#a1aa98]">
        Dịch vụ POI và Dịch thuật kiểm tra kết nối SQL Server qua cơ chế readiness. Dịch vụ Tìm
        đường kiểm tra engine Valhalla.
      </p>
    </Card>
  );
}
