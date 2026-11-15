import { Alert } from '@vinlook/ui/alert';
import { MonitorJournalPanels } from './MonitorJournalPanels';
import { ServiceStatusPanel } from './ServiceStatusPanel';
/**
 * @file MonitorDashboard.tsx
 * @description Phân hệ Giám sát Hệ thống (System Monitoring Feature)
 * Theo dõi trực tiếp trạng thái microservices (POI, Navigation, Translation, SQL Server), tài nguyên Render (CPU/RAM), CI/CD và nhật ký sự kiện.
 */

import {
  format_metric_number,
  format_metric_time,
  type RenderMetrics,
  useMonitorDashboard,
} from './useMonitorDashboard';

function render_metric_fallback(metrics: RenderMetrics | undefined, metric_name: string): string {
  if (!metrics) return 'Đang kiểm tra số liệu...';
  if (metrics.status === 'unconfigured') return 'Chưa cấu hình Render Metrics';
  if (metrics.status === 'empty') return 'Render chưa có số liệu';
  if (metrics.status === 'error') return 'Không lấy được số liệu';
  return `Chưa có số liệu ${metric_name}`;
}

export function MonitorDashboard() {
  const {
    snapshot,
    error,
    set_refresh,
    journal,
    journal_error,
    delivery,
    delivery_error,
    healthy,
    workflow_url,
    ci_label,
    status_names,
  } = useMonitorDashboard();

  const render_metrics = snapshot?.render_metrics;
  const cpu_value =
    render_metrics?.status === 'ok' && typeof render_metrics.cpu_percent === 'number'
      ? `${format_metric_number(render_metrics.cpu_percent)}%`
      : '—';
  const ram_value =
    render_metrics?.status === 'ok' && typeof render_metrics.memory_used_mib === 'number'
      ? `${format_metric_number(render_metrics.memory_used_mib)} MiB`
      : '—';
  const metric_time = format_metric_time(render_metrics?.updated_at ?? render_metrics?.checked_at);

  const cpu_note =
    render_metrics?.status === 'ok' && typeof render_metrics.cpu_percent === 'number'
      ? `Cập nhật lúc ${metric_time}`
      : snapshot
        ? render_metric_fallback(render_metrics, 'CPU')
        : 'Đang kiểm tra...';

  const ram_limit_note =
    render_metrics?.status === 'ok' && typeof render_metrics.memory_limit_mib === 'number'
      ? `Giới hạn ${format_metric_number(render_metrics.memory_limit_mib)} MiB • `
      : '';
  const ram_note =
    render_metrics?.status === 'ok' && typeof render_metrics.memory_used_mib === 'number'
      ? `${ram_limit_note}Cập nhật lúc ${metric_time}`
      : snapshot
        ? render_metric_fallback(render_metrics, 'RAM')
        : 'Đang kiểm tra...';

  return (
    <div className="grid gap-5">
      {error && (
        <Alert variant="destructive" role="alert" className="text-xs leading-[1.8]">
          {error}
        </Alert>
      )}

      <section
        className="grid grid-cols-1 gap-[15px] sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Giám sát trực tiếp"
      >
        <article className="rounded-xl border border-[#e2e8dc] bg-white p-5 text-card-foreground shadow-[0_2px_4px_#14372103]">
          <div className="text-[11px] font-medium text-[#7e8b75]">Dịch vụ sẵn sàng</div>
          <strong className="mt-1 mb-1.5 block text-[26px] leading-[1.3] font-semibold tracking-[-0.8px] text-foreground md:text-[31px]">
            {snapshot && !error ? `${healthy}/${snapshot.services.length}` : '—'}
          </strong>
          <p className="m-0 text-[11px] leading-[1.7] text-[#98a18e]">
            {error ? 'Chưa cập nhật được' : 'Kiểm tra trực tiếp mỗi 5 giây'}
          </p>
        </article>

        <article className="rounded-xl border border-[#e2e8dc] bg-white p-5 text-card-foreground shadow-[0_2px_4px_#14372103]">
          <div className="text-[11px] font-medium text-[#7e8b75]">CPU</div>
          <strong className="mt-1 mb-1.5 block text-[26px] leading-[1.3] font-semibold tracking-[-0.8px] text-foreground md:text-[31px]">
            {cpu_value}
          </strong>
          <p className="m-0 text-[11px] leading-[1.7] text-[#98a18e]">{cpu_note}</p>
        </article>

        <article className="rounded-xl border border-[#e2e8dc] bg-white p-5 text-card-foreground shadow-[0_2px_4px_#14372103] sm:col-span-2 lg:col-span-1">
          <div className="text-[11px] font-medium text-[#7e8b75]">RAM</div>
          <strong className="mt-1 mb-1.5 block text-[26px] leading-[1.3] font-semibold tracking-[-0.8px] text-foreground md:text-[31px]">
            {ram_value}
          </strong>
          <p className="m-0 text-[11px] leading-[1.7] text-[#98a18e]">{ram_note}</p>
        </article>
      </section>

      {render_metrics && render_metrics.status !== 'ok' && render_metrics.message && (
        <Alert
          variant={render_metrics.status === 'error' ? 'destructive' : 'default'}
          role={render_metrics.status === 'error' ? 'alert' : 'status'}
          className={
            render_metrics.status === 'error'
              ? 'rounded-xl border-[#e9b9b2] bg-[#fbe7e4] px-[15px] py-3 text-xs leading-[1.7] [overflow-wrap:anywhere] text-[#a53f32]'
              : 'rounded-xl border-[#d6dfd0] bg-[#f5f7f1] px-[15px] py-3 text-xs leading-[1.7] [overflow-wrap:anywhere] text-[#4b5842]'
          }
        >
          {render_metrics.message}
        </Alert>
      )}

      <ServiceStatusPanel
        snapshot={snapshot}
        error={error}
        set_refresh={set_refresh}
        delivery={delivery}
        delivery_error={delivery_error}
        workflow_url={workflow_url}
        ci_label={ci_label}
        status_names={status_names}
      />
      {journal_error && (
        <p className="error-banner" role="alert">
          {journal_error}
        </p>
      )}

      <MonitorJournalPanels journal={journal} journal_error={journal_error} />
    </div>
  );
}
