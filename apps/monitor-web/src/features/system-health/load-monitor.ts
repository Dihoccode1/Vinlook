import { fetchMonitor } from '../../services/api';
import type { SystemSnapshot, JournalData, ActivityData } from '../../types';

export async function loadMonitor(signal: AbortSignal, fetcher = fetchMonitor) {
  const [snapshot, journal, activity] = await Promise.allSettled([
    fetcher<SystemSnapshot>('/monitor', signal),
    fetcher<JournalData>('/monitor/events', signal),
    fetcher<ActivityData>('/activity', signal),
  ]);
  const failed = [snapshot, journal, activity].filter(
    (result) => result.status === 'rejected',
  ).length;
  return {
    snapshot: snapshot.status === 'fulfilled' ? snapshot.value : undefined,
    journal: journal.status === 'fulfilled' ? journal.value : undefined,
    activity: activity.status === 'fulfilled' ? activity.value : undefined,
    error:
      failed === 0
        ? ''
        : failed === 3
          ? 'Không thể cập nhật dữ liệu giám sát từ Gateway.'
          : 'Một phần dữ liệu giám sát chưa cập nhật. Dữ liệu cũ được giữ lại.',
  };
}
