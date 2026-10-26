import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { preparePlan, runOnce, ReceiptJournal, assertPrivatePath, canonical } from '../runner.mjs';
import { repositoryRoot } from '../inventory.mjs';
import { ids, fixtureOrigin, fixtureNow, makeSnapshot, makeJob, makeClaim, fakeTransport } from './fixtures.mjs';

function prepare(snapshot = makeSnapshot(), options = {}) {
  return preparePlan({ contentOrigin: fixtureOrigin, poiRef: 'POI-001', locale: 'zh-Hant', snapshot, key: ids.key, ...options });
}
async function receipts(t) {
  const directory = await mkdtemp(join(tmpdir(), 'vinlook-tu03-receipts-'));
  // Only this exact test-created directory is removed; never a user/private receipt directory.
  t.after(() => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('vinlook-tu03-receipts-'));
    return rm(directory, { recursive: true, force: true });
  });
  return { directory, journal: new ReceiptJournal(directory), events: async () => {
    const files = await readdir(directory);
    return files.length ? (await readFile(join(directory, files[0]), 'utf8')).trim().split('\n').map(line => JSON.parse(line)) : [];
  } };
}
const execute = (plan, transport, journal) => runOnce(plan, { transport, journal, now: () => fixtureNow });
const posts = transport => transport.calls.filter(call => call.method === 'POST');

test('one typed locale binds body/path/readback; zh-Hant launcher cannot send vi', async t => {
  const snapshot = makeSnapshot(), plan = prepare(snapshot), transport = fakeTransport(plan, snapshot), { journal, events } = await receipts(t);
  assert.equal(JSON.parse(plan.request.bodyText).languages[0], 'zh-Hant');
  assert.equal(plan.request.path, `/api/v1/admin/revisions/${ids.revision}/process`);
  assert.equal(Object.isFrozen(plan.request), true);
  assert.equal((await execute(plan, transport, journal)).state, 'verified');
  assert.equal(posts(transport).length, 1);
  assert.deepEqual((await events()).map(item => item.state), ['reserved', 'mutation_started', 'response_received', 'verified']);
});

test('wrong readback language, revision, POI, source version or task fails closed after one mutation', async t => {
  for (const change of [job => { job.languageCode = 'vi'; }, job => { job.revisionId = ids.otherJob; },
    job => { job.poiId = ids.otherJob; }, job => { job.inputVersion.sourceVersion = 2; }, job => { job.taskType = 'audio'; }]) {
    const snapshot = makeSnapshot(), plan = prepare(snapshot), transport = fakeTransport(plan, snapshot, { mutateJob: change }), { journal, events } = await receipts(t);
    await assert.rejects(execute(plan, transport, journal), { code: 'READBACK_MISMATCH' });
    assert.equal(posts(transport).length, 1);
    assert.equal((await events()).at(-1).state, 'readback_mismatch');
    assert.ok(transport.calls.every(call => !call.path.includes('run-next')));
  }
});

test('global server-adapter dispatch is unavailable rather than pretending a selected-locale endpoint exists', () => {
  assert.throws(() => prepare(makeSnapshot(), { operation: 'dispatch' }), { code: 'TARGETED_DISPATCH_UNSUPPORTED' });
  assert.throws(() => prepare(makeSnapshot(), { locale: 'zh-TW' }), { code: 'INVALID_SELECTION' });
  for (const contentOrigin of ['http://localhost:3002', 'https://u:p@content.example.invalid', 'https://content.example.invalid/path', 'https://content.example.invalid?key=synthetic']) {
    assert.throws(() => prepare(makeSnapshot(), { contentOrigin }), { code: 'INVALID_ORIGIN' });
  }
});

test('already-current approved en/vi/zh-Hant and pending-review output are never regenerated', async () => {
  for (const locale of ['en', 'vi', 'zh-Hant']) {
    const snapshot = makeSnapshot({ approved: ['en', 'vi', 'zh-Hant'] }), before = structuredClone(snapshot);
    const plan = prepare(snapshot, { locale }), transport = fakeTransport(plan, snapshot);
    assert.equal(plan.request, null); assert.equal(plan.skipReason, 'ALREADY_APPROVED_CURRENT');
    assert.equal((await execute(plan, transport)).state, 'skipped');
    assert.equal(posts(transport).length, 0); assert.deepEqual(snapshot, before);
  }
  assert.equal(prepare(makeSnapshot({ current: ['zh-Hant'] })).skipReason, 'HUMAN_REVIEW_PENDING_CURRENT_OUTPUT');
});

test('stale draft version or changed source blocks before receipt/mutation', async t => {
  const snapshot = makeSnapshot(), plan = prepare(snapshot), changed = makeSnapshot({ editVersion: 5 });
  const { journal, events } = await receipts(t);
  await assert.rejects(execute(plan, fakeTransport(plan, changed), journal), { code: 'STALE_PLAN' });
  assert.deepEqual(await events(), []);
  const changedSource = structuredClone(snapshot);
  changedSource.data.workingRevision.sourceTextEN += ' Changed.';
  changedSource.data.localizedContents[0].text = changedSource.data.workingRevision.sourceTextEN;
  const transport = fakeTransport(plan, changedSource);
  await assert.rejects(execute(plan, transport, journal), { code: 'STALE_PLAN' });
  assert.equal(posts(transport).length, 0);
});

test('corrupt English source, duplicate locale, in_review/deleted POI or invalid version cannot create a plan', () => {
  for (const mutate of [s => { s.data.localizedContents[0].text = 'different'; },
    s => { s.data.localizedContents.push(s.data.localizedContents[0]); },
    s => { s.data.workingRevision.status = 'in_review'; }, s => { s.data.poi.deletedAt = '2026-10-26T00:00:00.000Z'; },
    s => { s.data.workingRevision.editVersion = 1.5; }]) {
    const snapshot = makeSnapshot(); mutate(snapshot); assert.throws(() => prepare(snapshot), { code: 'INVALID_SNAPSHOT' });
  }
});

test('edited hash or a rehashed forged endpoint/body cannot reach mutation', async t => {
  const snapshot = makeSnapshot(), plan = prepare(snapshot), { journal } = await receipts(t);
  const edited = structuredClone(plan); edited.selection.locale = 'vi';
  await assert.rejects(execute(edited, fakeTransport(plan, snapshot), journal), { code: 'PLAN_TAMPERED' });
  for (const mutate of [p => { p.request.path = '/api/v1/admin/jobs/run-next'; p.request.bodyText = '{}'; },
    p => { p.request.bodyText = JSON.stringify({ expectedEditVersion: 4, languages: ['vi'] }); }]) {
    const forged = structuredClone(plan); mutate(forged);
    const digest = value => createHash('sha256').update(canonical(value)).digest('hex');
    const { planHash, scopeHash, ...core } = forged;
    forged.scopeHash = digest({ ...core, request: { method: core.request.method, path: core.request.path, bodyText: core.request.bodyText } });
    forged.planHash = digest({ ...core, scopeHash: forged.scopeHash });
    const transport = fakeTransport(plan, snapshot), separate = await receipts(t);
    await assert.rejects(execute(forged, transport, separate.journal), { code: 'PLAN_REQUEST_MISMATCH' });
    assert.equal(posts(transport).length, 0);
  }
});

test('lost mutation response is recorded unknown, errors redacted, restart cannot resend even with a new key', async t => {
  const snapshot = makeSnapshot(), plan = prepare(snapshot), { journal, directory, events } = await receipts(t);
  const transport = fakeTransport(plan, snapshot, { postError: true });
  await assert.rejects(execute(plan, transport, journal), error => {
    assert.equal(error.code, 'OUTCOME_UNKNOWN_NO_RESEND'); assert.doesNotMatch(JSON.stringify(error), /synthetic-private/); return true;
  });
  assert.equal((await events()).at(-1).state, 'outcome_unknown');
  const changedKey = prepare(snapshot, { key: ids.secondKey });
  assert.equal(changedKey.scopeHash, plan.scopeHash); assert.notEqual(changedKey.planHash, plan.planHash);
  const second = fakeTransport(changedKey, snapshot);
  await assert.rejects(execute(changedKey, second, new ReceiptJournal(directory)), { code: 'RECEIPT_ALREADY_EXISTS_NO_RESEND' });
  assert.equal(posts(second).length, 0);
  const stored = JSON.stringify(await events());
  assert.doesNotMatch(stored, /synthetic-private|sourceTextEN|Authorization|inputSnapshot|Synthetic source/);
});

test('concurrent runners/different keys have one file reservation winner and at most one mutation', async t => {
  const snapshot = makeSnapshot(), planA = prepare(snapshot), planB = prepare(snapshot, { key: ids.secondKey }), { directory } = await receipts(t);
  const a = fakeTransport(planA, snapshot), b = fakeTransport(planB, snapshot);
  const results = await Promise.allSettled([execute(planA, a, new ReceiptJournal(directory)), execute(planB, b, new ReceiptJournal(directory))]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(posts(a).length + posts(b).length, 1);
  assert.equal(results.find(result => result.status === 'rejected').reason.code, 'RECEIPT_ALREADY_EXISTS_NO_RESEND');
});

test('failed journal reservation or write-ahead persistence prevents POST and sanitizes errors', async () => {
  const snapshot = makeSnapshot(), plan = prepare(snapshot);
  for (const journal of [{ reserve: async () => { throw new Error('synthetic-private'); } },
    { reserve: async () => ({ append: async () => { throw new Error('synthetic-private'); }, close: async () => {} }) }]) {
    const transport = fakeTransport(plan, snapshot);
    await assert.rejects(execute(plan, transport, journal), error => {
      assert.ok(['RECEIPT_UNAVAILABLE', 'RECEIPT_PERSISTENCE_FAILED'].includes(error.code));
      assert.doesNotMatch(JSON.stringify(error), /synthetic-private/); return true;
    });
    assert.equal(posts(transport).length, 0);
  }
});

test('bounded POST timeout aborts transport, persists unknown and does not issue a second mutation', async t => {
  const snapshot = makeSnapshot(), plan = prepare(snapshot), { journal, events } = await receipts(t);
  const base = fakeTransport(plan, snapshot);
  let mutationCount = 0, aborted = false;
  const transport = { origin: fixtureOrigin, request(request) {
    if (request.method === 'POST') {
      mutationCount++;
      request.signal.addEventListener('abort', () => { aborted = true; });
      return new Promise(() => {});
    }
    return base.request(request);
  } };
  await assert.rejects(runOnce(plan, { transport, journal, timeoutMs: 10 }), { code: 'OUTCOME_UNKNOWN_NO_RESEND' });
  assert.equal(mutationCount, 1); assert.equal(aborted, true);
  assert.equal((await events()).at(-1).state, 'outcome_unknown');
});

test('private receipt path under the repository is refused; transport origin and preflight failures block mutation', async () => {
  await assert.rejects(assertPrivatePath(join(repositoryRoot, 'private-receipt.json')), { code: 'PRIVATE_PATH_REQUIRED' });
  await assert.rejects(assertPrivatePath(join(repositoryRoot, '..private', 'receipt.json')), { code: 'PRIVATE_PATH_REQUIRED' });
  const snapshot = makeSnapshot(), plan = prepare(snapshot), transport = fakeTransport(plan, snapshot);
  transport.origin = 'https://wrong.example.invalid';
  await assert.rejects(execute(plan, transport), { code: 'TRANSPORT_TARGET_MISMATCH' });
  const failing = fakeTransport(plan, snapshot, { preflightError: true });
  await assert.rejects(execute(plan, failing), { code: 'READBACK_UNAVAILABLE' });
  assert.equal(posts(failing).length, 0);
});

test('private paths also reject a different Git checkout/worktree, not just this repository', async t => {
  const { directory } = await receipts(t);
  const other = join(directory, 'different-checkout');
  await mkdir(other);
  await writeFile(join(other, '.git'), 'synthetic worktree marker');
  await assert.rejects(assertPrivatePath(join(other, 'private.json')), { code: 'PRIVATE_PATH_REQUIRED' });
});

function localPlan(snapshot = makeSnapshot()) {
  const queued = prepare(snapshot, { locale: 'en' });
  const job = makeJob(queued);
  return prepare(snapshot, { locale: 'en', operation: 'worker_claim', workerId: 'fixture-worker', job });
}

test('one local audio claim is bound to locale, job, model, text hash and input versions', async t => {
  const snapshot = makeSnapshot(), plan = localPlan(snapshot), { journal, events } = await receipts(t), transport = fakeTransport(plan, snapshot);
  assert.deepEqual(JSON.parse(plan.request.bodyText), { workerId: 'fixture-worker', capabilities: ['en'] });
  assert.equal((await execute(plan, transport, journal)).state, 'verified');
  assert.equal(posts(transport).length, 1); assert.equal((await events()).at(-1).state, 'verified');
});

test('claim of another job/locale/model/text/version, expired lease or attempt mismatch stops without synthesis/result/upload', async t => {
  const snapshot = makeSnapshot(), plan = localPlan(snapshot);
  for (const mutate of [j => { j.id = ids.otherJob; }, j => { j.languageCode = 'vi'; },
    j => { j.inputSnapshot.modelId = 'unapproved'; }, j => { j.inputSnapshot.text = 'different'; },
    j => { j.inputVersion.sourceVersion = 2; }, j => { j.attemptId = 'invalid'; },
    j => { j.leaseExpiresAt = new Date(fixtureNow).toISOString(); }, j => { j.retryCount++; }]) {
    const claim = makeClaim(plan, snapshot); mutate(claim);
    const transport = fakeTransport(plan, snapshot, { claim }), { journal, events } = await receipts(t);
    await assert.rejects(execute(plan, transport, journal), { code: 'READBACK_MISMATCH' });
    assert.equal(posts(transport).length, 1);
    assert.ok(transport.calls.every(call => !/result|media-intents|run-next/.test(call.path)));
    assert.equal((await events()).at(-1).state, 'readback_mismatch');
  }
});

test('null local claim is journaled without looping; server-adapter claim and running/retry drift are refused', async t => {
  const snapshot = makeSnapshot(), plan = localPlan(snapshot), transport = fakeTransport(plan, snapshot, { claim: null }), { journal } = await receipts(t);
  assert.equal((await execute(plan, transport, journal)).state, 'no_job'); assert.equal(posts(transport).length, 1);
  assert.throws(() => prepare(snapshot, { operation: 'worker_claim', workerId: 'fixture-worker' }), { code: 'LOCAL_AUDIO_ONLY' });
  const queued = prepare(snapshot, { locale: 'en' }), job = makeJob(queued); job.data.status = 'running';
  assert.throws(() => prepare(snapshot, { locale: 'en', operation: 'worker_claim', workerId: 'fixture-worker', job }), { code: 'JOB_SELECTION_MISMATCH' });
});
