import type { Poi } from '../../types/poi';
import { useState } from 'react';
import type { use_route_plan } from './use-route-plan';
import { format_distance, format_duration, vehicle_labels, type VehicleProfile } from './types';
import { RouteStopOrderDialog } from './RouteStopOrderDialog';

interface Props { plan: ReturnType<typeof use_route_plan>; pois: Poi[]; on_explore: () => void; on_calculate: () => void; on_show_route: () => void }

export function RoutePlanner({ plan, pois, on_explore: on_explore, on_calculate: on_calculate, on_show_route: on_show_route }: Props) {
  const [order_open, set_order_open] = useState(false);
  return <section className="route-planner" aria-label="Lập lộ trình">
    <span className="eyebrow">HÀNH TRÌNH CỦA BẠN</span>{plan.stops.length ? <h2 className="route-destination-title">Đến {plan.stops.at(-1)?.name}</h2> : <h2>Đi qua những nơi<br />bạn yêu thích.</h2>}
    <label htmlFor="route-origin">Điểm xuất phát</label>
    <select id="route-origin" value={plan.origin_id} onChange={event => { on_show_route(); plan.set_origin_id(event.target.value); }}>
      <option value="gps">Vị trí GPS hiện tại</option>
      {pois.map(poi => <option key={poi.id} value={poi.id}>{poi.name}</option>)}
    </select>
    <div className="vehicle-options" role="group" aria-label="Phương tiện">
      {(Object.keys(vehicle_labels) as VehicleProfile[]).map(mode => <button key={mode} aria-pressed={plan.profile === mode} onClick={() => { on_show_route(); plan.set_profile(mode); }}>{vehicle_labels[mode]}</button>)}
    </div>
    {plan.route && <div className="route-quick-summary" role="status"><span>{vehicle_labels[plan.route.profile]} · Ngắn nhất theo quãng đường</span><div className="route-summary"><strong>{format_distance(plan.route.distance)}</strong><span>Khoảng {format_duration(plan.route.duration)}</span></div></div>}
    <div className="route-stops-heading"><h3>Điểm dừng · {plan.stops.length}/9</h3><button onClick={on_explore}>+ Thêm POI</button></div>
    <div className="route-order-entry"><button disabled={plan.stops.length < 2} onClick={() => set_order_open(true)}>⇅ Sắp xếp lộ trình</button>{plan.stops.length < 2 && <small>Thêm ít nhất 2 POI để sắp xếp.</small>}</div>
    {plan.stops.length === 0 ? <p className="route-hint">Chọn địa điểm trên bản đồ rồi bấm “Thêm vào lộ trình”.</p> : <ol className="route-stops">
      {plan.stops.map((poi, index) => <li key={poi.id}>
        <span className="route-stop-number">{index + 1}</span><span className="route-stop-name">{poi.name}</span>
        <div className="route-stop-actions"><button disabled={index === 0} aria-label={`Đưa ${poi.name} lên trước`} onClick={() => plan.move_stop(index, -1)}>↑</button><button disabled={index === plan.stops.length - 1} aria-label={`Đưa ${poi.name} xuống sau`} onClick={() => plan.move_stop(index, 1)}>↓</button><button aria-label={`Xóa ${poi.name} khỏi lộ trình`} onClick={() => plan.remove_stop(poi.id)}>×</button></div>
      </li>)}
    </ol>}
    <p className="route-sharing">Tìm đường {vehicle_labels[plan.profile].toLowerCase()} ngắn nhất theo quãng đường, giữ thứ tự POI bạn chọn. Tọa độ được gửi tới dịch vụ chỉ đường khi bạn yêu cầu tìm tuyến.</p>
    <div className="route-buttons"><button className="route-calculate" disabled={plan.loading || !plan.stops.length} onClick={on_calculate}>{plan.loading ? 'Đang vẽ đường…' : 'Vẽ đường theo lộ trình'}</button>{plan.stops.length > 0 && <button onClick={plan.clear}>Xóa lộ trình</button>}</div>
    {plan.waiting_for_gps && <p className="route-hint" role="status">Đang chờ vị trí GPS. Sau khi bạn cấp quyền, tuyến sẽ tự hiển thị.</p>}
    {plan.error && <p className="route-error" role="alert">{plan.error}</p>}
    {plan.loading && <p className="route-hint" role="status">Đang tính đường qua các điểm dừng theo thứ tự đã chọn…</p>}
    {plan.route && <section className="route-result" aria-label="Kết quả chỉ đường">
      <p className="route-hint">Từ {plan.route.origin_label} · Tính lúc {new Date(plan.route.calculated_at).toLocaleTimeString('vi-VN')}</p>
      <p className="route-hint">Thời gian ước tính, chưa có giao thông trực tiếp. Tuyến không tự tính lại khi bạn di chuyển.</p>
      {plan.route.legs.map((leg, index) => <details key={index} open={index === 0}>
        <summary>Chặng {index + 1}: {plan.stops[index]?.name} <span>{format_distance(leg.distance)}</span></summary>
        <ol className="route-instructions">{leg.steps.map((step, step_index) => <li key={step_index}><span>{step.instruction}</span><small>{format_distance(step.distance)}</small></li>)}</ol>
      </details>)}
      <p className="route-attribution">Tuyến đường: Valhalla · Dữ liệu © OpenStreetMap contributors</p>
    </section>}
    {order_open && <RouteStopOrderDialog stops={plan.stops} origin_label={plan.origin_id === 'gps' ? 'Vị trí GPS của bạn' : pois.find(poi => poi.id === plan.origin_id)?.name ?? 'Điểm xuất phát'} on_apply={ids => { const valid = plan.reorder_stops(ids); if (valid) on_show_route(); return valid; }} on_close={() => set_order_open(false)} />}
  </section>;
}
