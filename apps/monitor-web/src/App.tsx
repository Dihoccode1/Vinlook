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
      <div className="monitor-container max-w-[1200px] my-[2rem] mx-[auto] py-[0] px-[1rem] flex flex-col gap-[1.5rem]">
        <SystemHealthPanel
          snapshot={snapshot}
          loading={loading}
          error={error}
          onRefresh={refresh}
        />

        <UsageStats activity={activity} />

        {snapshot && <ServiceMetricsPanel services={snapshot.services} />}

        <div className="split-panels grid grid-cols-[1fr_1fr] gap-[1.5rem]">
          <AlertsList alerts={journal?.system ?? []} />
          <EventLogs systemLogs={journal?.system ?? []} usageLogs={journal?.usage ?? []} />
        </div>
      </div>
    </MonitorLayout>
  );
}
