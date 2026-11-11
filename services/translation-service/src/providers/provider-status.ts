import { TranslationError, type TranslationProvider } from '../modules/translations/types.js';
import type { TtsProvider } from './tts-types.js';

type ProviderStatus = 'unknown' | 'available' | 'limited' | 'unconfigured' | 'error';
interface Observation {
  id: string;
  name: string;
  kind: 'translation' | 'tts';
  configured: boolean;
  status: ProviderStatus;
  checked_at: string | null;
}
const observations = new Map<string, Observation>();
function register(name: string, kind: Observation['kind'], configured: boolean) {
  const id = `${kind}:${name}`;
  observations.set(id, {
    id,
    name,
    kind,
    configured,
    status: configured ? 'unknown' : 'unconfigured',
    checked_at: null,
  });
  return id;
}
export function provider_snapshot(now = Date.now()) {
  return [...observations.values()]
    .filter((item) => item.configured)
    .map((item) => ({
      ...item,
      status:
        item.checked_at && now - Date.parse(item.checked_at) > 600000 ? 'unknown' : item.status,
      remaining: null,
    }));
}
async function observe<T>(id: string, call: () => Promise<T>): Promise<T> {
  const item = observations.get(id)!;
  try {
    const result = await call();
    item.status = 'available';
    item.checked_at = new Date().toISOString();
    return result;
  } catch (error) {
    if (error instanceof TranslationError && error.code === 'UNSUPPORTED_LANGUAGE') throw error;
    item.status =
      error instanceof TranslationError && error.code === 'PROVIDER_QUOTA'
        ? 'limited'
        : error instanceof TranslationError && error.code === 'PROVIDER_NOT_CONFIGURED'
          ? 'unconfigured'
          : 'error';
    item.checked_at = new Date().toISOString();
    throw error;
  }
}
export function track_translation(
  name: string,
  configured: boolean,
  provider: TranslationProvider,
): TranslationProvider {
  const id = register(name, 'translation', configured);
  return { ...provider, translate: (...args) => observe(id, () => provider.translate(...args)) };
}
export function track_tts(name: string, configured: boolean, provider: TtsProvider): TtsProvider {
  const id = register(name, 'tts', configured);
  return { ...provider, generate: (...args) => observe(id, () => provider.generate(...args)) };
}
