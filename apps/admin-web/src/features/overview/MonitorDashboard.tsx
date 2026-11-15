import { MonitorJournalPanels } from './MonitorJournalPanels';
import { ServiceStatusPanel } from './ServiceStatusPanel';
/**
 * @file MonitorDashboard.tsx
 * @description Phân hệ Giám sát Hệ thống (System Monitoring Feature)
 * Theo dõi trực tiếp trạng thái microservices (POI, Navigation, Translation, SQL Server), CI/CD và nhật ký sự kiện.
 */

import { useMonitorDashboard } from './useMonitorDashboard';
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
      </section>

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
