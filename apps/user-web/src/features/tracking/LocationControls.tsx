import { Button } from '@vinlook/ui/button';
import type { TrackingSnapshot } from './location-tracker';

interface Props extends TrackingSnapshot {
  stale: boolean;
  on_locate: () => void;
}

export function LocationControls({
  status,
  active,
  position,
  stale,
  error,
  on_locate: on_locate,
}: Props) {
  const message =
    error ||
    (position && active && stale
      ? 'Vị trí gần nhất · Đang cập nhật'
      : status === 'locating'
        ? 'Đang tìm vị trí…'
        : '');
  return (
    <section
      className="location-controls absolute z-[450] top-[86px] right-[24px] shadow-[0_8px_25px_#12302118] [@media(max-width:_760px)]:top-[65px] [@media(max-width:_760px)]:right-[15px] location-compact"
      aria-label="Định vị của bạn"
    >
      <Button
        variant="custom"
        type="submit"
        className="location-locate"
        onClick={on_locate}
        title={error || 'Về vị trí của tôi'}
      >
        <span className="location-target" aria-hidden="true">
          ⌖
        </span>
        <span>Về vị trí của tôi</span>
        <span
          className={`location-dot w-[7px] h-[7px] rounded-[50%] ${active && !stale && position ? 'enabled' : ''}`}
          aria-hidden="true"
        />
      </Button>
      {message && (
        <span
          className={`location-compact-status block text-[10px] max-w-[210px] leading-[1.5]${error ? ' has-error' : ''}`}
          role={error ? 'alert' : 'status'}
          aria-label={error || undefined}
        >
          {message}
        </span>
      )}
    </section>
  );
}
