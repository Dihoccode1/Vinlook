import { useEffect, useState } from 'react';
import { api } from './api';
interface JournalEntry { id: number; time: string; level: 'info' | 'error'; message: string; status: number | null }
interface Journal { system: JournalEntry[]; usage: JournalEntry[] }
interface Delivery { checked_at: string; ci: { state: string; conclusion?: string | null; url?: string; updated_at?: string }; cd: { state: string } }

function ci_label(ci: Delivery['ci']) {
  if (ci.state === 'unknown') return 'Không kiểm tra được';
  if (ci.state === 'no_runs') return 'Chưa có lần chạy';
  if (ci.state === 'completed') return ({ success: 'Thành công', failure: 'Thất bại', cancelled: 'Đã hủy', skipped: 'Đã bỏ qua', timed_out: 'Quá thời gian', neutral: 'Trung lập', action_required: 'Cần xử lý' } as Record<string, string>)[ci.conclusion ?? ''] ?? 'Chưa xác định kết quả';
  return ci.state === 'in_progress' ? 'Đang chạy' : 'Đang chờ';
}

interface Snapshot { checked_at: string; uptime_seconds: number; services: { id: string; name: string; status: 'healthy' | 'unavailable' | 'unreachable'; latency_ms: number | null; database: string | null }[] }
const status_names = { healthy: 'Hoạt động', unavailable: 'Chưa sẵn sàng', unreachable: 'Không kết nối được' };
export function MonitorDashboard() {
  const [snapshot, set_snapshot] = useState<Snapshot | null>(null);
  const [error, set_error] = useState('');
  const [refresh, set_refresh] = useState(0);
  const [journal, set_journal] = useState<Journal | null>(null);
  const [journal_error, set_journal_error] = useState('');
  const [delivery, set_delivery] = useState<Delivery | null>(null);
  const [delivery_error, set_delivery_error] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); let pending = false;
    async function poll() {
      if (pending) return; pending = true;
      await Promise.allSettled([
        api<{ data: Delivery }>('/monitor/delivery', { signal: controller.signal }).then(result => { if (!controller.signal.aborted) { set_delivery(result.data); set_delivery_error(false); } }).catch(() => { if (!controller.signal.aborted) set_delivery_error(true); }),
        api<{ data: Snapshot }>('/monitor', { signal: controller.signal }).then(result => { if (!controller.signal.aborted) { set_snapshot(result.data); set_error(''); } }).catch(() => { if (!controller.signal.aborted) set_error('Không cập nhật được trạng thái. Dữ liệu bên dưới là lần kiểm tra gần nhất.'); }),
        api<{ data: Journal }>('/monitor/events', { signal: controller.signal }).then(result => { if (!controller.signal.aborted) { set_journal(result.data); set_journal_error(''); } }).catch(() => { if (!controller.signal.aborted) set_journal_error('Không tải được nhật ký và sự kiện. Dữ liệu hiển thị là lần tải gần nhất.'); }),
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
    </section>
    <section className="panel"><div className="panel-title"><div><h2>Trạng thái hệ thống</h2><p>{snapshot ? `Kiểm tra lúc ${new Date(snapshot.checked_at).toLocaleTimeString('vi-VN')} · Gateway chạy ${Math.floor(snapshot.uptime_seconds / 60)} phút` : 'Đang kiểm tra các service…'}</p></div><button onClick={() => set_refresh(value => value + 1)}>↻ Làm mới</button></div>
      <div className="table-wrap"><table><thead><tr><th>Hạng mục</th><th>Trạng thái</th><th>Chi tiết kiểm tra</th></tr></thead><tbody>
        <tr><td><strong>CI</strong></td><td data-label="Trạng thái"><span className={`monitor-status ${delivery_error || delivery?.ci.state === 'unknown' ? 'stale' : delivery?.ci.conclusion === 'success' ? 'healthy' : 'unavailable'}`}>{delivery_error ? 'Không cập nhật được' : delivery ? ci_label(delivery.ci) : 'Đang kiểm tra…'}</span></td><td data-label="Chi tiết kiểm tra">Validate workspace · Nhánh TEST{delivery?.ci.url && <> · <a href={delivery.ci.url} target="_blank" rel="noreferrer">Xem lần chạy ↗</a></>}{delivery && <small className="monitor-service-id">Kiểm tra lúc {new Date(delivery.checked_at).toLocaleTimeString('vi-VN')} · Cập nhật tối đa mỗi phút</small>}</td></tr>
        <tr><td><strong>CD</strong></td><td data-label="Trạng thái"><span className="monitor-status stale">{delivery_error ? 'Không cập nhật được' : delivery ? 'Chưa cấu hình' : 'Đang kiểm tra…'}</span></td><td data-label="Chi tiết kiểm tra">Chưa có pipeline tự động triển khai trong dự án.</td></tr>
        <tr><td><strong>Database</strong></td><td data-label="Trạng thái"><span className={`monitor-status ${error || !snapshot ? 'stale' : snapshot.services.filter(service => service.database).every(service => service.status === 'healthy') ? 'healthy' : 'unavailable'}`}>{error ? 'Chưa cập nhật' : !snapshot ? 'Đang kiểm tra…' : snapshot.services.filter(service => service.database).every(service => service.status === 'healthy') ? 'Đã kết nối' : 'Chưa sẵn sàng'}</span></td><td data-label="Chi tiết kiểm tra">{snapshot?.services.filter(service => service.database).map(service => <small className="monitor-service-id" key={service.id}>{service.database} · {error ? 'Chưa cập nhật' : service.status === 'healthy' ? 'Đã kết nối' : 'Chưa xác nhận kết nối'}</small>)}SQL Server · Kiểm tra qua readiness mỗi 5 giây</td></tr>
      </tbody></table></div>
      <div className="table-wrap"><table><thead><tr><th>Dịch vụ</th><th>Trạng thái</th><th>Phản hồi</th><th>Cơ sở dữ liệu</th></tr></thead><tbody>{snapshot?.services.map(service => <tr key={service.id}><td><strong>{service.name}</strong><small className="monitor-service-id">{service.id}</small></td><td data-label="Trạng thái"><span className={`monitor-status ${error ? 'stale' : service.status}`}>{error ? 'Chưa cập nhật' : status_names[service.status]}</span></td><td data-label="Phản hồi">{service.latency_ms === null ? '—' : `${service.latency_ms} ms`}</td><td data-label="Cơ sở dữ liệu">{service.database ? `${service.database} · ${error ? 'Chưa cập nhật' : service.status === 'healthy' ? 'Đã kết nối' : 'Chưa xác nhận'}` : '—'}</td></tr>)}</tbody></table></div>
      <p className="chart-note">POI và dịch thuật kiểm tra kết nối SQL Server qua readiness. Trạng thái tìm đường chỉ xác nhận service đang chạy, chưa kiểm tra API bản đồ hay hạn mức dịch vụ AI.</p>
    </section>
    {journal_error && <p className="error-banner" role="alert">{journal_error}</p>}
    {([['system', 'Nhật ký hệ thống'], ['usage', 'Sự kiện sử dụng']] as const).map(([key, title]) => <section className="panel" key={key}>
      <div className="panel-title"><div><h2>{title}</h2><p>{key === 'system' ? 'Khởi động Gateway, thao tác quản trị và lỗi API.' : 'Các yêu cầu xem địa điểm, dịch nội dung, thuyết minh và tìm đường.'}</p></div></div>
      {!journal ? <p className="empty-state" role="status">{journal_error ? 'Chưa có dữ liệu để hiển thị.' : 'Đang tải dữ liệu…'}</p> : journal[key].length === 0 ? <p className="empty-state">Chưa ghi nhận {key === 'system' ? 'nhật ký' : 'sự kiện'}.</p> : <div className="table-wrap"><table><thead><tr><th>Thời gian</th><th>Nội dung</th><th>Kết quả</th></tr></thead><tbody>{journal[key].map(entry => <tr key={entry.id}><td>{new Date(entry.time).toLocaleString('vi-VN')}</td><td data-label="Nội dung">{entry.message}</td><td data-label="Kết quả"><span className={'monitor-status ' + (entry.level === 'error' ? 'unreachable' : 'healthy')}>{entry.status === null ? 'Thông tin' : (entry.status < 400 ? 'Thành công' : 'Lỗi') + ' · HTTP ' + entry.status}</span></td></tr>)}</tbody></table></div>}
      <p className="chart-note">Hiển thị tối đa 200 bản ghi mới nhất, tự cập nhật mỗi 5 giây. Dữ liệu lưu tạm và được xóa khi Gateway khởi động lại.</p>
    </section>)}

  </div>;
}
