export const placeholderImage = '/images/poi-placeholder.svg';

export function httpsUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function poiImageUrl(value: string | null | undefined): string {
  if (value && /^\/api\/pois\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/image$/.test(value)) return value;
  if (value && /^\/images\/[a-zA-Z0-9/_.-]+$/.test(value)) return value;
  return httpsUrl(value) ?? placeholderImage;
}
