import type { TrackingSnapshot } from './location-tracker';

interface Props extends TrackingSnapshot {
  stale: boolean;
  onLocate: () => void;
}

export function LocationControls({ status, active, position, stale, error, onLocate }: Props) {
  const message = error ? 'Chưa lấy được GPS · Thử lại' : status === 'locating' ? 'Đang tìm vị trí…' : stale && position ? 'Vị trí cần cập nhật' : '';
  return <section className="location-controls location-compact" aria-label="Định vị của bạn">
    <button className="location-locate" onClick={onLocate} title={error || 'Về vị trí của tôi'}>
      <span className="location-target" aria-hidden="true">⌖</span>
      <span>Về vị trí của tôi</span>
      <span className={`location-dot ${active && !stale && position ? 'enabled' : ''}`} aria-hidden="true"/>
    </button>
    {message && <span className={`location-compact-status${error ? ' has-error' : ''}`} role={error ? 'alert' : 'status'} aria-label={error || undefined}>{message}</span>}
  </section>;
}
