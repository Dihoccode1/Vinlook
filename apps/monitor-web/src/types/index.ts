/**
 * @file index.ts
 * @description Định nghĩa các kiểu dữ liệu cho phân hệ Giám sát Hệ thống (Monitor Web)
 */

export interface ServiceStatus {
  id: string;
  name: string;
  status: 'healthy' | 'unavailable' | 'unreachable';
  latency_ms: number | null;
  database: string | null;
}

export interface SystemSnapshot {
  checked_at: string;
  uptime_seconds: number;
  services: ServiceStatus[];
}

export interface JournalEntry {
  id: number;
  time: string;
  level: 'info' | 'error';
  message: string;
  status: number | null;
}

export interface JournalData {
  system: JournalEntry[];
  usage: JournalEntry[];
}

export interface DeliveryData {
  checked_at: string;
  ci: {
    state: string;
    conclusion?: string | null;
    url?: string;
    updated_at?: string;
  };
  cd: {
    state: string;
  };
}

export interface ActivityData {
  visitors: number;
  listeners: number;
}
