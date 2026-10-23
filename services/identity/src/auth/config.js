import { isIP } from 'node:net';

export class AuthConfigurationError extends Error {
  constructor(field) { super(`Invalid Identity auth configuration: ${field}`); this.name = 'AuthConfigurationError'; }
}

function key(value, field) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new AuthConfigurationError(field);
  const decoded = Buffer.from(value, 'base64url');
  if (decoded.length < 32 || decoded.toString('base64url') !== value) throw new AuthConfigurationError(field);
  return decoded;
}

/** Secret-bearing config: never log or serialize this object. */
export function loadAuthConfig(mode, environment = process.env) {
  const uri = environment.IDENTITY_MONGODB_URI;
  // Explicit Identity-owned database required; never default to admin/test/another service.
  if (typeof uri !== 'string' || !/^mongodb(?:\+srv)?:\/\//.test(uri)) throw new AuthConfigurationError('IDENTITY_MONGODB_URI');
  const database = uri.slice(uri.indexOf('://') + 3).split('?')[0].split('/').slice(1).join('/');
  if (database !== 'vinlook_identity' && !(mode === 'test' && /^vinlook_identity_task00[5678]$/.test(database))) {
    throw new AuthConfigurationError('IDENTITY_MONGODB_URI');
  }
  const jwtKey = key(environment.IDENTITY_JWT_KEY_B64URL, 'IDENTITY_JWT_KEY_B64URL');
  const rateKey = key(environment.IDENTITY_RATE_HMAC_KEY_B64URL, 'IDENTITY_RATE_HMAC_KEY_B64URL');
  if (jwtKey.equals(rateKey)) throw new AuthConfigurationError('IDENTITY_RATE_HMAC_KEY_B64URL');
  const origins = (environment.IDENTITY_ALLOWED_ORIGINS ?? (mode === 'development'
    ? 'http://localhost:5173,http://127.0.0.1:5173' : '')).split(',').map(x => x.trim());
  if (origins.some(origin => {
    try { const url = new URL(origin); return url.origin !== origin || !['http:', 'https:'].includes(url.protocol)
      || (mode === 'production' && url.protocol !== 'https:'); } catch { return true; }
  })) throw new AuthConfigurationError('IDENTITY_ALLOWED_ORIGINS');
  const proxyCidrs = (environment.IDENTITY_TRUST_PROXY_CIDRS ?? '').split(',').map(x => x.trim()).filter(Boolean);
  if (proxyCidrs.some(cidr => {
    const [ip, mask, extra] = cidr.split('/');
    const bits = isIP(ip) === 4 ? 32 : isIP(ip) === 6 ? 128 : 0;
    return !bits || extra !== undefined || !/^\d+$/.test(mask ?? '') || Number(mask) < 1 || Number(mask) > bits;
  })) throw new AuthConfigurationError('IDENTITY_TRUST_PROXY_CIDRS');
  return Object.freeze({ uri, jwtKey, rateKey, origins: Object.freeze(origins), proxyCidrs: Object.freeze(proxyCidrs),
    issuer: `vinlook-identity:${mode}`, audience: `vinlook-staff:${mode}` });
}
