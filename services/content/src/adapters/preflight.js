import { hybrid } from './config.js';
import { boundedJson } from './provider.js';
import { DraftFailure } from '../drafts/validation.js';

// Process-scoped diagnostic admission only; never generation or a quota reservation.
export function createTranslationPreflight(
  config,
  { fetchImpl = fetch, now = Date.now, timeoutMs = 10000 } = {},
) {
  let active = false,
    nextAllowedAt = 0;
  return async () => {
    if (active) throw new DraftFailure('ADAPTER_PREFLIGHT_BUSY', 409);
    if (now() < nextAllowedAt) throw new DraftFailure('ADAPTER_PREFLIGHT_COOLDOWN', 429);
    active = true;
    nextAllowedAt = now() + 60000;
    const signal = AbortSignal.timeout(timeoutMs);
    let httpStatus = null,
      jsonContentType = null;
    const result = (category, extra = {}) => ({
      status: category ? 'failed' : 'ok',
      category,
      httpStatus,
      jsonContentType,
      ...extra,
    });
    try {
      const response = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${hybrid.translationModel}`,
        { method: 'GET', headers: { 'x-goog-api-key': config.key }, redirect: 'error', signal },
      );
      httpStatus = response.status;
      jsonContentType = /^application\/json(?:;|$)/i.test(
        response.headers.get('content-type') ?? '',
      );
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        return result('http');
      }
      const metadata = await boundedJson(response, 65536, signal);
      const modelMatches = metadata?.name === `models/${hybrid.translationModel}`,
        supportsGenerateContent =
          Array.isArray(metadata?.supportedGenerationMethods) &&
          metadata.supportedGenerationMethods.includes('generateContent');
      return result(
        !modelMatches ? 'model_mismatch' : !supportsGenerateContent ? 'method_missing' : null,
        { modelMatches, supportsGenerateContent },
      );
    } catch (error) {
      const allowed = ['nonjson', 'oversize', 'jsonparse', 'response_read'];
      return result(
        signal.aborted
          ? 'timeout'
          : allowed.includes(error?.diagnosticCategory)
            ? error.diagnosticCategory
            : 'transport',
      );
    } finally {
      active = false;
    }
  };
}
