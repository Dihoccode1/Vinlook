import {
  format_metric_number,
  format_metric_time,
  type RenderMetrics,
  type useMonitorDashboard,
} from './useMonitorDashboard';

function render_status_badge(metrics: RenderMetrics | undefined): {
  tone: 'healthy' | 'unavailable' | 'unreachable' | 'stale';
  label: string;
} {
  if (!metrics) return { tone: 'stale', label: 'Đang kiểm tra...' };
  if (metrics.status === 'ok') return { tone: 'healthy', label: 'Đang thu thập' };
  if (metrics.status === 'unconfigured') return { tone: 'stale', label: 'Chưa cấu hình' };
  if (metrics.status === 'empty') return { tone: 'unavailable', label: 'Chưa có số liệu' };
  return { tone: 'unreachable', label: 'Lỗi API Render' };
}

type Props = Pick<
  ReturnType<typeof useMonitorDashboard>,
  | 'snapshot'
  | 'error'
  | 'set_refresh'
  | 'delivery'
  | 'delivery_error'
  | 'workflow_url'
  | 'ci_label'
  | 'status_names'
>;
export function ServiceStatusPanel({
  snapshot,
  error,
  set_refresh,
  delivery,
  delivery_error,
  workflow_url,
  ci_label,
  status_names,
}: Props) {
  const render_metrics = snapshot?.render_metrics;
  const render_badge = render_status_badge(render_metrics);
  const render_summary_parts: string[] = [];
  if (render_metrics?.status === 'ok') {
    if (typeof render_metrics.cpu_percent === 'number') {
      render_summary_parts.push(`CPU ${format_metric_number(render_metrics.cpu_percent)}%`);
    }
    if (typeof render_metrics.memory_used_mib === 'number') {
      const limit =
        typeof render_metrics.memory_limit_mib === 'number'
          ? ` / ${format_metric_number(render_metrics.memory_limit_mib)} MiB`
          : '';
      render_summary_parts.push(
        `RAM ${format_metric_number(render_metrics.memory_used_mib)} MiB${limit}`,
      );
    }
  }
  return (
    <>
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
                  <a href={delivery?.ci.url ?? workflow_url} target="_blank" rel="noreferrer">
                    {delivery?.ci.url ? 'Xem lần chạy trên GitHub ↗' : 'Mở GitHub Actions ↗'}
                  </a>
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

              <tr>
                <td>
                  <strong>Tài nguyên Render (vinlook-api)</strong>
                </td>
                <td data-label="Trạng thái">
                  <span className={`monitor-status ${render_badge.tone}`}>
                    {render_badge.label}
                  </span>
                </td>
                <td data-label="Chi tiết kiểm tra">
                  {render_metrics?.status === 'ok'
                    ? render_summary_parts.join(' • ')
                    : (render_metrics?.message ??
                      'Đang lấy số liệu CPU/RAM từ Render Metrics API...')}
                  {render_metrics && (
                    <small className="monitor-service-id">
                      {render_metrics.updated_at
                        ? `Cập nhật lúc ${format_metric_time(render_metrics.updated_at)}`
                        : `Kiểm tra lúc ${format_metric_time(render_metrics.checked_at)}`}
                    </small>
                  )}
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
    </>
  );
}
