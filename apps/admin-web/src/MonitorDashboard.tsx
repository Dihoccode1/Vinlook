import { useEffect, useState } from 'react';
import { api } from './api';
import { ActivityChart, type ActivitySample } from './ActivityChart';

interface Snapshot { checked_at: string; uptime_seconds: number; services: { id: string; name: string; status: 'healthy' | 'unavailable' | 'unreachable'; latency_ms: number | null; database: string | null }[] }
const status_names = { healthy: 'Hoạt động', unavailable: 'Chưa sẵn sàng', unreachable: 'Không kết nối được' };
export function MonitorDashboard() {
  const [snapshot, set_snapshot] = useState<Snapshot | null>(null);
  const [error, set_error] = useState('');
  const [refresh, set_refresh] = useState(0);
  const [activity, set_activity] = useState<{ visitors: number; listeners: number } | null>(null);
  const [samples, set_samples] = useState<ActivitySample[]>([]);
  useEffect(() => {
    const controller = new AbortController(); let pending = false;
    function record(activity: { visitors: number; listeners: number } | null) {
      if (controller.signal.aborted) return;
      set_activity(activity);
      const time = Date.now();
      set_samples(previous => [...previous.filter(point => point.time > time - 300000), { time, visitors: activity?.visitors ?? null, listeners: activity?.listeners ?? null }].slice(-120));
    }
    async function poll() {
      if (pending) return; pending = true;
      await Promise.allSettled([
        api<{ data: Snapshot }>('/monitor', { signal: controller.signal }).then(result => { if (!controller.signal.aborted) { set_snapshot(result.data); set_error(''); } }).catch(() => { if (!controller.signal.aborted) set_error('Không cập nhật được trạng thái. Dữ liệu bên dưới là lần kiểm tra gần nhất.'); }),
        api<{ data: { visitors: number; listeners: number } }>('/activity', { signal: controller.signal }).then(result => record(result.data)).catch(() => record(null)),
      ]);
      pending = false;
    }
    void poll(); const timer = setInterval(() => void poll(), 5000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [refresh]);
  const healthy = snapshot?.services.filter(service => service.status === 'healthy').length;
  return <div className="monitor-dashboard">
    {error && <p className="error-banner" role="alert">{error}</p>}
    <section className="metrics" aria-label="Giám sát trực tiếp">
      <article><div className="metric-label">Dịch vụ sẵn sàng</div><strong>{snapshot && !error ? `${healthy}/${snapshot.services.length}` : '—'}</strong><p>{error ? 'Chưa cập nhật được' : 'Kiểm tra trực tiếp mỗi 5 giây'}</p></article>
      <article><div className="metric-label">Đang truy cập</div><strong>{activity?.visitors ?? '—'}</strong><p>Phiên truy cập đang hoạt động</p></article>
      <article><div className="metric-label">Đang lắng nghe</div><strong>{activity?.listeners ?? '—'}</strong><p>Phiên đang phát thuyết minh</p></article>
    </section>
    <ActivityChart samples={samples}/>
    <section className="panel"><div className="panel-title"><div><h2>Trạng thái hệ thống</h2><p>{snapshot ? `Kiểm tra lúc ${new Date(snapshot.checked_at).toLocaleTimeString('vi-VN')} · Gateway chạy ${Math.floor(snapshot.uptime_seconds / 60)} phút` : 'Đang kiểm tra các service…'}</p></div><button onClick={() => set_refresh(value => value + 1)}>↻ Làm mới</button></div>
      <div className="table-wrap"><table><thead><tr><th>Dịch vụ</th><th>Trạng thái</th><th>Phản hồi</th><th>Cơ sở dữ liệu</th></tr></thead><tbody>{snapshot?.services.map(service => <tr key={service.id}><td><strong>{service.name}</strong><small className="monitor-service-id">{service.id}</small></td><td data-label="Trạng thái"><span className={`monitor-status ${error ? 'stale' : service.status}`}>{error ? 'Chưa cập nhật' : status_names[service.status]}</span></td><td data-label="Phản hồi">{service.latency_ms === null ? '—' : `${service.latency_ms} ms`}</td><td data-label="Cơ sở dữ liệu">{service.database ? `${service.database} · ${error ? 'Chưa cập nhật' : service.status === 'healthy' ? 'Đã kết nối' : 'Chưa xác nhận'}` : '—'}</td></tr>)}</tbody></table></div>
      <p className="chart-note">POI và dịch thuật kiểm tra kết nối SQL Server qua readiness. Trạng thái tìm đường chỉ xác nhận service đang chạy, chưa kiểm tra API bản đồ hay hạn mức dịch vụ AI.</p>
    </section>
    <p className="chart-note">Lượt truy cập tính theo phiên tab đang hoạt động. Số liệu trực tiếp được làm mới mỗi 5 giây.</p>
  </div>;
}
