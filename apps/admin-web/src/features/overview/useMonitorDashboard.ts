import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

interface JournalEntry {
  id: number;
  time: string;
  level: 'info' | 'error';
  message: string;
  status: number | null;
}

interface Journal {
  system: JournalEntry[];
  usage: JournalEntry[];
}

interface CiStatus {
  state: string;
  conclusion?: string | null;
  url?: string;
}

interface Delivery {
  checked_at: string;
  ci: CiStatus;
  cd: { state: string; revision?: string };
}

const workflow_url =
  'https://github.com/Dihoccode1/Vinlook/actions/workflows/ci-cd.yml?query=branch%3Amain';

async function fetch_public_ci(signal: AbortSignal): Promise<CiStatus> {
  const response = await fetch(
    'https://api.github.com/repos/Dihoccode1/Vinlook/actions/workflows/ci-cd.yml/runs?branch=main&per_page=1',
    {
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    },
  );
  if (!response.ok) throw new Error('GitHub Actions unavailable');
  const body = await response.json();
  if (!Array.isArray(body.workflow_runs)) throw new Error('Invalid GitHub Actions response');
  if (!body.workflow_runs.length) return { state: 'no_runs' };

  const run = body.workflow_runs[0];
  if (typeof run?.status !== 'string') throw new Error('Invalid GitHub Actions run');
  return {
    state: run.status,
    conclusion: typeof run.conclusion === 'string' ? run.conclusion : null,
    url: Number.isSafeInteger(run.id)
      ? `https://github.com/Dihoccode1/Vinlook/actions/runs/${run.id}`
      : undefined,
  };
}

function ci_label(ci: CiStatus): string {
  if (ci.state === 'unknown') return 'Không kiểm tra được';
  if (ci.state === 'no_runs') return 'Chưa có lần chạy';
  if (ci.state === 'completed') {
    const conclusionMap: Record<string, string> = {
      success: 'Thành công',
      failure: 'Thất bại',
      cancelled: 'Đã hủy',
      skipped: 'Đã bỏ qua',
      timed_out: 'Quá thời gian',
      neutral: 'Trung lập',
      action_required: 'Cần xử lý',
    };
    return conclusionMap[ci.conclusion ?? ''] ?? 'Chưa xác định kết quả';
  }
  return ci.state === 'in_progress' ? 'Đang chạy' : 'Đang chờ';
}

export interface RenderMetrics {
  status: 'ok' | 'unconfigured' | 'empty' | 'error';
  cpu_percent: number | null;
  memory_used_mib: number | null;
  memory_limit_mib: number | null;
  updated_at: string | null;
  checked_at: string;
  message: string | null;
}

export interface Snapshot {
  checked_at: string;
  uptime_seconds: number;
  services: {
    id: string;
    name: string;
    status: 'healthy' | 'unavailable' | 'unreachable';
    latency_ms: number | null;
    database: string | null;
  }[];
  render_metrics?: RenderMetrics;
}

export function format_metric_number(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function format_metric_time(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleTimeString('vi-VN');
}

const status_names = {
  healthy: 'Hoạt động',
  unavailable: 'Chưa sẵn sàng',
  unreachable: 'Không kết nối được',
};

export function useMonitorDashboard() {
  const [snapshot, set_snapshot] = useState<Snapshot | null>(null);
  const [error, set_error] = useState('');
  const [refresh, set_refresh] = useState(0);
  const [journal, set_journal] = useState<Journal | null>(null);
  const [journal_error, set_journal_error] = useState('');
  const [delivery, set_delivery] = useState<Delivery | null>(null);
  const [delivery_error, set_delivery_error] = useState(false);
  const public_ci = useRef<{
    next_check_at: number;
    result?: Pick<Delivery, 'ci' | 'checked_at'>;
  }>({ next_check_at: 0 });

  // Polling định kỳ mỗi 5 giây để cập nhật trạng thái hệ thống
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;

    async function poll() {
      if (pending) return;
      pending = true;

      await Promise.allSettled([
        api<{ data: Delivery }>('/monitor/delivery', { signal: controller.signal })
          .then(async ({ data }) => {
            if (data.ci.state === 'unknown' && !controller.signal.aborted) {
              const fallback = public_ci.current;
              if (Date.now() >= fallback.next_check_at) {
                const ci = await fetch_public_ci(controller.signal).catch(() => undefined);
                if (controller.signal.aborted) return;
                fallback.next_check_at = Date.now() + 120_000;
                fallback.result = ci ? { ci, checked_at: new Date().toISOString() } : undefined;
              }
              if (fallback.result) data = { ...data, ...fallback.result };
            }
            if (!controller.signal.aborted) {
              set_delivery(data);
              set_delivery_error(false);
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) set_delivery_error(true);
          }),

        api<{ data: Snapshot }>('/monitor', { signal: controller.signal })
          .then((result) => {
            if (!controller.signal.aborted) {
              set_snapshot(result.data);
              set_error('');
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              set_error(
                'Không cập nhật được trạng thái. Dữ liệu hiển thị là lần kiểm tra gần nhất.',
              );
            }
          }),

        api<{ data: Journal }>('/monitor/events', { signal: controller.signal })
          .then((result) => {
            if (!controller.signal.aborted) {
              set_journal(result.data);
              set_journal_error('');
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              set_journal_error(
                'Không tải được nhật ký sự kiện. Dữ liệu hiển thị là lần tải gần nhất.',
              );
            }
          }),
      ]);

      pending = false;
    }

    void poll();
    const timer = setInterval(() => void poll(), 5000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [refresh]);

  const healthy = snapshot?.services.filter((service) => service.status === 'healthy').length;

  return {
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
  };
}
