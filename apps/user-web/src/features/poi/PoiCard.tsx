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
    <button
      className={`poi-card ${selected?.id === poi.id ? 'selected' : ''}`}
      onClick={() => select(poi)}
    >
      <PoiImage class_name="poi-list-photo" src={poi.image_url} name={poi.name} />
      <span className="poi-content">
        <span className="category">{categories[poi.category] ?? poi.category}</span>
        <strong>{poi.name}</strong>
        <span className="address">{poi.address}</span>
        <span className={`poi-distance${distance_meters === null ? ' unavailable' : ''}`}>
          {distance_meters === null
            ? 'Cần GPS để tính khoảng cách'
            : `Cách bạn ${(distance_meters / 1000).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} km`}
        </span>
      </span>
      <span className="arrow" aria-hidden="true">
        ↗
      </span>
    </button>
  );
}
