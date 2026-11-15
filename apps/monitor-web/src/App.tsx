import { useMonitor } from './features/system-health/useMonitor';
/**
 * @file App.tsx
 * @description Ứng dụng chính phân hệ Giám sát Hệ thống (Monitor Web Application)
 */

import { MonitorLayout } from './layouts/MonitorLayout';
import { SystemHealthPanel } from './features/system-health/SystemHealthPanel';
import { ServiceMetricsPanel } from './features/service-metrics/ServiceMetricsPanel';
import { UsageStats } from './features/usage/UsageStats';
import { AlertsList } from './features/alerts/AlertsList';
import { EventLogs } from './features/logs/EventLogs';

export default function App() {
  const { snapshot, journal, activity, loading, error, refresh } = useMonitor();

  return (
    <MonitorLayout>
      <div className="monitor-container">
        <SystemHealthPanel
          snapshot={snapshot}
          loading={loading}
          error={error}
          onRefresh={refresh}
        />

        <UsageStats activity={activity} />

        {snapshot && <ServiceMetricsPanel services={snapshot.services} />}

        <div className="split-panels">
          <AlertsList alerts={journal?.system ?? []} />
          <EventLogs systemLogs={journal?.system ?? []} usageLogs={journal?.usage ?? []} />
        </div>
      </div>
    </MonitorLayout>
  );
}
