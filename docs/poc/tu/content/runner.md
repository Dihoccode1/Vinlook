# TU03 content tooling — offline CLI and guarded orchestration

Refs #73. This independently reviewable slice prepares repository metadata and
queue/claim safeguards. It does not generate the missing240pairs or establish live
acceptance. No Content/Identity runtime, schemas, contracts, dependencies, shared
workflow or Hạo source is changed. Duy reviews/merges into codex/poc-demo.

## Inventory and provenance

```text
node scripts/poc/content/cli.mjs inventory
node scripts/poc/content/cli.mjs inventory --check
```

Produces/checks `data/poc/content-inventory.json` and [inventory.md](inventory.md).
Exactly15 editorial POI references ×16 exact hybrid-v1 locales; source narration,
document/review hashes and profile IDs derive from existing repository files. The
first-five narration hashes match the previous TASK025 batch metadata. CRLF is
normalized for document hashing/reproducibility; narration paragraphs are trimmed
without rewriting words. No source prose, translations or media are regenerated.

The three historically reported approved POI001 locales en/vi/zh-Hant and reported
sourceVersion1 remain a **report**, not a fresh DB assertion. All240rows have
liveVerification=not_checked, no invented database IDs/textVersions/audio hashes.
POI006–015 source docs exist but their recorded human-review statements remain
pending; merged GitHub documents are not silently relabelled accepted. Thumbnail
rights/provenance are unresolved for all15; no image is scraped/licensed by this
inventory. Arrival coordinates stay existing desktop proposals, fieldwork waived
not performed. Source review files retain their institution links/access limits;
no source page was freshly fetched as part of this offline tooling.

## Dry-run plan from a private readback

CLI exposes only `inventory`, `plan` and `--help`. It has no execute/login/network,
provider/TTS/worker/upload/retry/submit/publish command and never reads env secrets.
Use the pinned Node24.18.1/npm11.16.0. JSON readbacks/plan output/receipts must live
outside **every Git checkout**; output uses exclusive create, never overwrite.

An operator may later supply a privately obtained, explicitly authorized JSON
envelope from GET Content `/api/v1/admin/pois/:id`. No real readback is obtained here.
Example arguments use placeholders, never real IDs/credentials:

```text
node scripts/poc/content/cli.mjs plan --snapshot PRIVATE_JSON --content-origin HTTPS_CONTENT_ORIGIN --poi-ref POI-001 --locale zh-Hant --operation queue --out PRIVATE_NEW_PLAN_JSON
```

For an existing queued local audio job, additionally supply a private GET
`/api/v1/admin/jobs/:id` envelope via `--job PRIVATE_JSON`, `--worker-id WORKER_ID`
and `--operation worker_claim`. No key/token argument exists. The planner derives
actual POI/revision IDs and all versions/hashes from the explicit readback, not the
old task journal. `poiRef` is an editorial label, not a verified mapping to a DB ID;
the operator must verify name/source/identity and reviewed source hash before any
later live plan is approved. Planning does not certify source acceptance or media
rights, and proposed output is not human approval.

One locale variable determines model/execution, queue `languages:[locale]`, worker
`capabilities:[locale]` and readback expectations. There is no separate launcher
locale/body-locale field to drift from zh-Hant to vi. Strict IDs/versions/scheme,
English/source consistency, duplicate locale checks, source/text SHA256, draft and
nondeleted guards apply. Existing structurally current text/audio is skipped even
when human review is pending; approved current en/vi/zh-Hant are never regenerated
or marked pending/reset by this tool. Pending human quality needs review, not Process.

## Guarded library boundary

`preparePlan`, `runOnce` and `ReceiptJournal` are real reusable orchestration code.
This slice tests runOnce with injected synthetic transports. A separate
[read-only HTTP adapter](read-only-http.md) now implements the three existing GET
routes with bounded JSON/deadlines, exact origin, no redirects/retries and native
AbortSignal. It cannot perform runOnce's POSTs; no mutating HTTP/login adapter or
execute CLI is shipped. Hashes are integrity/binding checks, not signatures proving
Duy consent. Do not use a mutating network adapter without an exact approved target/mutation/
quota/worker-state plan. Even queueing can cause active processors to pick up work.

Before its one permitted POST, runOnce obtains fresh admin readback (and selected
job for local claim), rejects changed draft/source/text/model/input/retry versions,
and reconstructs the exact request. Rehashing a changed path/body does not permit
a different endpoint/locale. Each transport request has at most15s; timeout aborts
and returns a safe fixed error, with no second mutation attempt.

- `queue`: POST `/api/v1/admin/revisions/:revisionId/process` with exactly one locale
  and expectedEditVersion/UUID Idempotency-Key. Requires202, one returned jobId,
  matching POI/revision, then GET job verifies ID/locale/task/input versions/status.
  It does not retry existing failed work or bypass backend authority/version checks.
- `worker_claim`: one POST `/api/v1/internal/jobs/claim` for one local-audio capability;
  compares response to a preselected queued jobId/locale/model/text hash/input/
  retryCount/attempt/live lease. Null job terminates without a loop. Different job
  or locale stops immediately; there is no synthesis, result or upload callback.
  A mismatched claim can already hold a lease: retain evidence and ask the operator
  to inspect; do not auto-release/reclaim/dispatch another job. Existing MMS worker
  is not invoked and cannot be chained blindly (it would perform its own claim).

No audio inference/generation/dispatch/retry/review/publication is implemented or
performed in this slice. Verified means the orchestration response matched the
plan, not that text/audio was generated or approved.

## Receipts and failure recovery

Receipt path uses a target scope hash **excluding Idempotency-Key**. `open(wx)`
gives a single reservation winner even for concurrent runners or changed keys.
`reserved` and `mutation_started` are fsynced before POST; subsequent states are
response_received, verified, no_job, readback_mismatch or outcome_unknown. A
response_received event means transport returned, not that a successful mutation
has been proven. Entries carry hashes/state/locale/time only, no token/text/provider
body/raw error. Requested0700directory/0600file modes are subject to platform ACLs;
operator controls the private parent directory. File fsync is used, not a claim
of power-loss guarantees on every filesystem or an atomic transaction with HTTP.

Every existing reservation prevents resending that scope, including completed,
unknown, empty-claim and crash-before-POST cases. Restart does not delete a lock,
retry POST, change the key, regenerate audio or reset counters. If persistence or
close fails, stop safely. Manual authenticated read-only reconciliation and a
separate new decision are required; no automated cleanup/resume is provided.

## Existing global dispatch limitation — Duy decision needed

`services/content/src/adapters/router.js` accepts only `{}` at
POST `/api/v1/admin/jobs/run-next`; `adapters/runner.js` claims across all eligible
server_adapter locales then starts provider work before the response is returned.
It has no target job/locale selector. Queue readback of one revision cannot prove
the absence of other eligible work across the entire service. Therefore this tool
rejects `operation=dispatch` with TARGETED_DISPATCH_UNSUPPORTED before any call.
It never invents `/run-next/zh-Hant` or sends unrecognized selector fields.

For future live server-adapter orchestration, Duy can choose A: commission a separate
Content-owned PR with atomic expected-job/locale/version admission before provider
dispatch; or B: retain the global manual dispatch operation outside this selected-job
runner under an explicitly bounded environment plan. No new backend contract is
implemented/approved here. This limitation is independent of Usage contract PR83.

## Validation and unfinished work

```text
node --test scripts/poc/content/test/cli.test.mjs scripts/poc/content/test/inventory.test.mjs scripts/poc/content/test/runner.test.mjs scripts/poc/content/test/read-only-http.test.mjs
node scripts/poc/content/cli.mjs inventory --check
```

See [verification.md](verification.md) for executed results. Full #73 still needs
private live inventory/POI mapping, source/human language review, licensed thumbnails,
arrival decisions, live read verification and reviewed mutation/worker integration, exact quota/call
approval,240real matching pairs and separate submit/publish authorization. Keep
#73 open; do not interpret this code/test PR as live batch acceptance.
