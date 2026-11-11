/**
 * @file App.tsx
 * @description Ứng dụng chính phân hệ Giám sát Hệ thống (Monitor Web Application)
 */

import React, { useEffect, useState } from 'react';
import { fetchMonitor } from './services/api';
import type { SystemSnapshot, JournalData, ActivityData } from './types';
import { MonitorLayout } from './layouts/MonitorLayout';
import { SystemHealthPanel } from './features/system-health/SystemHealthPanel';
import { ServiceMetricsPanel } from './features/service-metrics/ServiceMetricsPanel';
import { UsageStats } from './features/usage/UsageStats';
import { AlertsList } from './features/alerts/AlertsList';
import { EventLogs } from './features/logs/EventLogs';

export default function App() {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [journal, setJournal] = useState<JournalData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function poll() {
      try {
        const [snapRes, journalRes, actRes] = await Promise.allSettled([
          fetchMonitor<SystemSnapshot>('/monitor', controller.signal),
          fetchMonitor<JournalData>('/monitor/events', controller.signal),
          fetchMonitor<ActivityData>('/activity', controller.signal),
        ]);

        if (snapRes.status === 'fulfilled') setSnapshot(snapRes.value);
        if (journalRes.status === 'fulfilled') setJournal(journalRes.value);
        if (actRes.status === 'fulfilled') setActivity(actRes.value);

        setError('');
      } catch (e) {
        if (!controller.signal.aborted) {
          setError('Không thể cập nhật dữ liệu giám sát từ Gateway.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void poll();
    const interval = setInterval(() => void poll(), 5000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [refresh]);

  return (
    <MonitorLayout>
      <div className="monitor-container">
        <SystemHealthPanel
          snapshot={snapshot}
          loading={loading}
          error={error}
          onRefresh={() => setRefresh((v) => v + 1)}
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
