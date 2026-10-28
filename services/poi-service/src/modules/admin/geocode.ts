export interface AddressMatch { label: string; latitude: number; longitude: number }
export type AddressLookup = (address: string) => Promise<AddressMatch[]>;

// One shared limiter/cache for the local POI service. Multi-instance deployments
// must use a shared limiter or a dedicated geocoding provider.
export function createAddressLookup(fetcher: typeof fetch = fetch): AddressLookup {
  const cache = new Map<string, { expires: number; data: AddressMatch[] }>();
  const pending = new Map<string, Promise<AddressMatch[]>>();
  let tail: Promise<void> = Promise.resolve();
  let lastStart = 0;
  const execute = async (address: string, key: string): Promise<AddressMatch[]> => {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>(resolve => { release = resolve; });
    try {
      await previous;
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 1000 - (Date.now() - lastStart))));
      lastStart = Date.now();
      const url = new URL(process.env.PHOTON_SEARCH_URL || 'https://photon.komoot.io/api/');
      url.search = new URLSearchParams({ q: address.trim(), limit: '5', countrycode: 'VN' }).toString();
      const response = await fetcher(url, { headers: { 'User-Agent': 'Vinlook/0.1 (https://github.com/Dihoccode1/Vinlook)' }, signal: AbortSignal.timeout(6000), redirect: 'error' });
      if (!response.ok) throw new Error('GEOCODE_UNAVAILABLE');
      const body = await response.json() as { features?: unknown };
      const rows = body?.features;
      if (!Array.isArray(rows)) throw new Error('GEOCODE_UNAVAILABLE');
      const houseNumber = address.trim().match(/^(\d+[a-zA-Z]?(?:[\/-]\d+[a-zA-Z]?)*)(?=\s|,|$)/)?.[1]?.toLowerCase();
      const data: AddressMatch[] = rows.flatMap(row => {
        const p = row?.properties, coordinates = row?.geometry?.coordinates;
        if (!p || typeof p.countrycode !== 'string' || p.countrycode.toUpperCase() !== 'VN' || !Array.isArray(coordinates)) return [];
        if (houseNumber && String(p.housenumber ?? '').toLowerCase() !== houseNumber) return [];
        const [longitude, latitude] = coordinates;
        if (typeof latitude !== 'number' || typeof longitude !== 'number') return [];
        const label = [...new Set([p.name, [p.housenumber, p.street].filter(Boolean).join(' '), p.district, p.city, p.state, p.country].filter(value => typeof value === 'string' && value))].join(', ');
        if (!label) return [];
        return Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180
          ? [{ label, latitude, longitude }] : [];
      }).slice(0, 5);
      if (cache.size >= 256) cache.delete(cache.keys().next().value!);
      cache.set(key, { expires: Date.now() + 86400000, data });
      return data;
    } finally { release(); }
  };
  return async address => {
    const key = address.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.data;
    const existing = pending.get(key);
    if (existing) return existing;
    // At most one active request plus one waiting, within the gateway timeout.
    if (pending.size >= 2) throw new Error('GEOCODE_BUSY');
    const operation = execute(address, key);
    pending.set(key, operation);
    try {
      return await operation;
    } finally { pending.delete(key); }
  };
}
export const lookupAddress = createAddressLookup();
