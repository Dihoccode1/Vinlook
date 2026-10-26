import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, dirname, join } from 'node:path';
import { registryAt, repositoryRoot } from './inventory.mjs';

const registry = registryAt();
const objectId = /^[a-f0-9]{24}$/, uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export class RunnerFailure extends Error {
  constructor(code) { super(code); this.code = code; }
}
const fail = code => { throw new RunnerFailure(code); };
const integer = (value, min = 0) => Number.isSafeInteger(value) && value >= min;
const hash = value => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const equal = (a, b) => canonical(a) === canonical(b);
const digest = value => hash(canonical(value));
const textHash = value => typeof value === 'string' && value.trim() && value.length <= 20000 ? hash(value) : fail('INVALID_SNAPSHOT');
const freeze = value => { if (value && typeof value === 'object') { for (const item of Object.values(value)) freeze(item); Object.freeze(value); } return value; };
function origin(value) {
  let url; try { url = new URL(value); } catch { fail('INVALID_ORIGIN'); }
  if (url.protocol !== 'https:' || url.origin !== value || url.username || url.password) fail('INVALID_ORIGIN');
  return value;
}
function inputVersion(value) {
  if (!value || !equal(Object.keys(value).sort(), ['sourceVersion', 'targetSourceVersion', 'targetTextVersion', 'textVersion'].sort())
    || !integer(value.sourceVersion, 1) || ['textVersion', 'targetSourceVersion', 'targetTextVersion'].some(key => value[key] !== null && !integer(value[key], 1))) fail('INVALID_JOB');
  return value;
}
function readSnapshot(snapshot, locale) {
  const data = snapshot?.data, poi = data?.poi, revision = data?.workingRevision;
  if (!poi || !objectId.test(poi.id) || poi.deletedAt !== null || !revision || !objectId.test(revision.id)
    || revision.poiId !== poi.id || revision.status !== 'draft' || !integer(revision.editVersion)
    || !integer(revision.sourceVersion, 1) || !Array.isArray(data.localizedContents) || data.localizedContents.length > 16) fail('INVALID_SNAPSHOT');
  const codes = new Set();
  for (const row of data.localizedContents) {
    if (!registry.locales.includes(row.languageCode) || codes.has(row.languageCode) || row.revisionId !== revision.id
      || !integer(row.sourceVersion, 1) || !integer(row.textVersion, 1)
      || !['pending', 'approved', 'changes_required'].includes(row.reviewStatus)) fail('INVALID_SNAPSHOT');
    codes.add(row.languageCode);
  }
  const en = data.localizedContents.find(row => row.languageCode === 'en');
  if (!en || en.sourceVersion !== revision.sourceVersion || en.text !== revision.sourceTextEN) fail('INVALID_SNAPSHOT');
  return { poi, revision, row: data.localizedContents.find(row => row.languageCode === locale) ?? null };
}

/** Plan is derived from an explicit private readback, never journal IDs or historical inventory. */
export function preparePlan({ contentOrigin, poiRef, locale, operation = 'queue', snapshot, job = null, workerId = null, key = randomUUID() }) {
  origin(contentOrigin);
  if (!/^POI-(?:00[1-9]|01[0-5])$/.test(poiRef) || !registry.locales.includes(locale) || !uuid.test(key)) fail('INVALID_SELECTION');
  if (operation === 'dispatch') fail('TARGETED_DISPATCH_UNSUPPORTED');
  if (!['queue', 'worker_claim'].includes(operation)) fail('INVALID_OPERATION');
  if (operation === 'queue' && (job !== null || workerId !== null)) fail('INVALID_SELECTION');
  const { poi, revision, row } = readSnapshot(snapshot, locale), profile = registry.profiles[locale];
  const currentText = row && row.sourceVersion === revision.sourceVersion && typeof row.text === 'string' && Boolean(row.text.trim());
  const currentAudio = currentText && row.audioAsset && row.audioAsset.textVersion === row.textVersion
    && row.audioAsset.registryVersion === registry.registryVersion && row.audioAsset.voiceOrModelId === profile.id
    && Number.isFinite(row.durationSeconds) && row.durationSeconds >= 90 && row.durationSeconds <= 150;
  const taskType = currentText ? 'audio' : 'translation';
  const version = { sourceVersion: revision.sourceVersion, textVersion: taskType === 'audio' ? row.textVersion : null,
    targetTextVersion: taskType === 'translation' ? row?.textVersion ?? null : null,
    targetSourceVersion: taskType === 'translation' ? row?.sourceVersion ?? null : null };
  const selection = { poiRef, poiId: poi.id, revisionId: revision.id, locale, taskType,
    expectedEditVersion: revision.editVersion, sourceVersion: revision.sourceVersion,
    sourceTextSha256: textHash(revision.sourceTextEN), textVersion: row?.textVersion ?? null,
    textSha256: row?.text ? textHash(row.text) : null, inputVersion: version,
    registryVersion: registry.registryVersion, modelId: taskType === 'translation' ? registry.translationModel : profile.id,
    execution: taskType === 'translation' ? 'server_adapter' : profile.execution };
  let request = null, expectedJobId = null, retryCount = null;
  const skipReason = currentAudio ? row.reviewStatus === 'approved' ? 'ALREADY_APPROVED_CURRENT' : 'HUMAN_REVIEW_PENDING_CURRENT_OUTPUT' : null;
  if (!skipReason && operation === 'queue') request = { method: 'POST', path: `/api/v1/admin/revisions/${revision.id}/process`,
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    bodyText: JSON.stringify({ expectedEditVersion: revision.editVersion, languages: [locale] }) };
  if (!skipReason && operation === 'worker_claim') {
    if (selection.execution !== 'local_worker' || taskType !== 'audio') fail('LOCAL_AUDIO_ONLY');
    if (typeof workerId !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(workerId)) fail('INVALID_WORKER');
    const value = job?.data;
    if (!value || !objectId.test(value.id) || value.poiId !== poi.id || value.revisionId !== revision.id
      || value.languageCode !== locale || value.taskType !== 'audio' || value.status !== 'queued'
      || !equal(inputVersion(value.inputVersion), version) || !integer(value.retryCount)) fail('JOB_SELECTION_MISMATCH');
    expectedJobId = value.id; retryCount = value.retryCount;
    request = { method: 'POST', path: '/api/v1/internal/jobs/claim', headers: { 'Content-Type': 'application/json' },
      bodyText: JSON.stringify({ workerId, capabilities: [locale] }) };
  }
  const core = { schemaVersion: 1, contentOrigin, operation, selection, expectedJobId, retryCount, workerId, skipReason, request };
  // Exclude key/header only from the reservation scope so changing key cannot resend the same target/version.
  const scopeHash = digest({ ...core, request: request ? { method: request.method, path: request.path, bodyText: request.bodyText } : null });
  return freeze({ ...core, scopeHash, planHash: digest({ ...core, scopeHash }) });
}

function validatePlan(plan) {
  if (!plan || plan.schemaVersion !== 1) fail('INVALID_PLAN');
  const { planHash, scopeHash, ...core } = plan;
  if (planHash !== digest({ ...core, scopeHash }) || scopeHash !== digest({ ...core, request: core.request ? {
    method: core.request.method, path: core.request.path, bodyText: core.request.bodyText } : null })) fail('PLAN_TAMPERED');
  origin(plan.contentOrigin);
  if (!registry.locales.includes(plan.selection?.locale) || !['queue', 'worker_claim'].includes(plan.operation)) fail('INVALID_PLAN');
}

const inside = (root, path) => { const rel = relative(root, path); return rel === '' || rel.split(/[\\/]/)[0] !== '..' && !isAbsolute(rel); };
export async function assertPrivatePath(path, root = repositoryRoot) {
  const target = resolve(path), repo = await realpath(root);
  if (inside(repo, target)) fail('PRIVATE_PATH_REQUIRED');
  // Refuse other Git checkouts too, including worktree .git files and symlink destinations.
  let cursor = target;
  for (;;) {
    let actual;
    try { actual = await realpath(cursor); }
    catch (error) { if (!['ENOENT', 'ENOTDIR'].includes(error.code)) fail('PRIVATE_PATH_UNAVAILABLE'); }
    if (actual) {
      if (inside(repo, actual)) fail('PRIVATE_PATH_REQUIRED');
      try { await stat(join(actual, '.git')); fail('PRIVATE_PATH_REQUIRED'); }
      catch (error) { if (error instanceof RunnerFailure) throw error; if (!['ENOENT', 'ENOTDIR'].includes(error.code)) fail('PRIVATE_PATH_UNAVAILABLE'); }
    }
    const parent = dirname(actual ?? cursor);
    if (parent === cursor || parent === actual) break;
    cursor = parent;
  }
  return target;
}

/** Exclusive, append-only, fsynced receipt. Never automatically delete/replay even after a known failure. */
export class ReceiptJournal {
  constructor(directory, root = repositoryRoot) { this.directory = resolve(directory); this.root = root; }
  async reserve(plan) {
    validatePlan(plan);
    await assertPrivatePath(this.directory, this.root);
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const dir = await realpath(this.directory);
    await assertPrivatePath(dir, this.root);
    let file;
    try { file = await open(resolve(dir, `${plan.scopeHash}.jsonl`), 'wx', 0o600); }
    catch (error) { fail(error.code === 'EEXIST' ? 'RECEIPT_ALREADY_EXISTS_NO_RESEND' : 'RECEIPT_UNAVAILABLE'); }
    let sequence = 0;
    const append = async state => {
      if (!['reserved', 'mutation_started', 'response_received', 'verified', 'no_job', 'readback_mismatch', 'outcome_unknown'].includes(state)) fail('INVALID_RECEIPT_STATE');
      try {
        await file.writeFile(`${JSON.stringify({ schemaVersion: 1, sequence: sequence++, state, planHash: plan.planHash,
          scopeHash: plan.scopeHash, operation: plan.operation, locale: plan.selection.locale, at: new Date().toISOString() })}\n`);
        await file.sync();
      } catch { fail('RECEIPT_PERSISTENCE_FAILED'); }
    };
    try { await append('reserved'); } catch (error) { await file.close(); throw error; }
    return { append, close: () => file.close() };
  }
}

/** Transport is injected. This slice ships no live HTTP/login/worker/provider adapter or execute CLI. */
export async function runOnce(plan, { transport, journal, now = Date.now, timeoutMs = 15000 }) {
  try { plan = freeze(structuredClone(plan)); } catch { fail('INVALID_PLAN'); }
  validatePlan(plan);
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 15000) fail('INVALID_DEADLINE');
  if (!transport || transport.origin !== plan.contentOrigin || typeof transport.request !== 'function') fail('TRANSPORT_TARGET_MISMATCH');
  const request = transport.request.bind(transport);
  const send = async value => {
    const controller = new AbortController();
    let timer;
    try {
      const timeout = new Promise((_resolve, reject) => { timer = setTimeout(() => {
        controller.abort(); reject(new Error('bounded request timeout'));
      }, timeoutMs); });
      // AbortSignal has mutable platform state; freeze the wire object, never the signal itself.
      return await Promise.race([request(Object.freeze({ ...value, signal: controller.signal })), timeout]);
    } finally { clearTimeout(timer); }
  };
  const get = async path => {
    try {
      const result = await send(freeze({ method: 'GET', path, headers: {}, bodyText: null }));
      if (!result || !Number.isInteger(result.status) || !result.body || !uuid.test(result.body.requestId)) fail('READBACK_UNAVAILABLE');
      return result;
    }
    catch { fail('READBACK_UNAVAILABLE'); }
  };
  const snapshot = await get(`/api/v1/admin/pois/${plan.selection.poiId}`);
  const job = plan.expectedJobId ? await get(`/api/v1/admin/jobs/${plan.expectedJobId}`) : null;
  const fresh = preparePlan({ contentOrigin: plan.contentOrigin, poiRef: plan.selection.poiRef, locale: plan.selection.locale,
    operation: plan.operation, snapshot: snapshot.body, job: job?.body ?? null, workerId: plan.workerId,
    key: plan.request?.headers['Idempotency-Key'] ?? '00000000-0000-4000-8000-000000000001' });
  if (snapshot.status !== 200 || job && job.status !== 200 || !equal(fresh.selection, plan.selection)
    || fresh.skipReason !== plan.skipReason || fresh.expectedJobId !== plan.expectedJobId || fresh.retryCount !== plan.retryCount) fail('STALE_PLAN');
  if (plan.skipReason) return { state: 'skipped', reason: plan.skipReason, planHash: plan.planHash };
  if (!journal || typeof journal.reserve !== 'function') fail('RECEIPT_REQUIRED');
  let receipt;
  try { receipt = await journal.reserve(plan); }
  catch (error) { throw error instanceof RunnerFailure ? error : new RunnerFailure('RECEIPT_UNAVAILABLE'); }
  const record = async state => { try { await receipt.append(state); } catch { fail('RECEIPT_PERSISTENCE_FAILED'); } };
  let started = false;
  try {
    // Reconstruct the approved operation from fresh readback; reject a forged endpoint/body, even if rehashed.
    if (!equal(fresh.request, plan.request)) fail('PLAN_REQUEST_MISMATCH');
    await record('mutation_started'); started = true;
    const response = await send(plan.request);
    await record('response_received');
    if (!response?.body || !uuid.test(response.body.requestId)) fail('READBACK_MISMATCH');
    if (plan.operation === 'queue') {
      const data = response.body?.data;
      if (response.status !== 202 || data?.poiId !== plan.selection.poiId || data?.revisionId !== plan.selection.revisionId
        || data.status !== 'queued' || !Array.isArray(data.jobIds) || data.jobIds.length !== 1 || !objectId.test(data.jobIds[0])) fail('READBACK_MISMATCH');
      const readback = await get(`/api/v1/admin/jobs/${data.jobIds[0]}`), actual = readback.body?.data;
      if (readback.status !== 200 || actual?.id !== data.jobIds[0] || actual.poiId !== plan.selection.poiId
        || actual.revisionId !== plan.selection.revisionId || actual.languageCode !== plan.selection.locale
        || actual.taskType !== plan.selection.taskType || !equal(actual.inputVersion, plan.selection.inputVersion)
        || !['queued', 'running', 'succeeded', 'failed', 'waiting_quota'].includes(actual.status)) fail('READBACK_MISMATCH');
    } else {
      const actual = response.body?.data?.job;
      if (response.status !== 200) fail('READBACK_MISMATCH');
      if (actual === null) { await record('no_job'); return { state: 'no_job', planHash: plan.planHash }; }
      if (!actual || actual.id !== plan.expectedJobId || actual.languageCode !== plan.selection.locale || actual.taskType !== 'audio'
        || !equal(actual.inputVersion, plan.selection.inputVersion) || actual.retryCount !== plan.retryCount
        || !uuid.test(actual.attemptId) || !Number.isFinite(Date.parse(actual.leaseExpiresAt)) || Date.parse(actual.leaseExpiresAt) <= now()
        || actual.inputSnapshot?.registryVersion !== plan.selection.registryVersion || actual.inputSnapshot.modelId !== plan.selection.modelId
        || actual.inputSnapshot.execution !== 'local_worker' || textHash(actual.inputSnapshot.text) !== plan.selection.textSha256) fail('READBACK_MISMATCH');
    }
    await record('verified');
    return { state: 'verified', planHash: plan.planHash }; // No inference/upload/publish is performed here.
  } catch (error) {
    if (started) await record(error instanceof RunnerFailure && error.code === 'READBACK_MISMATCH' ? 'readback_mismatch' : 'outcome_unknown');
    throw error instanceof RunnerFailure ? error : new RunnerFailure(started ? 'OUTCOME_UNKNOWN_NO_RESEND' : 'RUNNER_UNAVAILABLE');
  } finally { try { await receipt.close(); } catch { fail('RECEIPT_CLOSE_FAILED'); } }
}
