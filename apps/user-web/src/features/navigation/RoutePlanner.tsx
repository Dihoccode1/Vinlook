import type { Poi } from '../../types/poi';
import { useState } from 'react';
import type { useRoutePlan } from './use-route-plan';
import { formatDistance, formatDuration, vehicleLabels, type VehicleProfile } from './types';
import { RouteStopOrderDialog } from './RouteStopOrderDialog';

interface Props { plan: ReturnType<typeof useRoutePlan>; pois: Poi[]; onExplore: () => void; onCalculate: () => void; onShowRoute: () => void }

export function RoutePlanner({ plan, pois, onExplore, onCalculate, onShowRoute }: Props) {
  const [orderOpen, setOrderOpen] = useState(false);
  return <section className="route-planner" aria-label="Lập lộ trình">
    <span className="eyebrow">HÀNH TRÌNH CỦA BẠN</span>{plan.stops.length ? <h2 className="route-destination-title">Đến {plan.stops.at(-1)?.name}</h2> : <h2>Đi qua những nơi<br />bạn yêu thích.</h2>}
    <label htmlFor="route-origin">Điểm xuất phát</label>
    <select id="route-origin" value={plan.originId} onChange={event => { onShowRoute(); plan.setOriginId(event.target.value); }}>
      <option value="gps">Vị trí GPS hiện tại</option>
      {pois.map(poi => <option key={poi.id} value={poi.id}>{poi.name}</option>)}
    </select>
    <div className="vehicle-options" role="group" aria-label="Phương tiện">
      {(Object.keys(vehicleLabels) as VehicleProfile[]).map(mode => <button key={mode} aria-pressed={plan.profile === mode} onClick={() => { onShowRoute(); plan.setProfile(mode); }}>{vehicleLabels[mode]}</button>)}
    </div>
    {plan.route && <div className="route-quick-summary" role="status"><span>{vehicleLabels[plan.route.profile]} · Ngắn nhất theo quãng đường</span><div className="route-summary"><strong>{formatDistance(plan.route.distance)}</strong><span>Khoảng {formatDuration(plan.route.duration)}</span></div></div>}
    <div className="route-stops-heading"><h3>Điểm dừng · {plan.stops.length}/9</h3><button onClick={onExplore}>+ Thêm POI</button></div>
    <div className="route-order-entry"><button disabled={plan.stops.length < 2} onClick={() => setOrderOpen(true)}>⇅ Sắp xếp lộ trình</button>{plan.stops.length < 2 && <small>Thêm ít nhất 2 POI để sắp xếp.</small>}</div>
    {plan.stops.length === 0 ? <p className="route-hint">Chọn địa điểm trên bản đồ rồi bấm “Thêm vào lộ trình”.</p> : <ol className="route-stops">
      {plan.stops.map((poi, index) => <li key={poi.id}>
        <span className="route-stop-number">{index + 1}</span><span className="route-stop-name">{poi.name}</span>
        <div className="route-stop-actions"><button disabled={index === 0} aria-label={`Đưa ${poi.name} lên trước`} onClick={() => plan.moveStop(index, -1)}>↑</button><button disabled={index === plan.stops.length - 1} aria-label={`Đưa ${poi.name} xuống sau`} onClick={() => plan.moveStop(index, 1)}>↓</button><button aria-label={`Xóa ${poi.name} khỏi lộ trình`} onClick={() => plan.removeStop(poi.id)}>×</button></div>
      </li>)}
    </ol>}
    <p className="route-sharing">Tìm đường {vehicleLabels[plan.profile].toLowerCase()} ngắn nhất theo quãng đường, giữ thứ tự POI bạn chọn. Tọa độ được gửi tới dịch vụ chỉ đường khi bạn yêu cầu tìm tuyến.</p>
    <div className="route-buttons"><button className="route-calculate" disabled={plan.loading || !plan.stops.length} onClick={onCalculate}>{plan.loading ? 'Đang vẽ đường…' : 'Vẽ đường theo lộ trình'}</button>{plan.stops.length > 0 && <button onClick={plan.clear}>Xóa lộ trình</button>}</div>
    {plan.waitingForGps && <p className="route-hint" role="status">Đang chờ vị trí GPS. Sau khi bạn cấp quyền, tuyến sẽ tự hiển thị.</p>}
    {plan.error && <p className="route-error" role="alert">{plan.error}</p>}
    {plan.loading && <p className="route-hint" role="status">Đang tính đường qua các điểm dừng theo thứ tự đã chọn…</p>}
    {plan.route && <section className="route-result" aria-label="Kết quả chỉ đường">
      <p className="route-hint">Từ {plan.route.originLabel} · Tính lúc {new Date(plan.route.calculatedAt).toLocaleTimeString('vi-VN')}</p>
      <p className="route-hint">Thời gian ước tính, chưa có giao thông trực tiếp. Tuyến không tự tính lại khi bạn di chuyển.</p>
      {plan.route.legs.map((leg, index) => <details key={index} open={index === 0}>
        <summary>Chặng {index + 1}: {plan.stops[index]?.name} <span>{formatDistance(leg.distance)}</span></summary>
        <ol className="route-instructions">{leg.steps.map((step, stepIndex) => <li key={stepIndex}><span>{step.instruction}</span><small>{formatDistance(step.distance)}</small></li>)}</ol>
      </details>)}
      <p className="route-attribution">Tuyến đường: Valhalla · Dữ liệu © OpenStreetMap contributors</p>
    </section>}
    {orderOpen && <RouteStopOrderDialog stops={plan.stops} originLabel={plan.originId === 'gps' ? 'Vị trí GPS của bạn' : pois.find(poi => poi.id === plan.originId)?.name ?? 'Điểm xuất phát'} onApply={ids => { const valid = plan.reorderStops(ids); if (valid) onShowRoute(); return valid; }} onClose={() => setOrderOpen(false)} />}
  </section>;
}
