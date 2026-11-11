/**
 * @file MonitorDashboard.tsx
 * @description Phân hệ Giám sát Hệ thống (System Monitoring Feature)
 * Theo dõi trực tiếp trạng thái microservices (POI, Navigation, Translation, SQL Server), CI/CD và nhật ký sự kiện.
 */

import React, { useEffect, useState } from 'react';
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

interface Delivery {
  checked_at: string;
  ci: {
    state: string;
    conclusion?: string | null;
    url?: string;
    updated_at?: string;
  };
  cd: { state: string; revision?: string };
}

function ci_label(ci: Delivery['ci']): string {
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

interface Snapshot {
  checked_at: string;
  uptime_seconds: number;
  services: {
    id: string;
    name: string;
    status: 'healthy' | 'unavailable' | 'unreachable';
    latency_ms: number | null;
    database: string | null;
  }[];
}

const status_names = {
  healthy: 'Hoạt động',
  unavailable: 'Chưa sẵn sàng',
  unreachable: 'Không kết nối được',
};

export function MonitorDashboard() {
  const [snapshot, set_snapshot] = useState<Snapshot | null>(null);
  const [error, set_error] = useState('');
  const [refresh, set_refresh] = useState(0);
  const [journal, set_journal] = useState<Journal | null>(null);
  const [journal_error, set_journal_error] = useState('');
  const [delivery, set_delivery] = useState<Delivery | null>(null);
  const [delivery_error, set_delivery_error] = useState(false);

  // Polling định kỳ mỗi 5 giây để cập nhật trạng thái hệ thống
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;

    async function poll() {
      if (pending) return;
      pending = true;

      await Promise.allSettled([
        api<{ data: Delivery }>('/monitor/delivery', { signal: controller.signal })
          .then((result) => {
            if (!controller.signal.aborted) {
              set_delivery(result.data);
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

      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>Trạng thái hệ thống</h2>
            <p>
              {snapshot
                ? `Kiểm tra lúc ${new Date(snapshot.checked_at).toLocaleTimeString('vi-VN')} • Gateway hoạt động ${Math.floor(snapshot.uptime_seconds / 60)} phút`
                : 'Đang kiểm tra các dịch vụ...'}
            </p>
          </div>
          <button onClick={() => set_refresh((value) => value + 1)}>Làm mới</button>
        </div>

        {/* Bảng trạng thái CI / CD / Database */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hạng mục</th>
                <th>Trạng thái</th>
                <th>Chi tiết kiểm tra</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>CI (Tích hợp liên tục)</strong>
                </td>
                <td data-label="Trạng thái">
                  <span
                    className={`monitor-status ${
                      delivery_error || delivery?.ci.state === 'unknown'
                        ? 'stale'
                        : delivery?.ci.conclusion === 'success'
                          ? 'healthy'
                          : 'unavailable'
                    }`}
                  >
                    {delivery_error
                      ? 'Không cập nhật được'
                      : delivery
                        ? ci_label(delivery.ci)
                        : 'Đang kiểm tra...'}
                  </span>
                </td>
                <td data-label="Chi tiết kiểm tra">
                  GitHub Actions CI Pipeline
                  {delivery?.ci.url && (
                    <>
                      {' '}
                      •{' '}
                      <a href={delivery.ci.url} target="_blank" rel="noreferrer">
                        Xem lần chạy ↗
                      </a>
                    </>
                  )}
                  {delivery && (
                    <small className="monitor-service-id">
                      Kiểm tra lúc {new Date(delivery.checked_at).toLocaleTimeString('vi-VN')}
                    </small>
                  )}
                </td>
              </tr>

              <tr>
                <td>
                  <strong>CD (Triển khai liên tục)</strong>
                </td>
                <td data-label="Trạng thái">
                  <span
                    className={`monitor-status ${delivery?.cd.state === 'backend_running' ? 'healthy' : 'stale'}`}
                  >
                    {delivery_error
                      ? 'Không cập nhật được'
                      : delivery
                        ? delivery.cd.state === 'backend_running'
                          ? 'Backend đã cập nhật'
                          : 'Chưa có bản triển khai tự động'
                        : 'Đang kiểm tra...'}
                  </span>
                </td>
                <td data-label="Chi tiết kiểm tra">
                  Docker trên máy nhóm; frontend được kiểm tra rồi promote lên Vercel.
                  {delivery?.cd.revision && (
                    <small className="monitor-service-id">
                      Backend: {delivery.cd.revision.slice(0, 7)}
                    </small>
                  )}
                  <small className="monitor-service-id">
                    Xem workflow để xác nhận kết quả toàn bộ lần triển khai.
                  </small>
                </td>
              </tr>

              <tr>
                <td>
                  <strong>Cơ sở dữ liệu (Database)</strong>
                </td>
                <td data-label="Trạng thái">
                  <span
                    className={`monitor-status ${
                      error || !snapshot
                        ? 'stale'
                        : snapshot.services
                              .filter((s) => s.database)
                              .every((s) => s.status === 'healthy')
                          ? 'healthy'
                          : 'unavailable'
                    }`}
                  >
                    {error
                      ? 'Chưa cập nhật'
                      : !snapshot
                        ? 'Đang kiểm tra...'
                        : snapshot.services
                              .filter((s) => s.database)
                              .every((s) => s.status === 'healthy')
                          ? 'Đã kết nối'
                          : 'Chưa sẵn sàng'}
                  </span>
                </td>
                <td data-label="Chi tiết kiểm tra">
                  {snapshot?.services
                    .filter((s) => s.database)
                    .map((s) => (
                      <small className="monitor-service-id" key={s.id}>
                        {s.database} •{' '}
                        {error
                          ? 'Chưa cập nhật'
                          : s.status === 'healthy'
                            ? 'Đã kết nối'
                            : 'Chưa xác nhận'}
                      </small>
                    ))}
                  Microsoft SQL Server • Kiểm tra qua endpoint readiness mỗi 5 giây
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bảng trạng thái chi tiết các Microservices */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Dịch vụ</th>
                <th>Trạng thái</th>
                <th>Độ trễ</th>
                <th>Cơ sở dữ liệu</th>
              </tr>
            </thead>
            <tbody>
              {snapshot?.services.map((service) => (
                <tr key={service.id}>
                  <td>
                    <strong>{service.name}</strong>
                    <small className="monitor-service-id">{service.id}</small>
                  </td>
                  <td data-label="Trạng thái">
                    <span className={`monitor-status ${error ? 'stale' : service.status}`}>
                      {error ? 'Chưa cập nhật' : status_names[service.status]}
                    </span>
                  </td>
                  <td data-label="Phản hồi">
                    {service.latency_ms === null ? '—' : `${service.latency_ms} ms`}
                  </td>
                  <td data-label="Cơ sở dữ liệu">
                    {service.database
                      ? `${service.database} • ${
                          error
                            ? 'Chưa cập nhật'
                            : service.status === 'healthy'
                              ? 'Đã kết nối'
                              : 'Chưa xác nhận'
                        }`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="chart-note">
          Dịch vụ POI và Dịch thuật kiểm tra kết nối SQL Server qua cơ chế readiness. Dịch vụ Tìm
          đường kiểm tra engine Valhalla.
        </p>
      </section>

      {journal_error && (
        <p className="error-banner" role="alert">
          {journal_error}
        </p>
      )}

      {/* Nhật ký hệ thống & Nhật ký sự kiện */}
      {(
        [
          ['system', 'Nhật ký hệ thống'],
          ['usage', 'Sự kiện sử dụng & yêu cầu'],
        ] as const
      ).map(([key, title]) => (
        <section className="panel" key={key}>
          <div className="panel-title">
            <div>
              <h2>{title}</h2>
              <p>
                {key === 'system'
                  ? 'Khởi động Gateway, thao tác quản trị và các lỗi API được ghi nhận.'
                  : 'Các yêu cầu xem điểm đến, dịch kịch bản, nghe thuyết minh và tìm đường đi.'}
              </p>
            </div>
          </div>

          {!journal ? (
            <p className="empty-state" role="status">
              {journal_error ? 'Chưa có dữ liệu để hiển thị.' : 'Đang tải dữ liệu...'}
            </p>
          ) : journal[key].length === 0 ? (
            <p className="empty-state">
              Chưa ghi nhận {key === 'system' ? 'nhật ký' : 'sự kiện nào'}.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Nội dung sự kiện</th>
                    <th>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {journal[key].map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.time).toLocaleString('vi-VN')}</td>
                      <td data-label="Nội dung">{entry.message}</td>
                      <td data-label="Kết quả">
                        <span
                          className={`monitor-status ${entry.level === 'error' ? 'unreachable' : 'healthy'}`}
                        >
                          {entry.status === null
                            ? 'Thông tin'
                            : `${entry.status < 400 ? 'Thành công' : 'Lỗi'} • HTTP ${entry.status}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="chart-note">
            Hiển thị tối đa 200 bản ghi mới nhất, tự động làm mới mỗi 5 giây.
          </p>
        </section>
      ))}
    </div>
  );
}
