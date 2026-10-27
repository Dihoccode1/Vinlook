import { useState } from 'react';
import { placeholderImage, poiImageUrl } from './image-url';

interface Props { src: string | null; name: string; className?: string; lazy?: boolean }

export function PoiImage({ src, name, className, lazy = true }: Props) {
  const source = poiImageUrl(src);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const fallback = source === placeholderImage || source === failedSource;
  return <img className={className} src={fallback ? placeholderImage : source}
    alt={fallback ? `${name} — chưa có ảnh` : `Ảnh ${name}`}
    loading={lazy ? 'lazy' : 'eager'} decoding="async" referrerPolicy="no-referrer"
    onError={() => { if (!fallback) setFailedSource(source); }} />;
}
