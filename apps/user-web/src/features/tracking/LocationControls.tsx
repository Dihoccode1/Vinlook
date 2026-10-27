import type { TrackingSnapshot } from './location-tracker';

interface Props extends TrackingSnapshot {
  stale: boolean;
  onLocate: () => void;
}

export function LocationControls({ status, active, position, stale, error, onLocate }: Props) {
  return <section className="location-controls" aria-label="Định vị của bạn">
    <div className="location-title"><span className={`location-dot ${active && !stale && position ? 'enabled' : ''}`} /><strong>Vị trí của bạn</strong><span className="location-mode">GPS</span></div>
    <div className="location-status" role="status">
      {error ? <p className="location-error">{error}</p>
        : status === 'locating' ? <p>Đang xin quyền và chờ vị trí từ thiết bị…</p>
          : position ? <p>{stale ? 'Vị trí cũ · đang chờ cập nhật' : 'Đang cập nhật vị trí'}<br /><span>Sai số khoảng {Math.round(position.accuracy)} m · Lúc {new Date(position.timestamp).toLocaleTimeString('vi-VN')}</span></p>
            : <p>Bấm “Về vị trí của tôi” để xác định vị trí trên bản đồ.</p>}
    </div>
    <div className="location-actions">
      <button className="location-locate" onClick={onLocate}>Về vị trí của tôi</button>
    </div>
    <p className="location-note">Sau khi cấp quyền, GPS được giữ đến khi đóng tab.</p>
  </section>;
}
