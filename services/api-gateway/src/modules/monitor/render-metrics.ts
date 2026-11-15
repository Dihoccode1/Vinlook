/**
 * @file render-metrics.ts
 * @description Tích hợp Render Metrics API (CPU, RAM đang dùng và giới hạn RAM) cho dịch vụ vinlook-api.
 * Chỉ chạy ở phía backend (API Gateway); không bao giờ trả API key hoặc thông tin nhạy cảm ra frontend.
 */

import { config } from '../../config/index.js';

export type RenderMetricsStatus = 'ok' | 'unconfigured' | 'empty' | 'error';

export interface RenderMetricsSnapshot {
  status: RenderMetricsStatus;
  cpu_percent: number | null;
  memory_used_mib: number | null;
  memory_limit_mib: number | null;
  updated_at: string | null;
  checked_at: string;
  message: string | null;
}

export interface RenderMetricsConfig {
  api_key: string;
  service_id: string;
  api_base_url: string;
  timeout_ms: number;
  window_minutes: number;
  resolution_seconds: number;
}

interface RenderSeriesLabel {
  field?: unknown;
  value?: unknown;
}

interface RenderMetricPoint {
  timestamp?: unknown;
  value?: unknown;
  unit?: unknown;
}

interface RenderMetricSeries {
  labels?: unknown;
  values?: unknown;
  unit?: unknown;
}

interface ExtractedMetricPoint {
  value: number;
  unit: string;
  timestamp: string | null;
}

type EndpointResult =
  | { kind: 'ok'; point: ExtractedMetricPoint | null }
  | { kind: 'http_error'; status: number }
  | { kind: 'invalid' };

const SAFE_RESOURCE_ID = /^[a-z0-9][a-z0-9_-]*$/i;
const BYTES_PER_MIB = 1024 * 1024;

function round_one_decimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Đọc cấu hình kết nối Render Metrics API từ biến môi trường máy chủ.
 */
export function read_render_metrics_config(
  env: Record<string, string | undefined> = process.env,
): { ok: true; config: RenderMetricsConfig } | { ok: false; message: string } {
  const api_key = (env.RENDER_API_KEY ?? '').trim();
  const service_id = (env.RENDER_SERVICE_ID ?? '').trim();

  const missing: string[] = [];
  if (!api_key) missing.push('RENDER_API_KEY');
  if (!service_id) missing.push('RENDER_SERVICE_ID');

  if (missing.length > 0) {
    return {
      ok: false,
      message: `Chưa cấu hình ${missing.join(' và ')} trên máy chủ để đọc số liệu Render.`,
    };
  }

  if (!SAFE_RESOURCE_ID.test(service_id)) {
    return {
      ok: false,
      message: 'Mã RENDER_SERVICE_ID trên máy chủ không đúng định dạng.',
    };
  }

  return {
    ok: true,
    config: {
      api_key,
      service_id,
      api_base_url: config.renderMetrics.apiBaseUrl,
      timeout_ms: config.renderMetrics.timeoutMs,
      window_minutes: config.renderMetrics.windowMinutes,
      resolution_seconds: config.renderMetrics.resolutionSeconds,
    },
  };
}

function matches_resource_labels(labels: unknown, service_id: string): boolean | null {
  if (!Array.isArray(labels) || labels.length === 0) return null;
  const typed = labels.filter((entry): entry is RenderSeriesLabel =>
    Boolean(entry && typeof entry === 'object'),
  );
  const resource_labels = typed.filter(
    (entry) =>
      (entry.field === 'service' || entry.field === 'resource') && typeof entry.value === 'string',
  );
  if (resource_labels.length === 0) return null;
  return resource_labels.some((entry) => entry.value === service_id);
}

function parse_timestamp_ms(value: unknown): number {
  if (typeof value !== 'string' || !value.trim()) return Number.NaN;
  return Date.parse(value);
}

function extract_latest_point(payload: unknown, service_id: string): ExtractedMetricPoint | null {
  if (!Array.isArray(payload)) {
    throw new Error('Invalid Render metrics payload');
  }

  const series_list = payload.filter((item): item is RenderMetricSeries =>
    Boolean(item && typeof item === 'object'),
  );
  const explicitly_matched = series_list.filter(
    (series) => matches_resource_labels(series.labels, service_id) === true,
  );
  const candidates =
    explicitly_matched.length > 0
      ? explicitly_matched
      : series_list.filter((series) => matches_resource_labels(series.labels, service_id) === null);

  let latest: ExtractedMetricPoint | null = null;
  let latest_ms = Number.NEGATIVE_INFINITY;

  for (const series of candidates) {
    if (!Array.isArray(series.values)) continue;
    const series_unit = typeof series.unit === 'string' ? series.unit.trim() : '';

    for (const raw_point of series.values) {
      if (!raw_point || typeof raw_point !== 'object') continue;
      const point = raw_point as RenderMetricPoint;
      if (typeof point.value !== 'number' || !Number.isFinite(point.value)) continue;

      const parsed_ms = parse_timestamp_ms(point.timestamp);
      const iso_ts =
        Number.isFinite(parsed_ms) && typeof point.timestamp === 'string'
          ? new Date(parsed_ms).toISOString()
          : null;
      const point_unit =
        typeof point.unit === 'string' && point.unit.trim() ? point.unit.trim() : series_unit;

      if (Number.isFinite(parsed_ms)) {
        if (parsed_ms >= latest_ms) {
          latest_ms = parsed_ms;
          latest = { value: point.value, unit: point_unit, timestamp: iso_ts };
        }
      } else if (latest_ms === Number.NEGATIVE_INFINITY) {
        latest = { value: point.value, unit: point_unit, timestamp: null };
      }
    }
  }

  return latest;
}

function is_percent_unit(unit: string): boolean {
  const normalized = unit.trim().toLowerCase();
  return normalized === '%' || normalized === 'percent' || normalized === 'percentage';
}

function to_cpu_cores(value: number, unit: string): number | null {
  const normalized = unit.trim().toLowerCase();
  if (
    normalized === 'm' ||
    normalized === 'millicore' ||
    normalized === 'millicores' ||
    normalized === 'millicpu'
  ) {
    return value / 1000;
  }
  if (
    !normalized ||
    normalized === 'core' ||
    normalized === 'cores' ||
    normalized === 'cpu' ||
    normalized === 'vcpu'
  ) {
    return value;
  }
  return null;
}

function to_mib(value: number, unit: string): number | null {
  const normalized = unit.trim().toLowerCase();
  if (!normalized || normalized === 'b' || normalized === 'byte' || normalized === 'bytes') {
    return value / BYTES_PER_MIB;
  }
  if (normalized === 'kib' || normalized === 'kibibyte' || normalized === 'kibibytes') {
    return value / 1024;
  }
  if (normalized === 'kb' || normalized === 'kilobyte' || normalized === 'kilobytes') {
    return (value * 1000) / BYTES_PER_MIB;
  }
  if (normalized === 'mib' || normalized === 'mebibyte' || normalized === 'mebibytes') {
    return value;
  }
  if (normalized === 'mb' || normalized === 'megabyte' || normalized === 'megabytes') {
    return (value * 1_000_000) / BYTES_PER_MIB;
  }
  if (normalized === 'gib' || normalized === 'gibibyte' || normalized === 'gibibytes') {
    return value * 1024;
  }
  if (normalized === 'gb' || normalized === 'gigabyte' || normalized === 'gigabytes') {
    return (value * 1_000_000_000) / BYTES_PER_MIB;
  }
  return null;
}

function pick_latest_timestamp(
  points: Array<ExtractedMetricPoint | null>,
  fallback_iso: string,
): string {
  let best_ms = Number.NEGATIVE_INFINITY;
  let best_iso: string | null = null;
  for (const point of points) {
    if (!point?.timestamp) continue;
    const ms = Date.parse(point.timestamp);
    if (Number.isFinite(ms) && ms > best_ms) {
      best_ms = ms;
      best_iso = point.timestamp;
    }
  }
  return best_iso ?? fallback_iso;
}

async function query_metric_endpoint(
  endpoint: 'cpu' | 'cpu-limit' | 'memory' | 'memory-limit',
  cfg: RenderMetricsConfig,
  now_ms: number,
  fetcher: typeof fetch,
): Promise<EndpointResult> {
  const url = new URL(`${cfg.api_base_url.replace(/\/+$/, '')}/metrics/${endpoint}`);
  url.searchParams.set('resource', cfg.service_id);
  url.searchParams.set('resolutionSeconds', String(cfg.resolution_seconds));
  url.searchParams.set('startTime', new Date(now_ms - cfg.window_minutes * 60_000).toISOString());
  url.searchParams.set('endTime', new Date(now_ms).toISOString());

  try {
    const response = await fetcher(url, {
      headers: {
        Authorization: `Bearer ${cfg.api_key}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(cfg.timeout_ms),
      redirect: 'error',
    });

    if (!response.ok) {
      return { kind: 'http_error', status: response.status };
    }

    const body = await response.json();
    return { kind: 'ok', point: extract_latest_point(body, cfg.service_id) };
  } catch {
    return { kind: 'invalid' };
  }
}

function error_message_for_status(statuses: number[]): string {
  if (statuses.some((code) => code === 401 || code === 403)) {
    return 'Render API từ chối xác thực. Kiểm tra lại RENDER_API_KEY hoặc quyền truy cập service.';
  }
  if (statuses.some((code) => code === 404)) {
    return 'Không tìm thấy service vinlook-api trên Render theo RENDER_SERVICE_ID đã cấu hình.';
  }
  if (statuses.some((code) => code === 429)) {
    return 'Render Metrics API đang giới hạn tần suất truy vấn. Dữ liệu sẽ tự cập nhật lại sau.';
  }
  return 'Không lấy được số liệu CPU/RAM từ Render Metrics API.';
}

/**
 * Truy vấn trực tiếp số liệu CPU (%) và RAM (MiB) hiện tại của vinlook-api từ Render Metrics API.
 */
export async function fetch_render_metrics(
  options: {
    env?: Record<string, string | undefined>;
    fetcher?: typeof fetch;
    now?: () => number;
  } = {},
): Promise<RenderMetricsSnapshot> {
  const now = options.now ?? Date.now;
  const fetcher = options.fetcher ?? fetch;
  const now_ms = now();
  const checked_at = new Date(now_ms).toISOString();

  const resolved = read_render_metrics_config(options.env ?? process.env);
  if (!resolved.ok) {
    return {
      status: 'unconfigured',
      cpu_percent: null,
      memory_used_mib: null,
      memory_limit_mib: null,
      updated_at: null,
      checked_at,
      message: resolved.message,
    };
  }

  const cfg = resolved.config;
  const [cpu_res, cpu_limit_res, memory_res, memory_limit_res] = await Promise.all([
    query_metric_endpoint('cpu', cfg, now_ms, fetcher),
    query_metric_endpoint('cpu-limit', cfg, now_ms, fetcher),
    query_metric_endpoint('memory', cfg, now_ms, fetcher),
    query_metric_endpoint('memory-limit', cfg, now_ms, fetcher),
  ]);

  const all_results = [cpu_res, cpu_limit_res, memory_res, memory_limit_res];
  const auth_or_not_found = all_results
    .filter((r): r is Extract<EndpointResult, { kind: 'http_error' }> => r.kind === 'http_error')
    .map((r) => r.status)
    .filter((s) => s === 401 || s === 403 || s === 404);

  if (auth_or_not_found.length > 0) {
    return {
      status: 'error',
      cpu_percent: null,
      memory_used_mib: null,
      memory_limit_mib: null,
      updated_at: null,
      checked_at,
      message: error_message_for_status(auth_or_not_found),
    };
  }

  const required_results = [cpu_res, memory_res];
  if (required_results.some((r) => r.kind !== 'ok')) {
    const http_statuses = required_results
      .filter((r): r is Extract<EndpointResult, { kind: 'http_error' }> => r.kind === 'http_error')
      .map((r) => r.status);
    return {
      status: 'error',
      cpu_percent: null,
      memory_used_mib: null,
      memory_limit_mib: null,
      updated_at: null,
      checked_at,
      message: error_message_for_status(http_statuses),
    };
  }

  const cpu_point = cpu_res.kind === 'ok' ? cpu_res.point : null;
  const cpu_limit_point = cpu_limit_res.kind === 'ok' ? cpu_limit_res.point : null;
  const memory_point = memory_res.kind === 'ok' ? memory_res.point : null;
  const memory_limit_point = memory_limit_res.kind === 'ok' ? memory_limit_res.point : null;

  let cpu_percent: number | null = null;
  if (cpu_point !== null) {
    if (is_percent_unit(cpu_point.unit)) {
      cpu_percent = round_one_decimal(Math.max(0, cpu_point.value));
    } else {
      const used_cores = to_cpu_cores(cpu_point.value, cpu_point.unit);
      if (used_cores !== null) {
        if (used_cores <= 0) {
          cpu_percent = 0;
        } else if (cpu_limit_point !== null) {
          const limit_cores = to_cpu_cores(cpu_limit_point.value, cpu_limit_point.unit);
          if (limit_cores !== null && limit_cores > 0) {
            cpu_percent = round_one_decimal((used_cores / limit_cores) * 100);
          }
        }
      }
    }
  }

  let memory_used_mib: number | null = null;
  if (memory_point !== null) {
    const converted = to_mib(memory_point.value, memory_point.unit);
    if (converted !== null) {
      memory_used_mib = round_one_decimal(Math.max(0, converted));
    }
  }

  let memory_limit_mib: number | null = null;
  if (memory_limit_point !== null) {
    const converted = to_mib(memory_limit_point.value, memory_limit_point.unit);
    if (converted !== null && converted >= 0) {
      memory_limit_mib = round_one_decimal(converted);
    }
  }

  if (cpu_percent === null && memory_used_mib === null) {
    return {
      status: 'empty',
      cpu_percent: null,
      memory_used_mib: null,
      memory_limit_mib: null,
      updated_at: null,
      checked_at,
      message: 'Render chưa có số liệu CPU/RAM cho vinlook-api trong 15 phút gần đây.',
    };
  }

  const updated_at = pick_latest_timestamp(
    [cpu_point, memory_point, memory_limit_point],
    checked_at,
  );

  return {
    status: 'ok',
    cpu_percent,
    memory_used_mib,
    memory_limit_mib,
    updated_at,
    checked_at,
    message: null,
  };
}

/**
 * Tạo bộ đọc số liệu Render có cache ngắn hạn và gom các yêu cầu trùng thời điểm.
 */
export function create_render_metrics_reader(
  options: {
    env?: Record<string, string | undefined>;
    fetcher?: typeof fetch;
    now?: () => number;
    cache_ttl_ms?: number;
    error_cache_ttl_ms?: number;
  } = {},
): () => Promise<RenderMetricsSnapshot> {
  const now = options.now ?? Date.now;
  const cache_ttl_ms = options.cache_ttl_ms ?? config.renderMetrics.cacheTtlMs;
  const error_cache_ttl_ms =
    options.error_cache_ttl_ms ?? Math.min(cache_ttl_ms, config.renderMetrics.errorCacheTtlMs);

  let cached: RenderMetricsSnapshot | undefined;
  let expires_at = 0;
  let pending: Promise<RenderMetricsSnapshot> | undefined;

  return async () => {
    const cfg_check = read_render_metrics_config(options.env ?? process.env);
    if (!cfg_check.ok) {
      return {
        status: 'unconfigured',
        cpu_percent: null,
        memory_used_mib: null,
        memory_limit_mib: null,
        updated_at: null,
        checked_at: new Date(now()).toISOString(),
        message: cfg_check.message,
      };
    }

    if (cached && now() < expires_at) {
      return cached;
    }

    if (!pending) {
      pending = fetch_render_metrics({
        env: options.env,
        fetcher: options.fetcher,
        now,
      })
        .catch(() => ({
          status: 'error' as const,
          cpu_percent: null,
          memory_used_mib: null,
          memory_limit_mib: null,
          updated_at: null,
          checked_at: new Date(now()).toISOString(),
          message: 'Không lấy được số liệu CPU/RAM từ Render Metrics API.',
        }))
        .then((snapshot) => {
          const ttl = snapshot.status === 'error' ? error_cache_ttl_ms : cache_ttl_ms;
          cached = snapshot;
          expires_at = now() + ttl;
          return snapshot;
        })
        .finally(() => {
          pending = undefined;
        });
    }

    return pending;
  };
}
