// Synthetic HTTP-shaped readbacks; no real account, POI, token, audio or provider.
import { registryAt } from '../inventory.mjs';
export const registry = registryAt();
export const ids = Object.freeze({ poi: '000000000000000000000001', revision: '000000000000000000000011',
  job: '000000000000000000000021', otherJob: '000000000000000000000022', request: '00000000-0000-4000-8000-000000000001',
  key: '00000000-0000-4000-8000-000000000002', secondKey: '00000000-0000-4000-8000-000000000003',
  attempt: '00000000-0000-4000-8000-000000000004' });
export const fixtureOrigin = 'https://content.example.invalid';
export const fixtureNow = Date.parse('2026-10-26T00:00:00.000Z');
export const envelope = data => ({ data, requestId: ids.request });
export function makeSnapshot({ approved = [], current = [], editVersion = 4 } = {}) {
  const sourceTextEN = 'Synthetic source narration. This is not tourist content.';
  const codes = [...new Set(['en', ...approved, ...current])];
  return envelope({ poi: { id: ids.poi, deletedAt: null, mutationVersion: 3 }, publishedRevision: null,
    workingRevision: { id: ids.revision, poiId: ids.poi, status: 'draft', sourceVersion: 1, editVersion, sourceTextEN },
    localizedContents: codes.map(languageCode => ({ revisionId: ids.revision, languageCode, sourceVersion: 1, textVersion: 1,
      text: languageCode === 'en' ? sourceTextEN : `Synthetic ${languageCode} text, not a translation.`,
      reviewStatus: approved.includes(languageCode) ? 'approved' : 'pending',
      audioAsset: approved.includes(languageCode) || current.includes(languageCode) ? {
        publicId: 'synthetic/no-upload', url: 'https://assets.example.invalid/synthetic.mp3', format: 'mp3', textVersion: 1,
        registryVersion: registry.registryVersion, voiceOrModelId: registry.profiles[languageCode].id } : null,
      durationSeconds: approved.includes(languageCode) || current.includes(languageCode) ? 120 : null })) });
}
export function makeJob(plan) {
  return envelope({ id: ids.job, poiId: ids.poi, revisionId: ids.revision, languageCode: plan.selection.locale,
    taskType: plan.selection.taskType, status: 'queued', inputVersion: structuredClone(plan.selection.inputVersion), retryCount: 0 });
}
export function makeClaim(plan, snapshot) {
  const row = snapshot.data.localizedContents.find(row => row.languageCode === plan.selection.locale);
  return { id: ids.job, languageCode: plan.selection.locale, taskType: 'audio', retryCount: 0,
    inputVersion: structuredClone(plan.selection.inputVersion), attemptId: ids.attempt,
    leaseExpiresAt: new Date(fixtureNow + 300000).toISOString(),
    inputSnapshot: { text: row.text, execution: 'local_worker', registryVersion: registry.registryVersion, modelId: plan.selection.modelId } };
}
export function fakeTransport(plan, snapshot, { mutateJob, postError, claim, preflightError } = {}) {
  const calls = [];
  return { origin: fixtureOrigin, calls, async request(request) {
    const { signal, ...wire } = request;
    calls.push(structuredClone(wire));
    if (preflightError && request.method === 'GET') throw new Error('synthetic-private-token-and-provider-body');
    if (request.method === 'POST') {
      if (postError) throw new Error('synthetic-private-token-and-provider-body');
      if (plan.operation === 'worker_claim') return { status: 200, body: envelope({ job: claim === undefined ? makeClaim(plan, snapshot) : claim }) };
      return { status: 202, body: envelope({ poiId: ids.poi, revisionId: ids.revision, jobIds: [ids.job], status: 'queued' }) };
    }
    if (request.path === `/api/v1/admin/pois/${ids.poi}`) return { status: 200, body: structuredClone(snapshot) };
    if (request.path === `/api/v1/admin/jobs/${ids.job}`) {
      const job = makeJob(plan); if (mutateJob) mutateJob(job.data);
      return { status: 200, body: job };
    }
    throw new Error('Unexpected fixture request');
  } };
}
