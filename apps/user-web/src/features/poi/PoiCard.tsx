import type { Poi } from '../../types/poi';
import { PoiImage } from './PoiImage';
import { cn } from '@vinlook/ui/utils';

interface Props {
  poi: Poi;
  selected: Poi | null;
  distance_meters: number | null;
  categories: Record<string, string>;
  select: (poi: Poi) => void;
}

export function PoiCard({ poi, selected, distance_meters, categories, select }: Props) {
  const is_selected = selected?.id === poi.id;
  return (
    <button
      type="button"
      onClick={() => select(poi)}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-[9px] border border-transparent border-b-[#e7ebe3] bg-transparent px-2 py-5 text-left text-inherit transition-colors hover:border-[#d9e4d2] hover:bg-[#edf2e9]',
        is_selected && 'border-[#d9e4d2] bg-[#edf2e9]',
      )}
    >
      <PoiImage
        class_name="size-16 shrink-0 rounded-xl max-[760px]:size-14"
        src={poi.image_url}
        name={poi.name}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[9px] font-medium tracking-[1.2px] text-[#81936f] uppercase">
          {categories[poi.category] ?? poi.category}
        </span>
        <strong className="text-[13px] font-semibold text-foreground">{poi.name}</strong>
        <span className="text-[10px] leading-[1.6] text-[#7d857d]">{poi.address}</span>
        <span
          className={cn(
            'inline-block self-start rounded-md border px-2 py-1 text-[11px] leading-snug',
            distance_meters === null
              ? 'border-[#e0e4d9] bg-[#f2f3ef] font-normal text-[#86917e]'
              : 'border-[#cfdfc6] bg-[#edf5e8] font-semibold text-[#3b713e]',
          )}
        >
          {distance_meters === null
            ? 'Cần GPS để tính khoảng cách'
            : `Cách bạn ${(distance_meters / 1000).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} km`}
        </span>
      </span>
      <span className="shrink-0 text-lg text-[#809374]" aria-hidden="true">
        ↗
      </span>
    </button>
  );
}
