import type { Poi } from '../../types/poi';
import type { useRoutePlan } from './use-route-plan';
import { formatDistance, formatDuration, vehicleLabels, type VehicleProfile } from './types';

interface Props { plan: ReturnType<typeof useRoutePlan>; pois: Poi[]; onExplore: () => void; onCalculate: () => void }

export function RoutePlanner({ plan, pois, onExplore, onCalculate }: Props) {
  return <section className="route-planner" aria-label="Lập lộ trình">
    <span className="eyebrow">HÀNH TRÌNH CỦA BẠN</span>{plan.stops.length ? <h2 className="route-destination-title">Đến {plan.stops.at(-1)?.name}</h2> : <h2>Đi qua những nơi<br />bạn yêu thích.</h2>}
    <label htmlFor="route-origin">Điểm xuất phát</label>
    <select id="route-origin" value={plan.originId} onChange={event => plan.setOriginId(event.target.value)}>
      <option value="gps">Vị trí GPS hiện tại</option>
      {pois.map(poi => <option key={poi.id} value={poi.id}>{poi.name}</option>)}
    </select>
    <div className="vehicle-options" role="group" aria-label="Phương tiện">
      {(Object.keys(vehicleLabels) as VehicleProfile[]).map(mode => <button key={mode} aria-pressed={plan.profile === mode} onClick={() => plan.setProfile(mode)}>{vehicleLabels[mode]}</button>)}
    </div>
    {plan.route && <div className="route-quick-summary" role="status"><span>{vehicleLabels[plan.route.profile]} · {plan.route.profile === 'bus' ? 'Theo lịch trình' : 'Ngắn nhất theo quãng đường'}</span><div className="route-summary"><strong>{formatDistance(plan.route.distance)}</strong><span>Khoảng {formatDuration(plan.route.duration)}</span></div></div>}
    <div className="route-stops-heading"><h3>Điểm dừng · {plan.stops.length}/9</h3><button onClick={onExplore}>+ Thêm POI</button></div>
    {plan.stops.length === 0 ? <p className="route-hint">Chọn địa điểm trên bản đồ rồi bấm “Thêm vào lộ trình”.</p> : <ol className="route-stops">
      {plan.stops.map((poi, index) => <li key={poi.id}>
        <span className="route-stop-number">{index + 1}</span><span className="route-stop-name">{poi.name}</span>
        <div className="route-stop-actions"><button disabled={index === 0} aria-label={`Đưa ${poi.name} lên trước`} onClick={() => plan.moveStop(index, -1)}>↑</button><button disabled={index === plan.stops.length - 1} aria-label={`Đưa ${poi.name} xuống sau`} onClick={() => plan.moveStop(index, 1)}>↓</button><button aria-label={`Xóa ${poi.name} khỏi lộ trình`} onClick={() => plan.removeStop(poi.id)}>×</button></div>
      </li>)}
    </ol>}
    <p className="route-sharing">{plan.profile === 'bus' ? 'Xe buýt công cộng: tìm tuyến, trạm và chuyển tuyến theo lịch trình. Hiện hỗ trợ một điểm đến.' : `Tìm đường ${vehicleLabels[plan.profile].toLowerCase()} ngắn nhất theo quãng đường, giữ thứ tự POI bạn chọn.`} Tọa độ được gửi tới dịch vụ chỉ đường khi bạn yêu cầu tìm tuyến.</p>
    <div className="route-buttons"><button className="route-calculate" disabled={plan.loading || !plan.stops.length} onClick={onCalculate}>{plan.loading ? 'Đang tìm đường…' : 'Tính lại tuyến'}</button>{plan.stops.length > 0 && <button onClick={plan.clear}>Xóa lộ trình</button>}</div>
    {plan.waitingForGps && <p className="route-hint" role="status">Đang chờ vị trí GPS. Sau khi bạn cấp quyền, tuyến sẽ tự hiển thị.</p>}
    {plan.error && <p className="route-error" role="alert">{plan.error}</p>}
    {plan.transitFallbackUrl && <a className="transit-fallback" href={plan.transitFallbackUrl} target="_blank" rel="noopener noreferrer">Xem giao thông công cộng trên Google Maps ↗</a>}
    {plan.loading && <p className="route-hint" role="status">Đang tính đường qua các điểm dừng theo thứ tự đã chọn…</p>}
    {plan.route && <section className="route-result" aria-label="Kết quả chỉ đường">
      <p className="route-hint">Từ {plan.route.originLabel} · Tính lúc {new Date(plan.route.calculatedAt).toLocaleTimeString('vi-VN')}</p>
      <p className="route-hint">Thời gian ước tính, chưa có giao thông trực tiếp. Tuyến không tự tính lại khi bạn di chuyển.</p>
      {plan.route.legs.map((leg, index) => <details key={index} open={index === 0}>
        <summary>Chặng {index + 1}: {plan.stops[index]?.name} <span>{formatDistance(leg.distance)}</span></summary>
        <ol className="route-instructions">{leg.steps.map((step, stepIndex) => <li key={stepIndex}><span>{step.instruction}</span>{step.transit && <div className="bus-step"><strong>Tuyến {step.transit.line}</strong><span>Lên: {step.transit.departureStop ?? 'Theo hướng dẫn tuyến'}</span><span>Xuống: {step.transit.arrivalStop ?? 'Theo hướng dẫn tuyến'}</span>{step.transit.headsign && <span>Hướng: {step.transit.headsign}</span>}</div>}<small>{step.travelMode === 'pedestrian' ? 'Đi bộ · ' : ''}{formatDistance(step.distance)}</small></li>)}</ol>
      </details>)}
      <p className="route-attribution">Tuyến đường: Valhalla · Dữ liệu © OpenStreetMap contributors</p>
    </section>}
  </section>;
}
