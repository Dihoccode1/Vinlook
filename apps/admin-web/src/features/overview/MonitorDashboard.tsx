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
    <div className="monitor-dashboard">
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}

      <section className="metrics" aria-label="Giám sát trực tiếp">
        <article>
          <div className="metric-label">Dịch vụ sẵn sàng</div>
          <strong>{snapshot && !error ? `${healthy}/${snapshot.services.length}` : '—'}</strong>
          <p>{error ? 'Chưa cập nhật được' : 'Kiểm tra trực tiếp mỗi 5 giây'}</p>
        </article>

        <article>
          <div className="metric-label">CPU</div>
          <strong>{cpu_value}</strong>
          <p>{cpu_note}</p>
        </article>

        <article>
          <div className="metric-label">RAM</div>
          <strong>{ram_value}</strong>
          <p>{ram_note}</p>
        </article>
      </section>

      {render_metrics && render_metrics.status !== 'ok' && render_metrics.message && (
        <p
          className={`monitor-resource-notice ${render_metrics.status === 'error' ? 'error' : 'info'}`}
          role={render_metrics.status === 'error' ? 'alert' : 'status'}
        >
          {render_metrics.message}
        </p>
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
