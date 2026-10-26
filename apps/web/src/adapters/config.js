import { publicOrigin, ApiError } from './http.js';

// Explicit public names only; never pass import.meta.env wholesale to a service.
export function readPublicConfig(env, { development = false } = {}) {
  if (env.VITE_POC_FIXTURE && (!development || env.VITE_POC_FIXTURE !== 'labelled-local')) {
    throw new ApiError('FIXTURE_FORBIDDEN');
  }
  return Object.freeze({
    identityOrigin: publicOrigin(env.VITE_IDENTITY_ORIGIN),
    contentOrigin: publicOrigin(env.VITE_CONTENT_ORIGIN),
    usageOrigin: publicOrigin(env.VITE_USAGE_ORIGIN),
    fixture: development && env.VITE_POC_FIXTURE === 'labelled-local',
  });
}
