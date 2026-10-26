import { isIP } from 'node:net';
import { loadAuthorizationConfig } from './authorization.js';
export class UsageConfigurationError extends Error {
  constructor(field) { super(`Invalid Usage configuration: ${field}`); this.name = 'UsageConfigurationError'; this.code = 'INVALID_USAGE_CONFIG'; }
}
const invalid = field => { throw new UsageConfigurationError(field); };
export function canonicalOrigin(value, mode, field) {
  let url; try { url = new URL(value); } catch { invalid(field); }
  const loopback = ['localhost', '[::1]'].includes(url.hostname) || isIP(url.hostname) === 4 && url.hostname.startsWith('127.');
  if (url.origin !== value || url.username || url.password || !(url.protocol === 'https:' || mode !== 'production' && url.protocol === 'http:' && loopback)) invalid(field);
  return value;
}
export function loadUsageBusinessConfig(mode, environment = process.env) {
  if (environment.USAGE_MONGODB_URI === undefined) return null;
  const uri = environment.USAGE_MONGODB_URI; let url;
  try { url = new URL(uri); } catch { invalid('USAGE_MONGODB_URI'); }
  if (!['mongodb:', 'mongodb+srv:'].includes(url.protocol) || url.hash || !url.hostname
    || !(url.pathname === '/vinlook_usage' || mode === 'test' && url.pathname === '/vinlook_usage_poc_test'
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    || [...url.searchParams.keys()].some(key => !['replicaSet', 'directConnection', 'authSource', 'tls', 'retryWrites', 'w', 'appName'].includes(key))
    || mode === 'production' && (url.protocol === 'mongodb:' && url.searchParams.get('tls') !== 'true'
      || url.searchParams.has('tls') && url.searchParams.get('tls') !== 'true')) invalid('USAGE_MONGODB_URI');
  const authorization = loadAuthorizationConfig(mode, environment);
  const contentCallerKey=environment.USAGE_CONTENT_CALLER_KEY_B64URL;
  if(contentCallerKey!==undefined&&(!/^[A-Za-z0-9_-]{43}$/.test(contentCallerKey)
    ||Buffer.from(contentCallerKey,'base64url').toString('base64url')!==contentCallerKey
    ||contentCallerKey===environment.USAGE_IDENTITY_SERVICE_KEY_B64URL))invalid('USAGE_CONTENT_CALLER_KEY_B64URL');
  const contentOrigin = canonicalOrigin(environment.CONTENT_BASE_URL, mode, 'CONTENT_BASE_URL');
  const rawOrigins = environment.USAGE_ALLOWED_ORIGINS;
  if (typeof rawOrigins !== 'string' || !rawOrigins.length || rawOrigins.length > 8192) invalid('USAGE_ALLOWED_ORIGINS');
  const origins = [...new Set(rawOrigins.split(',').map(value => canonicalOrigin(value.trim(), mode, 'USAGE_ALLOWED_ORIGINS')))];
  if (origins.length > 32) invalid('USAGE_ALLOWED_ORIGINS');
  return Object.freeze({ uri, authorization, contentOrigin, contentCallerKey, origins: Object.freeze(origins), mode }); // Private; never log/serialize.
}
