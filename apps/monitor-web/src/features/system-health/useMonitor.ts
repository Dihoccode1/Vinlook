import { useEffect, useState } from 'react';
import type { SystemSnapshot, JournalData, ActivityData } from '../../types';
import { loadMonitor } from './load-monitor';

export function useMonitor() {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [journal, setJournal] = useState<JournalData | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function poll() {
      if (pending || controller.signal.aborted) return;
      pending = true;
      try {
        const result = await loadMonitor(controller.signal);
        if (controller.signal.aborted) return;
        if (result.snapshot !== undefined) setSnapshot(result.snapshot);
        if (result.journal !== undefined) setJournal(result.journal);
        if (result.activity !== undefined) setActivity(result.activity);
        setError(result.error);
      } catch {
        if (!controller.signal.aborted) setError('Không thể cập nhật dữ liệu giám sát từ Gateway.');
      } finally {
        pending = false;
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
  return { snapshot, journal, activity, loading, error, refresh: () => setRefresh((v) => v + 1) };
}
