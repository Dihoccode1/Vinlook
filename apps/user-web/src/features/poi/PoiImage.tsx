import { useState } from 'react';
import { placeholder_image, poi_image_url } from './image-url';

interface Props { src: string | null; name: string; class_name?: string; lazy?: boolean }

export function PoiImage({ src, name, class_name, lazy = true }: Props) {
  const source = poi_image_url(src);
  const [failed_source, set_failed_source] = useState<string | null>(null);
  const fallback = source === placeholder_image || source === failed_source;
  return <img className={class_name} src={fallback ? placeholder_image : source}
    alt={fallback ? `${name} — chưa có ảnh` : `Ảnh ${name}`}
    loading={lazy ? 'lazy' : 'eager'} decoding="async" referrerPolicy="no-referrer"
    onError={() => { if (!fallback) set_failed_source(source); }} />;
}
