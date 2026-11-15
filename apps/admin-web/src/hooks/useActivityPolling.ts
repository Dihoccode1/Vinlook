import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ActivitySample } from '../types';
import type { AdminViewTab } from '../layouts/AdminLayout';
export function useActivityPolling(view: AdminViewTab) {
  const [activity, set_activity] = useState<{ visitors: number; listeners: number } | null>(null);
  const [samples, set_samples] = useState<ActivitySample[]>([]);
  // Polling hoạt động du khách mỗi 5 giây trên cửa sổ 5 phút
  useEffect(() => {
    if (view !== 'overview') return;
    const controller = new AbortController();
    let pending = false;

    const poll = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await api<{ data: { visitors: number; listeners: number } }>('/activity', {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          set_activity(result.data);
          set_samples((prev) =>
            [...prev, { time: Date.now(), ...result.data }].filter(
              (item) => item.time >= Date.now() - 300000,
            ),
          );
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời khi polling
      } finally {
        pending = false;
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 5000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [view]);

  return { activity, samples };
}
