import { useRef } from 'react';

export interface ActivitySample { time: number; visitors: number | null; listeners: number | null }
const time_label = (time: number) => new Date(time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function ActivityChart({ samples }: { samples: ActivitySample[] }) {
  const first_sample_time = useRef<number | null>(null);
  if (first_sample_time.current === null && samples.length) first_sample_time.current = samples[0]!.time;
  const end = samples.at(-1)?.time ?? Date.now();
  const start = Math.max(first_sample_time.current ?? end, end - 300000);
  const maximum = Math.max(4, ...samples.flatMap(point => [point.visitors ?? 0, point.listeners ?? 0]));
  const ceiling = Math.ceil(maximum / 4) * 4;
  const x = (time: number) => 44 + (time - start) / 300000 * 628;
  const y = (value: number) => 194 - value / ceiling * 160;
  function path(field: 'visitors' | 'listeners') {
    let connected = false;
    return samples.map((point, index) => {
      const value = point[field];
      if (value === null) { connected = false; return ''; }
      if (index && point.time - samples[index - 1]!.time > 15000) connected = false;
      const segment = `${connected ? 'L' : 'M'}${x(point.time)},${y(value)}`;
      connected = true; return segment;
    }).join(' ');
  }
  return <section className="panel activity-chart">
    <div className="panel-title"><div><h2>Hoạt động theo thời gian</h2><p>5 phút gần nhất · Lấy mẫu mỗi 5 giây</p></div><div className="activity-legend"><span><i className="visitor-dot"/>Đang truy cập</span><span><i className="listener-dot"/>Đang lắng nghe</span></div></div>
    {!samples.some(point => point.visitors !== null) ? <p className="empty-state" role="status">Chưa nhận được dữ liệu hoạt động.</p> : <svg viewBox="0 0 700 240" role="img" aria-label="Biểu đồ số phiên truy cập và số phiên nghe thuyết minh trong 5 phút gần nhất">
      {[0, 1, 2, 3, 4].map(tick => <g key={tick}><line x1="44" x2="672" y1={y(ceiling / 4 * tick)} y2={y(ceiling / 4 * tick)} stroke="#e6ebe6"/><text x="32" y={y(ceiling / 4 * tick) + 4} textAnchor="end">{ceiling / 4 * tick}</text></g>)}
      {[0, 1, 2].map(tick => <text key={tick} x={44 + tick * 314} y="221" textAnchor={tick === 0 ? 'start' : tick === 2 ? 'end' : 'middle'}>{time_label(start + tick * 150000)}</text>)}
      <path d={path('visitors')} stroke="#246d9b" strokeWidth="2.5" fill="none"/>
      <path d={path('listeners')} stroke="#ca762c" strokeWidth="2.5" strokeDasharray="6 4" fill="none"/>
      {samples.flatMap(point => (['visitors', 'listeners'] as const).map(field => point[field] === null ? null : <circle key={`${point.time}-${field}`} cx={x(point.time)} cy={y(point[field]!)} r="3" fill={field === 'visitors' ? '#246d9b' : '#ca762c'}><title>{time_label(point.time)} · {field === 'visitors' ? 'Truy cập' : 'Đang nghe'}: {point[field]}</title></circle>))}
    </svg>}
    <p className="chart-note">Biểu đồ bắt đầu ghi nhận khi mở trang này. Khoảng mất kết nối được để trống; dữ liệu biểu đồ chưa lưu vào cơ sở dữ liệu.</p>
  </section>;
}
