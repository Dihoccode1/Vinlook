# TU03 proposed live inventory and batch plan

Refs #73 and #81. Prepared 26 October 2026 (UTC+7). **Proposed, not authorized for
live execution.** PR85 is merged and Duy closed #73; those events do not establish
current database contents, provider quota, media rights or 240 accepted pairs.
This follow-up supplies a gap register and an actionable approval template.

## What is ready and what still needs engineering

The merged code provides offline inventory/planning, guarded single-operation
orchestration with private durable receipts and a read-only GET library. The CLI
stays offline. No live login, mutating HTTP adapter, synthesis/upload/result bridge
or selected server-job dispatch exists in this tooling. Adding those pieces is
separate scoped work with tests; approval of this document cannot make them exist.

The [generated gap register](readiness.md) contains every POI/locale, repository
source statements and task ceilings. Regenerate with
`node scripts/poc/content/readiness.mjs`; verify with the same command plus
`--check`. It reads public repository metadata only. No live credentials or IDs
belong in that report or its tests.

## Stage 1 — private read-only inventory

Owner: Tú/operator. Before accessing a real environment, Duy identifies its exact
HTTPS Content/Identity origins, authorized account role and time window privately.
Do not reuse a static ID, old login or sourceVersion from a task journal. Existing
GET authorization is enforced by the backend; do not open a work session merely
for a read. Login is outside the read-only adapter and must follow the existing
private operational process; no secret is supplied to chat/issue/CLI arguments.

1. The operator establishes an unambiguous private mapping for all 15 editorial
   POI references using name/source/identity evidence. Missing or ambiguous mapping
   stops that POI; do not create records to make the inventory fit.
2. One GET per mapped POI: at most 15 successful read attempts in this proposed
   pass. Record working/published revision IDs, status, source/edit versions and
   source hash privately. If either revision cannot be read consistently, stop.
3. Inspect at most two relevant revision job lists per POI (working and published,
   deduplicated): at most 30 GET attempts. Total proposed Content GET ceiling is
   **45**, excluding login and the mapping/discovery process. Mapping/discovery
   needs its own explicit scope if it requires additional requests. There is no
   automatic retry/poll; a failed/oversized list requires a separate decision.
4. Reconcile text/source/audio versions, locale/model/registry, duration and human
   approval for all 240 pairs. Compute/check actual audio hashes only in a
   separately approved media-read pass; JSON metadata cannot prove media bytes.
   A URL, approved flag or old journal hash alone is insufficient.
5. Keep raw responses, JWTs, real IDs, origin mapping and reconciliation receipts
   outside every Git checkout. A public handoff contains aggregate counts and
   editorial references only. Do not commit operator evidence or raw error bodies.

These separate GETs are not an atomic database snapshot. Record observation times
privately, and re-read the exact current versions immediately before any later
approved operation through the runner's preflight. A planning read is not a lock.

45 is a proposed ceiling, not permission or a guarantee of provider isolation:
GET does not call synthesis here, but existing workers elsewhere must be inspected
separately. Stop on 401/403, unexpected identity/schema/version, redirect, timeout,
429/503, list overflow or uncertain state. Do not substitute zero/absent values.
Preserve the three historical POI001 en/vi/zh-Hant outputs pending this readback;
never reset review/counters or regenerate them to refresh evidence.

## Stage 2 — source, media and reviewer admission

Tú prepares a private evidence manifest; humans make the acceptance decisions.
POI006–015 still have pending source-review statements in repository documents.
All 15 thumbnail licenses/provenance need evidence; geography ODbL attribution
does not license photographs. All 15 proposed arrival references need a recorded
review disposition under the approved exterior-arrival semantics. Fieldwork stays
waived, not relabelled performed. Unknown rights or source approval blocks that POI.

Assign a competent text reviewer and full-listening reviewer for every exact locale
from hybrid-v1; record language, scope, reviewer, time, versions and disposition.
AI checks may assist but cannot supply a human approval. Current text/audio which
only lacks human review goes to review, not Process. Editing text can invalidate
audio; follow the backend source/text/version gates and keep provenance explicit.

## Stage 3 — one selected pilot, then separately approved increments

Select **one** genuinely missing/stale pair after Stage 1; do not preselect a locale
from historical counts. Bind one POI, revision, locale, task and expected versions
to one reviewed private plan. Preserve already-current output. There is no batch
loop or provider request approved by this proposal.

- Before even queueing, record all eligible jobs and active server/local workers,
  leases, retry/reclaim counts and automated processors. Translation success can
  enqueue audio automatically (`services/content/src/jobs/service.js`); one queue
  request is not a one-provider-call budget. An operator must account for that
  downstream work and cannot assume a selected revision is globally isolated.
- Server-adapter path remains blocked in the selected-job runner: existing run-next
  globally claims then starts provider execution. Duy must choose a separately
  scoped Content-owned atomic job/locale/version admission change, or an explicitly
  bounded global manual operation outside this runner. No selector is invented.
- Local-worker path needs a reviewed single-job execution/upload/result bridge.
  The existing MMS worker performs its own claim and cannot simply follow the
  runner's claim. A wrong claim may already hold a lease: stop and retain evidence;
  do not auto-release, reclaim or synthesize another job.
- Specify independent ceilings for queue/claim HTTP requests, translation provider
  attempts, server-TTS attempts, local inference attempts, model/metadata reads,
  upload/media-intent/probe/reconcile requests, wall time and concurrency. Default
  pilot concurrency proposal is one; no ceiling is inferred from task counts.
- Verify current quota and model/profile availability privately before approval.
  A failed call may consume quota. No paid fallback, silent model substitution,
  duration cropping/speed-up or automatic retry is allowed. Retain declared
  model/license/attribution restrictions; this plan grants no additional rights.
- After one operation, reconcile the durable receipt, exact job/attempt/versions,
  output hash/model and 90–150s duration. Unknown outcome, stale input, mismatch,
  quota limit or evidence-write failure stops the run; never resend using a new key.

Only a successful pilot with human review can justify a **new** exact increment
decision. It does not authorize the other 239 pairs, review approval, submit or
publish. Backup/restore and any compensating change require an evidenced existing
operational procedure; do not delete live output or reset counters as rollback.

## Approval record — incomplete fields block execution

Keep real identifiers and credentials in the private operator record. Publish only
a safe summary and the decision reference. This table is a template, not a runnable
configuration or a claimed approval.

| Required field | Current disposition |
| --- | --- |
| Duy decision reference, approver and expiry/window | unset |
| Exact private environment/origins/account authority | unset |
| Mapped POI/revision/job/locale and evidence/version hashes | unset |
| Exact action list, available reviewed transport/worker release SHA | unset |
| Worker inventory, eligible global jobs, leases and queue side effects | unset |
| Quota evidence and each independent attempt/request ceiling | unset |
| Private receipt location, operator and stop/reconciliation procedure | unset |
| Backup/restore procedure and acceptable recovery action | unset |
| Source/media/model rights and reviewer assignments | unset |
| Explicit authorization for submit/publish | separate later decision |

## Effort and sequencing

Pipeline effort is gated work, not the arithmetic 225 translations + 240 audio
tasks: Stage 1 has at most 45 proposed Content reads after mapping; Stage 3 needs
the missing reviewed execution bridges and one measured pilot before estimating
throughput. Provider latency, free quota, local inference speed, worker state and
actual missing/stale counts are unknown. Therefore a batch wall-clock estimate is
**not yet supportable**; use observed pilot timings and approved ceilings to plan
each increment. Do not promise a two-day batch from repository counts.

For scheduling only, a provisional engineering allowance is 1–2 developer-days
for private reconciliation/output handling, a reviewed single-operation transport
and its loopback tests, followed by 1–3 developer-days for a local execution/media
bridge and integration failure tests. These are judgment estimates assuming existing
API/worker contracts hold, not measured throughput or a delivery commitment.
Content-owned targeted dispatch, new contract decisions, rights research, access
setup, provider waiting and human review are excluded and remain unestimated.
Re-estimate after the admission choice and one instrumented pilot; do not add these
ranges to the audio task count to invent a batch finish time.

Human review is a separate resource: one full pass through 240 clips at 90–150s
requires **6–10 reviewer-hours of listening alone**, before text/source checks,
corrections, replay and handoffs. Parallel reviewers can reduce elapsed time only
when the required language skills and assignments exist. Three historical approvals
do not justify subtracting work until fresh evidence is reconciled.

Final acceptance needs the 240 matching, current, rights-cleared and human-reviewed
pairs plus deployed 16-locale listening evidence and Duy's explicit publication
decision. This follow-up performs none of those live actions.
