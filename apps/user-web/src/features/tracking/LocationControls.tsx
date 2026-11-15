import type { TrackingSnapshot } from './location-tracker';
import { cn } from '@vinlook/ui/utils';

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
      className="absolute top-[25px] right-[25px] z-[450] w-max max-w-[calc(100%-30px)] rounded-xl bg-[#fffef9f5] shadow-[0_4px_20px_#16342616] max-[760px]:top-3 max-[760px]:right-3"
      aria-label="Định vị của bạn"
    >
      <button
        type="button"
        onClick={on_locate}
        title={error || 'Về vị trí của tôi'}
        className="flex min-h-11 items-center gap-[9px] rounded-xl px-[13px] py-[9px] text-xs font-semibold text-primary transition-colors hover:bg-[#edf3e8]"
      >
        <span className="text-[23px] leading-none font-normal" aria-hidden="true">
          ⌖
        </span>
        <span>Về vị trí của tôi</span>
        <span
          className={cn(
            'size-[7px] shrink-0 rounded-full bg-[#a9b2a3]',
            active && !stale && position && 'bg-[#2477d5] shadow-[0_0_0_3px_#2477d519]',
          )}
          aria-hidden="true"
        />
      </button>
      {message && (
        <span
          className={cn(
            'block max-w-[210px] px-[13px] pb-[9px] text-[10px] leading-[1.5] text-[#788873]',
            error && 'text-[#9d4c37]',
          )}
          role={error ? 'alert' : 'status'}
          aria-label={error || undefined}
        >
          {message}
        </span>
      )}
    </section>
  );
}
