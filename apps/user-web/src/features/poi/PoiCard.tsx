import { Button } from '@vinlook/ui/button';
import type { Poi } from '../../types/poi';
import { PoiImage } from './PoiImage';
interface Props {
  poi: Poi;
  selected: Poi | null;
  distance_meters: number | null;
  categories: Record<string, string>;
  select: (poi: Poi) => void;
}
export function PoiCard({ poi, selected, distance_meters, categories, select }: Props) {
  return (
    <Button
      variant="custom"
      type="submit"
      className={`poi-card w-full flex items-center gap-[13px] text-left py-[20px] px-[8px] text-[inherit] ${selected?.id === poi.id ? 'selected' : ''}`}
      onClick={() => select(poi)}
    >
      <PoiImage
        class_name="poi-list-photo w-[64px] h-[64px] flex-[0_0_64px] rounded-[10px] object-cover bg-[#e9eee2] [@media(max-width:_760px)]:w-[56px] [@media(max-width:_760px)]:h-[56px]"
        src={poi.image_url}
        name={poi.name}
      />
      <span className="poi-content flex flex-col gap-[7px] flex-[1]">
        <span className="category text-[9px] uppercase tracking-[1.2px] text-[#81936f]">
          {categories[poi.category] ?? poi.category}
        </span>
        <strong>{poi.name}</strong>
        <span className="address text-[10px] text-[#7d857d] leading-[1.6]">{poi.address}</span>
        <span
          className={`poi-distance inline-block py-[4px] px-[8px] text-[11px] leading-[1.5]${distance_meters === null ? ' unavailable' : ''}`}
        >
          {distance_meters === null
            ? 'Cần GPS để tính khoảng cách'
            : `Cách bạn ${(distance_meters / 1000).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} km`}
        </span>
      </span>
      <span className="arrow text-[#809374] text-[18px]" aria-hidden="true">
        ↗
      </span>
    </Button>
  );
}
