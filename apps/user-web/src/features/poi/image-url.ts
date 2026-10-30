export const placeholder_image = '/images/poi-placeholder.svg';

export function https_url(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function poi_image_url(value: string | null | undefined): string {
  if (value && /^\/api\/pois\/POI[0-9]{3,20}\/image$/.test(value)) return value;
  if (value && /^\/images\/[a-zA-Z0-9/_.-]+$/.test(value)) return value;
  return https_url(value) ?? placeholder_image;
}
